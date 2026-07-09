import {
  formatPrice,
  getMenuItem,
  getRequiredLeadTimeHours,
  UNIT_LABELS,
  type MenuItem,
} from "@/data/menu";
import { BUSINESS } from "@/lib/constants";

export type CartLineInput = {
  menuItemId: string;
  quantity: number;
};

export type CreateOrderInput = {
  customerName: string;
  email: string;
  phone: string;
  fulfillment: "pickup" | "delivery";
  deliveryCity?: string;
  deliveryAddress?: string;
  preferredDate: string;
  preferredTimeWindow?: string;
  notes?: string;
  paymentMethod: "cash" | "venmo" | "zelle" | "undecided";
  items: CartLineInput[];
};

export type ResolvedLine = {
  item: MenuItem;
  quantity: number;
  lineTotalCents: number;
};

export function resolveOrderLines(items: CartLineInput[]): {
  lines: ResolvedLine[];
  error?: string;
} {
  if (!Array.isArray(items) || items.length === 0) {
    return { lines: [], error: "Your cart is empty." };
  }

  const lines: ResolvedLine[] = [];
  for (const raw of items) {
    const menuItemId = String(raw?.menuItemId ?? "");
    const quantity = Math.floor(Number(raw?.quantity));
    const item = getMenuItem(menuItemId);
    if (!item || !item.available) {
      return { lines: [], error: `Unknown or unavailable item: ${menuItemId}` };
    }
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) {
      return { lines: [], error: `Invalid quantity for ${item.name}.` };
    }
    lines.push({
      item,
      quantity,
      lineTotalCents: item.priceCents * quantity,
    });
  }
  return { lines };
}

/** Preferred date is YYYY-MM-DD in America/Boise calendar. */
export function validatePreferredDate(
  preferredDate: string,
  itemIds: string[],
): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
    return "Please choose a valid preferred date.";
  }

  const leadHours = getRequiredLeadTimeHours(itemIds);
  if (!leadHours) return "Could not determine lead time for your items.";

  const nowBoise = new Date(
    new Date().toLocaleString("en-US", { timeZone: BUSINESS.timezone }),
  );
  const minDate = new Date(nowBoise);
  minDate.setHours(0, 0, 0, 0);
  // Need full calendar days of lead: 24h => tomorrow earliest, 48h => day after tomorrow
  const leadDays = Math.ceil(leadHours / 24);
  minDate.setDate(minDate.getDate() + leadDays);

  const [y, m, d] = preferredDate.split("-").map(Number);
  const preferred = new Date(y, m - 1, d);
  preferred.setHours(0, 0, 0, 0);

  if (preferred < minDate) {
    const minStr = minDate.toISOString().slice(0, 10);
    return `Please choose a date on or after ${minStr} (at least ${leadHours} hours notice for your items).`;
  }

  return null;
}

export function minPreferredDateISO(itemIds: string[]): string {
  const leadHours = getRequiredLeadTimeHours(itemIds) || 24;
  const leadDays = Math.ceil(leadHours / 24);
  const nowBoise = new Date(
    new Date().toLocaleString("en-US", { timeZone: BUSINESS.timezone }),
  );
  nowBoise.setHours(0, 0, 0, 0);
  nowBoise.setDate(nowBoise.getDate() + leadDays);
  const y = nowBoise.getFullYear();
  const m = String(nowBoise.getMonth() + 1).padStart(2, "0");
  const d = String(nowBoise.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function validateCreateOrder(
  body: CreateOrderInput,
): { ok: true; lines: ResolvedLine[]; subtotalCents: number } | { ok: false; error: string } {
  const name = body.customerName?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  const preferredDate = body.preferredDate?.trim() ?? "";

  if (name.length < 2) return { ok: false, error: "Please enter your name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email." };
  }
  if (phone.length < 7) return { ok: false, error: "Please enter a phone number." };

  if (body.fulfillment !== "pickup" && body.fulfillment !== "delivery") {
    return { ok: false, error: "Choose pickup or delivery." };
  }

  if (body.fulfillment === "delivery") {
    const city = body.deliveryCity?.trim() ?? "";
    if (city !== "Boise" && city !== "Meridian") {
      return {
        ok: false,
        error: "Delivery is available in Boise and Meridian only.",
      };
    }
    if (!(body.deliveryAddress?.trim().length)) {
      return { ok: false, error: "Please enter a delivery address." };
    }
  }

  const { lines, error } = resolveOrderLines(body.items ?? []);
  if (error) return { ok: false, error };

  const dateError = validatePreferredDate(
    preferredDate,
    lines.map((l) => l.item.id),
  );
  if (dateError) return { ok: false, error: dateError };

  const method = body.paymentMethod ?? "undecided";
  if (!["cash", "venmo", "zelle", "undecided"].includes(method)) {
    return { ok: false, error: "Invalid payment preference." };
  }

  const subtotalCents = lines.reduce((s, l) => s + l.lineTotalCents, 0);
  return { ok: true, lines, subtotalCents };
}

export async function nextOrderNumber(
  countExisting: () => Promise<number>,
): Promise<string> {
  const count = await countExisting();
  return `ARK-${1001 + count}`;
}

export { formatPrice, UNIT_LABELS };
