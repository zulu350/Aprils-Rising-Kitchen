import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type Params = { params: Promise<{ orderNumber: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { orderNumber } = await params;
  if (!orderNumber) {
    return NextResponse.json({ error: "Missing order number." }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const pickupAddress =
    order.fulfillment === "pickup"
      ? process.env.PICKUP_ADDRESS?.trim() || null
      : null;

  return NextResponse.json({
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    email: order.email,
    phone: order.phone,
    fulfillment: order.fulfillment,
    deliveryCity: order.deliveryCity,
    deliveryAddress: order.deliveryAddress,
    preferredDate: order.preferredDate,
    preferredTimeWindow: order.preferredTimeWindow,
    notes: order.notes,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    subtotalCents: order.subtotalCents,
    deliveryFeeCents: order.deliveryFeeCents,
    totalCents: order.totalCents,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      name: item.name,
      unitLabel: item.unitLabel,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
      lineTotalCents: item.lineTotalCents,
    })),
    pickupAddress,
    paymentNote:
      "Cash, Venmo, or Zelle — payment details when we contact you or on confirmation follow-up.",
  });
}
