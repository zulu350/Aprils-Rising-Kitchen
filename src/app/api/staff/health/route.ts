import { prisma } from "@/lib/db";
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
    await prisma.order.count();
    return Response.json(
      { ok: true, generatedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("Staff health check failed:", err);
    return Response.json(
      { ok: false, generatedAt, error: "Database unreachable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
