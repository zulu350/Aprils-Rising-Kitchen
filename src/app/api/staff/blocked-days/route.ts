import { prisma } from "@/lib/db";
import {
  isStaffAuthorized,
  staffUnauthorizedResponse,
} from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/** GET — list blocked fulfillment dates (same rows as kitchen admin). */
export async function GET(request: Request) {
  if (!isStaffAuthorized(request)) {
    return staffUnauthorizedResponse();
  }

  const generatedAt = new Date().toISOString();
  try {
    const blockedDays = await prisma.blockedDay.findMany({
      orderBy: { date: "asc" },
    });
    return json({ generatedAt, blockedDays });
  } catch (err) {
    console.error("Staff blocked-days GET failed:", err);
    return json({ error: "Could not load blocked days.", generatedAt }, 503);
  }
}

/** POST — block a date. Body: { date: "YYYY-MM-DD", note?: string } */
export async function POST(request: Request) {
  if (!isStaffAuthorized(request)) {
    return staffUnauthorizedResponse();
  }

  const generatedAt = new Date().toISOString();
  let body: { date?: string; note?: string | null };
  try {
    body = (await request.json()) as { date?: string; note?: string | null };
  } catch {
    return json({ error: "Invalid JSON body.", generatedAt }, 400);
  }

  const date = body.date?.trim() ?? "";
  if (!DATE_RE.test(date)) {
    return json({ error: "Date must be YYYY-MM-DD.", generatedAt }, 400);
  }

  const note = body.note?.trim() || null;

  try {
    const blockedDay = await prisma.blockedDay.upsert({
      where: { date },
      create: { date, note },
      update: { note },
    });
    return json({ generatedAt, blockedDay });
  } catch (err) {
    console.error("Staff blocked-days POST failed:", err);
    return json({ error: "Could not block that day.", generatedAt }, 500);
  }
}

/** DELETE — unblock a date. ?date=YYYY-MM-DD or body { date }. */
export async function DELETE(request: Request) {
  if (!isStaffAuthorized(request)) {
    return staffUnauthorizedResponse();
  }

  const generatedAt = new Date().toISOString();
  const { searchParams } = new URL(request.url);
  let date = searchParams.get("date")?.trim() ?? "";

  if (!date) {
    try {
      const body = (await request.json()) as { date?: string };
      date = body.date?.trim() ?? "";
    } catch {
      // query only
    }
  }

  if (!DATE_RE.test(date)) {
    return json({ error: "Date must be YYYY-MM-DD.", generatedAt }, 400);
  }

  try {
    await prisma.blockedDay.deleteMany({ where: { date } });
    return json({ generatedAt, ok: true, date });
  } catch (err) {
    console.error("Staff blocked-days DELETE failed:", err);
    return json({ error: "Could not unblock that day.", generatedAt }, 500);
  }
}
