import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSquarePayment, isSquareConfigured } from "@/lib/square";

export const runtime = "nodejs";

type Body = {
  orderNumber?: string;
  accessToken?: string;
  sourceId?: string;
  idempotencyKey?: string;
  verificationToken?: string;
};

export async function POST(request: Request) {
  if (!isSquareConfigured()) {
    return NextResponse.json(
      { error: "Card payments are not available yet." },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const orderNumber = body.orderNumber?.trim() ?? "";
  const accessToken = body.accessToken?.trim() ?? "";
  const sourceId = body.sourceId?.trim() ?? "";
  const idempotencyKey = body.idempotencyKey?.trim() ?? "";

  if (!orderNumber || !accessToken) {
    return NextResponse.json(
      { error: "Missing order information." },
      { status: 400 },
    );
  }
  if (!sourceId || !idempotencyKey) {
    return NextResponse.json(
      { error: "Missing payment token. Please try again." },
      { status: 400 },
    );
  }

  const order = await prisma.order.findFirst({
    where: { orderNumber, accessToken },
  });
  if (!order) {
    return NextResponse.json(
      { error: "Order not found or this link is invalid." },
      { status: 404 },
    );
  }

  if (order.paymentMethod !== "square") {
    return NextResponse.json(
      { error: "This order is not set up for card / Apple Pay." },
      { status: 400 },
    );
  }

  if (order.paymentStatus === "paid") {
    return NextResponse.json({
      ok: true,
      alreadyPaid: true,
      paymentId: order.squarePaymentId,
    });
  }

  if (order.status === "cancelled") {
    return NextResponse.json(
      { error: "This order was cancelled." },
      { status: 400 },
    );
  }

  if (order.totalCents < 1) {
    return NextResponse.json(
      { error: "Nothing to charge on this order." },
      { status: 400 },
    );
  }

  const result = await createSquarePayment({
    sourceId,
    amountCents: order.totalCents,
    orderNumber: order.orderNumber,
    idempotencyKey,
    verificationToken: body.verificationToken?.trim() || undefined,
    buyerEmail: order.email || undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "paid",
      squarePaymentId: result.payment.id ?? order.squarePaymentId,
    },
  });

  return NextResponse.json({
    ok: true,
    paymentId: result.payment.id,
  });
}
