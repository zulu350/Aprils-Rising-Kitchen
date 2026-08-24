import { NextResponse } from "next/server";
import { isSquareConfigured, squareConfig } from "@/lib/square";

export const runtime = "nodejs";

/** Public Square IDs for the Web Payments SDK (access token stays server-side). */
export async function GET() {
  if (!isSquareConfigured()) {
    return NextResponse.json(
      { configured: false, error: "Square is not configured." },
      { status: 503 },
    );
  }
  const c = squareConfig();
  return NextResponse.json({
    configured: true,
    applicationId: c.applicationId,
    locationId: c.locationId,
    environment: c.environment,
    webSdkUrl: c.webSdkUrl,
  });
}
