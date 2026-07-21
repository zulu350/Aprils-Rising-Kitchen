import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type Params = { params: Promise<{ orderNumber: string }> };

/**
 * Public order lookup — requires unguessable access token:
 *   GET /api/orders/ARK-1011?t=...
 * Order number alone is not enough (prevents sequential guessing).
 */
export async function GET(request: Request, { params }: Params) {
  const { orderNumber } = await params;
  if (!orderNumber) {
    return NextResponse.json({ error: "Missing order number." }, { status: 400 });
  }

  const token = new URL(request.url).searchParams.get("t")?.trim() ?? "";
  if (!token) {
    return NextResponse.json(
      {
        error:
          "This order link is incomplete. Please use the full link from your confirmation email or checkout page.",
      },
      { status: 401 },
    );
  }

  const order = await prisma.order.findFirst({
    where: { orderNumber, accessToken: token },
    include: { items: true },
  });

  // Same message whether missing or wrong token — don't leak which order numbers exist
  if (!order) {
    return NextResponse.json(
      {
        error:
          "Order not found, or this link is invalid. Use the full link from your email or checkout confirmation.",
      },
      { status: 404 },
    );
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
      order.paymentMethod === "venmo" || order.paymentMethod === "zelle"
        ? "Scan the QR below to pay, or use the handle shown. Cash also welcome at pickup/delivery."
        : order.paymentMethod === "cash"
          ? "Cash at pickup or delivery. Need Venmo or Zelle? Call or text us."
          : "You can pay anytime with Venmo, Zelle (scan the codes below), or cash at pickup/delivery.",
  });
}
