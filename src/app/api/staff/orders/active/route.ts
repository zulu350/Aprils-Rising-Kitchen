import { compareUpcomingFulfillment } from "@/lib/admin-orders";
import { nowInBoise, toISODate } from "@/lib/availability";
import { prisma } from "@/lib/db";
import { toStaffOrderRow } from "@/lib/staff-orders";
import {
  isStaffAuthorized,
  staffUnauthorizedResponse,
} from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const today = toISODate(nowInBoise());
    const orders = rows
      .slice()
      .sort((a, b) =>
        compareUpcomingFulfillment(a.preferredDate, b.preferredDate, today) ||
        b.createdAt.getTime() - a.createdAt.getTime(),
      )
      .map((order) => toStaffOrderRow(order));

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
