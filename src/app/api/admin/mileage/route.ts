import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { csvEscape, formatDestination } from "@/lib/mileage";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const search = new URL(request.url).searchParams;
  const from = search.get("from")?.trim() || "2026-01-01";
  const to = search.get("to")?.trim() || "2026-12-31";

  const rows = await prisma.order.findMany({
    where: {
      fulfillment: "delivery",
      deliveryMiles: { not: null },
      preferredDate: { gte: from, lte: to },
      status: { not: "cancelled" },
    },
    orderBy: [{ preferredDate: "asc" }, { updatedAt: "asc" }],
  });

  const header = [
    "date",
    "from",
    "destination",
    "purpose",
    "miles",
    "order",
  ];
  const lines = [header.join(",")];
  for (const row of rows) {
    const dest =
      formatDestination(row.deliveryAddress, row.deliveryCity) ?? "";
    lines.push(
      [
        csvEscape(row.preferredDate),
        csvEscape(row.milesFrom || "Home"),
        csvEscape(dest),
        csvEscape(`Bakery delivery ${row.orderNumber}`),
        row.deliveryMiles == null ? "" : String(row.deliveryMiles),
        csvEscape(row.orderNumber),
      ].join(","),
    );
  }

  const csv = `${lines.join("\n")}\n`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ark-mileage-${from}-to-${to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
