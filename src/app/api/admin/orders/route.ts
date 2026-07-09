import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const where =
    status && status !== "all"
      ? { status }
      : status === "all"
        ? {}
        : { status: { notIn: ["completed", "cancelled"] } };

  const orders = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy: [{ preferredDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ orders });
}
