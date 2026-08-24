import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { squareConfig, verifySquareWebhookSignature } from "@/lib/square";

export const runtime = "nodejs";

type SquareWebhook = {
  type?: string;
  data?: {
    object?: {
      payment?: {
        id?: string;
        status?: string;
        reference_id?: string;
      };
    };
  };
};

/**
 * Square Dashboard → Developer app → Webhooks:
 *   https://www.aprilsrisingkitchen.com/api/payments/square/webhook
 * Events: payment.created, payment.updated
 */
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-square-hmacsha256-header") ?? "";
  const { webhookSignatureKey } = squareConfig();

  if (webhookSignatureKey) {
    const site = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://www.aprilsrisingkitchen.com"
    ).replace(/\/$/, "");
    const ok = verifySquareWebhookSignature({
      signatureHeader: signature,
      notificationUrl: `${site}/api/payments/square/webhook`,
      body,
    });
    if (!ok) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: SquareWebhook;
  try {
    payload = JSON.parse(body) as SquareWebhook;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payment = payload.data?.object?.payment;
  const status = payment?.status ?? "";
  const paymentId = payment?.id;
  const orderNumber = payment?.reference_id?.trim();

  if (
    (status === "COMPLETED" || status === "APPROVED") &&
    (orderNumber || paymentId)
  ) {
    const order = orderNumber
      ? await prisma.order.findUnique({ where: { orderNumber } })
      : paymentId
        ? await prisma.order.findFirst({
            where: { squarePaymentId: paymentId },
          })
        : null;

    if (order && order.paymentStatus !== "paid") {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "paid",
          squarePaymentId: paymentId ?? order.squarePaymentId,
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
