import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendNewOrderEmails } from "@/lib/email";
import { deliveryFeeCents as calcDeliveryFee } from "@/lib/delivery";
import {
  nextOrderNumber,
  validateAdminCreateOrder,
  type AdminCreateOrderInput,
} from "@/lib/orders";

export const runtime = "nodejs";

function newAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const where =
    status && status !== "all"
      ? { status }
      : status === "all"
        ? {}
        : { status: { notIn: ["completed", "cancelled"] } };

  const orders = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy: [{ preferredDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ orders });
}

/** Kitchen-created order (Facebook, walk-in, phone). Any fulfillment date allowed. */
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: AdminCreateOrderInput;
  try {
    body = (await request.json()) as AdminCreateOrderInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = validateAdminCreateOrder(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const {
    lines,
    subtotalCents,
    email,
    preferredDate,
    phone,
    paymentStatus,
  } = result;
  const deliveryFeeCents = calcDeliveryFee(body.fulfillment, subtotalCents);
  const totalCents = subtotalCents + deliveryFeeCents;

  try {
    const orderNumber = await nextOrderNumber(async () => {
      const rows = await prisma.order.findMany({
        select: { orderNumber: true },
      });
      return rows.map((r) => r.orderNumber);
    });
    const accessToken = newAccessToken();

    const order = await prisma.order.create({
      data: {
        orderNumber,
        accessToken,
        customerName: body.customerName.trim(),
        email,
        phone,
        fulfillment: body.fulfillment,
        deliveryCity:
          body.fulfillment === "delivery"
            ? body.deliveryCity?.trim() || null
            : null,
        deliveryAddress:
          body.fulfillment === "delivery"
            ? body.deliveryAddress?.trim() || null
            : null,
        preferredDate,
        preferredTimeWindow: body.preferredTimeWindow?.trim() || null,
        notes: body.notes?.trim() || null,
        status: "confirmed",
        paymentMethod: body.paymentMethod ?? "undecided",
        paymentStatus,
        subtotalCents,
        deliveryFeeCents,
        totalCents,
        items: {
          create: lines.map((line) => ({
            menuItemId: line.item.id,
            name: line.item.name,
            unitLabel: line.item.unitLabel,
            quantity: line.quantity,
            unitPriceCents: line.item.priceCents,
            lineTotalCents: line.lineTotalCents,
          })),
        },
      },
      include: { items: true },
    });

    try {
      await sendNewOrderEmails({
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
        paymentMethod: order.paymentMethod,
        subtotalCents: order.subtotalCents,
        deliveryFeeCents: order.deliveryFeeCents,
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
    } catch (err) {
      console.error("Admin create order email error:", err);
    }

    return NextResponse.json({
      id: order.id,
      orderNumber: order.orderNumber,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Admin create order failed:", message, err);
    return NextResponse.json(
      { error: "Could not save that order. Please try again." },
      { status: 500 },
    );
  }
}
