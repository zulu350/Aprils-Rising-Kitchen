import { NextResponse } from "next/server";
import {
  buildDateSlots,
  cartHasSourdough,
  publicAvailabilityCopy,
} from "@/lib/availability";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/availability?items=id1,id2
 * Returns allowed fulfillment dates for the cart + capacity.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const itemsParam = searchParams.get("items") ?? "";
  const itemIds = itemsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const hasSourdough = cartHasSourdough(itemIds);
  const copy = publicAvailabilityCopy(hasSourdough);

  // Capacity for next ~5 weeks of dates
  const since = new Date();
  since.setDate(since.getDate() - 1);
  const until = new Date();
  until.setDate(until.getDate() + 35);

  const sinceIso = since.toISOString().slice(0, 10);
  const untilIso = until.toISOString().slice(0, 10);

  let countsByDate: Record<string, number> = {};
  try {
    const rows = await prisma.order.findMany({
      where: {
        preferredDate: { gte: sinceIso, lte: untilIso },
        status: { not: "cancelled" },
      },
      select: { preferredDate: true },
    });
    for (const row of rows) {
      countsByDate[row.preferredDate] =
        (countsByDate[row.preferredDate] ?? 0) + 1;
    }
  } catch (err) {
    console.error("Availability capacity query failed:", err);
    // Fail open on capacity only if DB down — schedule rules still apply
    countsByDate = {};
  }

  const slots = buildDateSlots(itemIds, countsByDate);
  const available = slots.filter((s) => s.available);

  return NextResponse.json({
    hasSourdough,
    messaging: copy,
    dates: slots,
    availableDates: available.map((s) => s.date),
    maxOrdersPerDay: 4,
  });
}
