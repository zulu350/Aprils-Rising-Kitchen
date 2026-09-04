import { CATEGORY_LABELS, UNIT_LABELS, menuItems } from "@/data/menu";
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

  const items = menuItems
    .filter((item) => item.available)
    .map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      categoryLabel: CATEGORY_LABELS[item.category],
      unit: UNIT_LABELS[item.unitLabel],
      price: item.priceCents / 100,
      priceCents: item.priceCents,
    }));

  return Response.json(
    { generatedAt: new Date().toISOString(), count: items.length, items },
    { headers: { "Cache-Control": "no-store" } },
  );
}
