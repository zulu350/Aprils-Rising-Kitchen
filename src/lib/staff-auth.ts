import { timingSafeEqual } from "node:crypto";

/**
 * Read-only staff API (Grok Bot / desk). Separate from the kitchen browser
 * cookie login so a leaked poll token is not the admin password.
 */
export function staffApiToken(): string {
  return (process.env.STAFF_API_TOKEN ?? "").trim();
}

export function isStaffApiConfigured(): boolean {
  return staffApiToken().length > 0;
}

export function isStaffAuthorized(request: Request): boolean {
  const expected = staffApiToken();
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)/i.exec(header);
  const provided = match?.[1] ?? "";
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

export function staffUnauthorizedResponse() {
  if (!isStaffApiConfigured()) {
    return Response.json(
      { error: "Staff API is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  return Response.json(
    { error: "Unauthorized" },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}
