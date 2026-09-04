import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { nextOrderNumber } from "@/lib/orders";
import {
  quoteStaffCreate,
  toStaffOrderRow,
  type StaffCreateBody,
} from "@/lib/staff-orders";
import {
  isStaffAuthorized,
  staffUnauthorizedResponse,
} from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function newAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Staff/manual create. No customer email. Status starts Confirmed,
 * matching kitchen New order. On TLS EOF after POST, GET Active
 * before creating again — do not POST twice.
 */
export async function POST(request: Request) {
  if (!isStaffAuthorized(request)) {
    return staffUnauthorizedResponse();
  }

  const generatedAt = new Date().toISOString();
  let body: StaffCreateBody;
  try {
    body = (await request.json()) as StaffCreateBody;
  } catch {
    return Response.json(
      { error: "Invalid JSON body.", generatedAt },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const quoted = quoteStaffCreate(body);
  if (!quoted.ok) {
    return Response.json(
      { error: quoted.error, generatedAt },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { input, quote } = { input: quoted.quote.input, quote: quoted.quote };

  try {
    const orderNumber = await nextOrderNumber(async () => {
      const rows = await prisma.order.findMany({
        select: { orderNumber: true },
      });
      return rows.map((r) => r.orderNumber);
    });

    const order = await prisma.order.create({
      data: {
        orderNumber,
        accessToken: newAccessToken(),
        customerName: input.customerName.trim(),
        email: "",
        phone: input.phone?.trim() || "—",
        fulfillment: input.fulfillment,
        deliveryCity:
          input.fulfillment === "delivery"
            ? input.deliveryCity?.trim() || null
            : null,
        deliveryAddress:
          input.fulfillment === "delivery"
            ? input.deliveryAddress?.trim() || null
            : null,
        preferredDate: input.preferredDate,
        preferredTimeWindow: input.preferredTimeWindow?.trim() || null,
        notes: input.notes?.trim() || null,
        status: "confirmed",
        paymentMethod: input.paymentMethod,
        paymentStatus: quote.preview.payment === "Paid" ? "paid" : "unpaid",
        subtotalCents: quote.subtotalCents,
        deliveryFeeCents: quote.deliveryFeeCents,
        totalCents: quote.totalCents,
        items: {
          create: quote.lines.map((line) => ({
            menuItemId: line.menuItemId,
            name: line.name,
            unitLabel: line.unit,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
            lineTotalCents: line.lineTotalCents,
          })),
        },
      },
      include: { items: { select: { quantity: true, name: true } } },
    });

    return Response.json(
      {
        generatedAt: new Date().toISOString(),
        order: toStaffOrderRow(order),
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("Staff create order failed:", err);
    return Response.json(
      { error: "Could not create that order.", generatedAt },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
