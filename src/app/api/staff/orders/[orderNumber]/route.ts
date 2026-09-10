import { prisma } from "@/lib/db";
import { quoteOrderTotals } from "@/lib/delivery";
import { resolveFulfillmentPatch } from "@/lib/fulfillment-update";
import { resolveAdminOrderLines } from "@/lib/orders";
import {
  parseStaffDate,
  parseStaffLine,
  parseStaffNotes,
  parseStaffPayment,
  parseStaffPaymentMethodPatch,
  parseStaffPhone,
  parseStaffStatus,
  toStaffOrderRow,
} from "@/lib/staff-orders";
import {
  isStaffAuthorized,
  staffUnauthorizedResponse,
} from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ orderNumber: string }> };

type PatchBody = {
  status?: unknown;
  payment?: unknown;
  paymentMethod?: unknown;
  fulfillmentDate?: unknown;
  fulfillmentType?: unknown;
  deliveryCity?: unknown;
  deliveryAddress?: unknown;
  customerPhone?: unknown;
  notes?: unknown;
  items?: unknown;
};

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function normalizeOrderNumber(raw: string): string {
  return decodeURIComponent(raw).trim().toUpperCase();
}

async function findByOrderNumber(orderNumber: string) {
  return prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: {
        select: {
          quantity: true,
          name: true,
          menuItemId: true,
          unitPriceCents: true,
          lineTotalCents: true,
        },
      },
    },
  });
}

/** Read one order so CoS can echo it before a write. */
export async function GET(request: Request, { params }: Params) {
  if (!isStaffAuthorized(request)) {
    return staffUnauthorizedResponse();
  }

  const { orderNumber: raw } = await params;
  const orderNumber = normalizeOrderNumber(raw);
  const generatedAt = new Date().toISOString();

  try {
    const order = await findByOrderNumber(orderNumber);
    if (!order) {
      return json({ error: "Order not found.", generatedAt }, 404);
    }
    return json({ generatedAt, order: toStaffOrderRow(order) });
  } catch (err) {
    console.error("Staff order GET failed:", err);
    return json({ error: "Could not load that order.", generatedAt }, 503);
  }
}

/**
 * Writes: status, Paid/Unpaid, paymentMethod, fulfillment date, pickup↔delivery
 * (recalculates delivery fee), phone, notes, full item replace (catalog or custom).
 * Unpaid does not clear paymentMethod. Pickup clears stored delivery address.
 * No customer email.
 */
export async function PATCH(request: Request, { params }: Params) {
  if (!isStaffAuthorized(request)) {
    return staffUnauthorizedResponse();
  }

  const { orderNumber: raw } = await params;
  const orderNumber = normalizeOrderNumber(raw);
  const generatedAt = new Date().toISOString();

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return json({ error: "Invalid JSON body.", generatedAt }, 400);
  }

  const data: Record<string, unknown> = {};

  if (body.status !== undefined) {
    const parsed = parseStaffStatus(body.status);
    if (!parsed.ok) return json({ error: parsed.error, generatedAt }, 400);
    data.status = parsed.value;
  }
  if (body.payment !== undefined) {
    const parsed = parseStaffPayment(body.payment);
    if (!parsed.ok) return json({ error: parsed.error, generatedAt }, 400);
    data.paymentStatus = parsed.value;
  }
  if (body.fulfillmentDate !== undefined) {
    const parsed = parseStaffDate(body.fulfillmentDate);
    if (!parsed.ok) return json({ error: parsed.error, generatedAt }, 400);
    data.preferredDate = parsed.value;
  }
  if (body.customerPhone !== undefined) {
    const parsed = parseStaffPhone(body.customerPhone);
    if (!parsed.ok) return json({ error: parsed.error, generatedAt }, 400);
    data.phone = parsed.value;
  }
  if (body.paymentMethod !== undefined) {
    const parsed = parseStaffPaymentMethodPatch(body.paymentMethod);
    if (!parsed.ok) return json({ error: parsed.error, generatedAt }, 400);
    data.paymentMethod = parsed.value;
    if (parsed.value !== "square") {
      data.squareWallet = null;
    }
  }
  if (body.notes !== undefined) {
    const parsed = parseStaffNotes(body.notes);
    if (!parsed.ok) return json({ error: parsed.error, generatedAt }, 400);
    data.notes = parsed.value;
  }

  try {
    const existing = await prisma.order.findUnique({
      where: { orderNumber },
      select: {
        id: true,
        fulfillment: true,
        deliveryCity: true,
        deliveryAddress: true,
        subtotalCents: true,
        adjustmentCents: true,
      },
    });
    if (!existing) {
      return json({ error: "Order not found.", generatedAt }, 404);
    }

    const fulfillment = resolveFulfillmentPatch(existing, {
      fulfillmentType: body.fulfillmentType,
      deliveryCity: body.deliveryCity,
      deliveryAddress: body.deliveryAddress,
    });
    if (!fulfillment.ok) {
      return json({ error: fulfillment.error, generatedAt }, 400);
    }
    if (fulfillment.changed) {
      data.fulfillment = fulfillment.value.fulfillment;
      data.deliveryCity = fulfillment.value.deliveryCity;
      data.deliveryAddress = fulfillment.value.deliveryAddress;
      data.deliveryFeeCents = fulfillment.value.deliveryFeeCents;
      data.totalCents = fulfillment.value.totalCents;
    }

    let itemLines: ReturnType<typeof resolveAdminOrderLines>["lines"] | null =
      null;
    if (body.items !== undefined) {
      if (!Array.isArray(body.items) || body.items.length === 0) {
        return json({ error: "Add at least one item.", generatedAt }, 400);
      }
      const parsedItems = [];
      for (const raw of body.items) {
        const parsed = parseStaffLine(raw);
        if (!parsed.ok) {
          return json({ error: parsed.error, generatedAt }, 400);
        }
        parsedItems.push(parsed.value);
      }
      const resolved = resolveAdminOrderLines(parsedItems);
      if (resolved.error) {
        return json({ error: resolved.error, generatedAt }, 400);
      }
      itemLines = resolved.lines;
      const nextFulfillment =
        (data.fulfillment as string | undefined) ?? existing.fulfillment;
      const subtotalCents = itemLines.reduce(
        (sum, line) => sum + line.lineTotalCents,
        0,
      );
      const quoted = quoteOrderTotals(
        nextFulfillment,
        subtotalCents,
        existing.adjustmentCents,
      );
      data.subtotalCents = subtotalCents;
      data.deliveryFeeCents = quoted.deliveryFeeCents;
      data.totalCents = quoted.totalCents;
    }

    if (Object.keys(data).length === 0 && !itemLines) {
      return json({ error: "Nothing to update.", generatedAt }, 400);
    }

    const itemSelect = {
      quantity: true,
      name: true,
      menuItemId: true,
      unitPriceCents: true,
      lineTotalCents: true,
    } as const;

    const order = itemLines
      ? await prisma.$transaction(async (tx) => {
          await tx.orderItem.deleteMany({ where: { orderId: existing.id } });
          await tx.orderItem.createMany({
            data: itemLines.map((line) => ({
              orderId: existing.id,
              menuItemId: line.menuItemId,
              name: line.name,
              unitLabel: line.unitLabel,
              quantity: line.quantity,
              unitPriceCents: line.unitPriceCents,
              lineTotalCents: line.lineTotalCents,
            })),
          });
          return tx.order.update({
            where: { orderNumber },
            data,
            include: { items: { select: itemSelect } },
          });
        })
      : await prisma.order.update({
          where: { orderNumber },
          data,
          include: { items: { select: itemSelect } },
        });

    return json({
      generatedAt: new Date().toISOString(),
      order: toStaffOrderRow(order),
    });
  } catch (err) {
    console.error("Staff order PATCH failed:", err);
    return json({ error: "Could not update that order.", generatedAt }, 503);
  }
}
