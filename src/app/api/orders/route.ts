import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendNewOrderEmails } from "@/lib/email";
import {
  nextOrderNumber,
  validateCreateOrder,
  type CreateOrderInput,
} from "@/lib/orders";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: CreateOrderInput;
  try {
    body = (await request.json()) as CreateOrderInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = validateCreateOrder(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { lines, subtotalCents, email } = result;
  const deliveryFeeCents = 0;
  const totalCents = subtotalCents + deliveryFeeCents;

  try {
    const orderNumber = await nextOrderNumber(() => prisma.order.count());

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName: body.customerName.trim(),
        email,
        phone: body.phone.trim(),
        fulfillment: body.fulfillment,
        deliveryCity:
          body.fulfillment === "delivery"
            ? body.deliveryCity?.trim() ?? null
            : null,
        deliveryAddress:
          body.fulfillment === "delivery"
            ? body.deliveryAddress?.trim() ?? null
            : null,
        preferredDate: body.preferredDate.trim(),
        preferredTimeWindow: body.preferredTimeWindow?.trim() || null,
        notes: body.notes?.trim() || null,
        status: "new",
        paymentMethod: body.paymentMethod ?? "undecided",
        paymentStatus: "unpaid",
        subtotalCents,
        deliveryFeeCents,
        totalCents,
        items: {
          create: lines.map((line) => ({
            menuItemId: line.item.id,
            name: line.item.name,
            unitLabel: line.item.unitLabel,
            unitPriceCents: line.item.priceCents,
            quantity: line.quantity,
            lineTotalCents: line.lineTotalCents,
          })),
        },
      },
      include: { items: true },
    });

    // Never block the customer if mail fails or is unconfigured
    void sendNewOrderEmails({
      id: order.id,
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
      paymentMethod: order.paymentMethod,
      subtotalCents: order.subtotalCents,
      totalCents: order.totalCents,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        name: item.name,
        unitLabel: item.unitLabel,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        lineTotalCents: item.lineTotalCents,
      })),
    }).catch((err) => {
      console.error("Order email notify error:", err);
    });

    return NextResponse.json({
      orderNumber: order.orderNumber,
      id: order.id,
    });
  } catch (err) {
    console.error("Create order failed:", err);
    return NextResponse.json(
      { error: "Could not save your order. Please try again or call us." },
      { status: 500 },
    );
  }
}
