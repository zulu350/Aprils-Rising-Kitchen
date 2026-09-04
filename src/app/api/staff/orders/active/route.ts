import { STATUS_LABELS, isOrderStatus } from "@/lib/admin-orders";
import { prisma } from "@/lib/db";
import {
  isStaffAuthorized,
  staffUnauthorizedResponse,
} from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function staffPhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed || trimmed === "—") return null;
  return trimmed;
}

export async function GET(request: Request) {
  if (!isStaffAuthorized(request)) {
    return staffUnauthorizedResponse();
  }

  const generatedAt = new Date().toISOString();

  try {
    const rows = await prisma.order.findMany({
      where: { status: { notIn: ["completed", "cancelled"] } },
      include: {
        items: { select: { quantity: true, name: true } },
      },
      orderBy: [{ preferredDate: "asc" }, { createdAt: "desc" }],
    });

    const orders = rows.map((order) => ({
      id: order.orderNumber,
      status: isOrderStatus(order.status)
        ? STATUS_LABELS[order.status]
        : order.status,
      payment: order.paymentStatus === "paid" ? "Paid" : "Unpaid",
      total: order.totalCents / 100,
      fulfillmentDate: order.preferredDate,
      fulfillmentType:
        order.fulfillment === "delivery" ? "delivery" : "pickup",
      customerName: order.customerName,
      customerPhone: staffPhone(order.phone),
      placedAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        quantity: item.quantity,
        name: item.name,
      })),
    }));

    return Response.json(
      { generatedAt, count: orders.length, orders },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("Staff active orders failed:", err);
    return Response.json(
      { error: "Could not load active orders.", generatedAt },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
