import { NextResponse } from "next/server";
import {
  isOrderStatus,
  isPaymentStatus,
} from "@/lib/admin-orders";
import { isAdminAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendOrderUpdatedEmail } from "@/lib/email";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

type EditItemInput = {
  menuItemId?: string;
  name: string;
  unitLabel?: string;
  unitPriceCents: number;
  quantity: number;
};

type PatchBody = {
  status?: string;
  paymentStatus?: string;
  /** Full replace of line items when provided */
  items?: EditItemInput[];
  notes?: string | null;
  adminNote?: string | null;
  adjustmentCents?: number;
  adjustmentLabel?: string | null;
  /** If true and customer has email, send update email after save */
  notifyCustomer?: boolean;
};

function normalizeItems(items: EditItemInput[]) {
  const cleaned = [];
  for (const raw of items) {
    const name = String(raw.name ?? "").trim();
    const quantity = Math.floor(Number(raw.quantity));
    const unitPriceCents = Math.round(Number(raw.unitPriceCents));
    if (!name) {
      return { error: "Each line needs a name." as const };
    }
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) {
      return { error: `Invalid quantity for “${name}”.` as const };
    }
    if (!Number.isFinite(unitPriceCents)) {
      return { error: `Invalid price for “${name}”.` as const };
    }
    // Allow negative unit price for rare manual adjustments as line items;
    // prefer adjustmentCents for order-level adjustments.
    cleaned.push({
      menuItemId: String(raw.menuItemId ?? "custom").trim() || "custom",
      name,
      unitLabel: String(raw.unitLabel ?? "each").trim() || "each",
      unitPriceCents,
      quantity,
      lineTotalCents: unitPriceCents * quantity,
    });
  }
  if (cleaned.length === 0) {
    return { error: "Order must have at least one line item." as const };
  }
  return { items: cleaned };
}

export async function GET(_request: Request, { params }: Params) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({
    order: {
      ...order,
      pickupAddress:
        order.fulfillment === "pickup"
          ? process.env.PICKUP_ADDRESS?.trim() || null
          : null,
    },
  });
}

export async function PATCH(request: Request, { params }: Params) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  let contentEdit = false;

  if (body.status !== undefined) {
    if (!isOrderStatus(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = body.status;
  }
  if (body.paymentStatus !== undefined) {
    if (!isPaymentStatus(body.paymentStatus)) {
      return NextResponse.json(
        { error: "Invalid payment status" },
        { status: 400 },
      );
    }
    data.paymentStatus = body.paymentStatus;
  }

  if (body.notes !== undefined) {
    data.notes = body.notes?.trim() || null;
    contentEdit = true;
  }
  if (body.adminNote !== undefined) {
    data.adminNote = body.adminNote?.trim() || null;
    contentEdit = true;
  }
  if (body.adjustmentLabel !== undefined) {
    data.adjustmentLabel = body.adjustmentLabel?.trim() || null;
    contentEdit = true;
  }

  let adjustmentCents = existing.adjustmentCents;
  if (body.adjustmentCents !== undefined) {
    const adj = Math.round(Number(body.adjustmentCents));
    if (!Number.isFinite(adj) || Math.abs(adj) > 1_000_000) {
      return NextResponse.json(
        { error: "Invalid adjustment amount." },
        { status: 400 },
      );
    }
    adjustmentCents = adj;
    data.adjustmentCents = adj;
    contentEdit = true;
  }

  let normalizedItems: ReturnType<typeof normalizeItems> | null = null;
  if (body.items !== undefined) {
    if (!Array.isArray(body.items)) {
      return NextResponse.json({ error: "Items must be an array." }, { status: 400 });
    }
    normalizedItems = normalizeItems(body.items);
    if ("error" in normalizedItems) {
      return NextResponse.json({ error: normalizedItems.error }, { status: 400 });
    }
    contentEdit = true;
  }

  if (Object.keys(data).length === 0 && !normalizedItems) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  if (contentEdit) {
    data.adminEditedAt = new Date();
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      if (normalizedItems && "items" in normalizedItems) {
        const items = normalizedItems.items;
        await tx.orderItem.deleteMany({ where: { orderId: id } });
        await tx.orderItem.createMany({
          data: items.map((item) => ({
            orderId: id,
            menuItemId: item.menuItemId,
            name: item.name,
            unitLabel: item.unitLabel,
            unitPriceCents: item.unitPriceCents,
            quantity: item.quantity,
            lineTotalCents: item.lineTotalCents,
          })),
        });
        const subtotalCents = items.reduce((s, i) => s + i.lineTotalCents, 0);
        const deliveryFeeCents = existing.deliveryFeeCents;
        data.subtotalCents = subtotalCents;
        data.totalCents = subtotalCents + deliveryFeeCents + adjustmentCents;
      } else if (body.adjustmentCents !== undefined) {
        data.totalCents =
          existing.subtotalCents + existing.deliveryFeeCents + adjustmentCents;
      }

      return tx.order.update({
        where: { id },
        data,
        include: { items: true },
      });
    });

    let emailed = false;
    if (body.notifyCustomer && order.email) {
      try {
        const result = await sendOrderUpdatedEmail({
          id: order.id,
          orderNumber: order.orderNumber,
          accessToken: order.accessToken,
          customerName: order.customerName,
          email: order.email,
          phone: order.phone,
          fulfillment: order.fulfillment,
          deliveryCity: order.deliveryCity,
          deliveryAddress: order.deliveryAddress,
          preferredDate: order.preferredDate,
          preferredTimeWindow: order.preferredTimeWindow,
          notes: order.notes,
          adminNote: order.adminNote,
          paymentMethod: order.paymentMethod,
          subtotalCents: order.subtotalCents,
          adjustmentCents: order.adjustmentCents,
          adjustmentLabel: order.adjustmentLabel,
          totalCents: order.totalCents,
          createdAt: order.createdAt.toISOString(),
          items: order.items.map((item) => ({
            name: item.name,
            unitLabel: item.unitLabel,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            lineTotalCents: item.lineTotalCents,
          })),
        });
        emailed = result.sent;
      } catch (err) {
        console.error("Order update email error:", err);
      }
    }

    return NextResponse.json({
      order: {
        ...order,
        pickupAddress:
          order.fulfillment === "pickup"
            ? process.env.PICKUP_ADDRESS?.trim() || null
            : null,
      },
      emailed,
      emailSkipped:
        body.notifyCustomer && !order.email
          ? "No customer email on this order"
          : body.notifyCustomer && order.email && !emailed
            ? "Email could not be sent (check SMTP / logs)"
            : undefined,
    });
  } catch (err) {
    console.error("Admin order patch failed:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const order = await prisma.order.delete({
      where: { id },
    });
    return NextResponse.json({
      ok: true,
      orderNumber: order.orderNumber,
    });
  } catch {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
}
