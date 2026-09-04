import { quoteStaffCreate, type StaffCreateBody } from "@/lib/staff-orders";
import {
  isStaffAuthorized,
  staffUnauthorizedResponse,
} from "@/lib/staff-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Dry-run create: same validation and totals as POST, no new order. */
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

  return Response.json(
    { generatedAt, preview: quoted.quote.preview },
    { headers: { "Cache-Control": "no-store" } },
  );
}
