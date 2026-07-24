import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendNewOrderEmails } from "@/lib/email";
import { validateFulfillmentDate } from "@/lib/availability";
import {
  nextOrderNumber,
  validateCreateOrder,
  type CreateOrderInput,
} from "@/lib/orders";

export const runtime = "nodejs";

function newAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

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

  const { lines, subtotalCents, email, preferredDate } = result;
  const deliveryFeeCents = 0;
  const totalCents = subtotalCents + deliveryFeeCents;
  const itemIds = lines.map((l) => l.item.id);

  try {
    // Capacity + kitchen blackouts for this fulfillment day
    const [dayCount, blockedRow] = await Promise.all([
      prisma.order.count({
        where: {
          preferredDate,
          status: { not: "cancelled" },
        },
      }),
      prisma.blockedDay.findUnique({
        where: { date: preferredDate },
        select: { date: true },
      }),
    ]);
    const dateError = validateFulfillmentDate(
      preferredDate,
      itemIds,
      { [preferredDate]: dayCount },
      blockedRow ? [blockedRow.date] : [],
    );
    if (dateError) {
      return NextResponse.json({ error: dateError }, { status: 400 });
    }

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
        preferredDate,
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

    // MUST await on Netlify serverless — fire-and-forget often dies before SMTP finishes
    let emailStatus = { kitchen: false, customer: false as boolean };
    try {
      emailStatus = await sendNewOrderEmails({
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
      console.error("Order email notify error:", err);
    }

    return NextResponse.json({
      orderNumber: order.orderNumber,
      accessToken: order.accessToken,
      id: order.id,
      // Helps diagnose production without exposing SMTP secrets
      email: {
        kitchen: emailStatus.kitchen,
        customer: emailStatus.customer,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Create order failed:", message, err);
    // Unique violation on orderNumber (Postgres 23505) — rare race after fix
    const isUnique =
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002";
    return NextResponse.json(
      {
        error: isUnique
          ? "Order number conflict — please try once more."
          : "Could not save your order. Please try again or call us.",
      },
      { status: 500 },
    );
  }
}
