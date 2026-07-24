import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** GET — list blocked days (newest first, then by date). */
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blockedDays = await prisma.blockedDay.findMany({
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ blockedDays });
}

/** POST — block a date. Body: { date: "YYYY-MM-DD", note?: string } */
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { date?: string; note?: string | null };
  try {
    body = (await request.json()) as { date?: string; note?: string | null };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const date = body.date?.trim() ?? "";
  if (!DATE_RE.test(date)) {
    return NextResponse.json(
      { error: "Date must be YYYY-MM-DD." },
      { status: 400 },
    );
  }

  const note = body.note?.trim() || null;

  try {
    const blockedDay = await prisma.blockedDay.upsert({
      where: { date },
      create: { date, note },
      update: { note },
    });
    return NextResponse.json({ blockedDay });
  } catch (err) {
    console.error("Create blocked day failed:", err);
    return NextResponse.json(
      { error: "Could not block that day." },
      { status: 500 },
    );
  }
}

/** DELETE — unblock a date. Body: { date: "YYYY-MM-DD" } or ?date= */
export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  let date = searchParams.get("date")?.trim() ?? "";

  if (!date) {
    try {
      const body = (await request.json()) as { date?: string };
      date = body.date?.trim() ?? "";
    } catch {
      // ignore — use query only
    }
  }

  if (!DATE_RE.test(date)) {
    return NextResponse.json(
      { error: "Date must be YYYY-MM-DD." },
      { status: 400 },
    );
  }

  try {
    await prisma.blockedDay.deleteMany({ where: { date } });
    return NextResponse.json({ ok: true, date });
  } catch (err) {
    console.error("Delete blocked day failed:", err);
    return NextResponse.json(
      { error: "Could not unblock that day." },
      { status: 500 },
    );
  }
}
