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
 * Returns allowed fulfillment dates for the cart + capacity + kitchen blackouts.
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

  const since = new Date();
  since.setDate(since.getDate() - 1);
  const until = new Date();
  until.setDate(until.getDate() + 35);

  const sinceIso = since.toISOString().slice(0, 10);
  const untilIso = until.toISOString().slice(0, 10);

  let countsByDate: Record<string, number> = {};
  let blockedDates: string[] = [];

  try {
    const [rows, blocked] = await Promise.all([
      prisma.order.findMany({
        where: {
          preferredDate: { gte: sinceIso, lte: untilIso },
          status: { not: "cancelled" },
        },
        select: { preferredDate: true },
      }),
      prisma.blockedDay.findMany({
        where: { date: { gte: sinceIso, lte: untilIso } },
        select: { date: true },
      }),
    ]);
    for (const row of rows) {
      countsByDate[row.preferredDate] =
        (countsByDate[row.preferredDate] ?? 0) + 1;
    }
    blockedDates = blocked.map((b) => b.date);
  } catch (err) {
    console.error("Availability capacity/blocked query failed:", err);
    countsByDate = {};
    blockedDates = [];
  }

  const slots = buildDateSlots(itemIds, countsByDate, blockedDates);
  const available = slots.filter((s) => s.available);

  return NextResponse.json({
    hasSourdough,
    messaging: copy,
    dates: slots,
    availableDates: available.map((s) => s.date),
    maxOrdersPerDay: 4,
  });
}
