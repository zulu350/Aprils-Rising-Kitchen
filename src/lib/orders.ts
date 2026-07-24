import {
  formatPrice,
  getMenuItem,
  getRequiredLeadTimeHours,
  UNIT_LABELS,
  type MenuItem,
} from "@/data/menu";
import {
  buildDateSlots,
  nowInBoise,
  toISODate,
  validateFulfillmentDate,
} from "@/lib/availability";

export type CartLineInput = {
  menuItemId: string;
  quantity: number;
};

export type CreateOrderInput = {
  customerName: string;
  email?: string;
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

/** Preferred date validation (schedule + optional capacity map). */
export function validatePreferredDate(
  preferredDate: string,
  itemIds: string[],
  countsByDate: Record<string, number> = {},
): string | null {
  return validateFulfillmentDate(preferredDate, itemIds, countsByDate);
}

/** First available date for cart (no capacity); prefer /api/availability. */
export function minPreferredDateISO(itemIds: string[]): string {
  const slots = buildDateSlots(itemIds, {});
  const first = slots.find((s) => s.available);
  if (first) return first.date;
  const n = nowInBoise();
  n.setDate(n.getDate() + 1);
  return toISODate(n);
}

export function validateCreateOrder(
  body: CreateOrderInput,
):
  | {
      ok: true;
      lines: ResolvedLine[];
      subtotalCents: number;
      email: string;
      preferredDate: string;
    }
  | { ok: false; error: string } {
  const name = body.customerName?.trim() ?? "";
  const emailRaw = body.email?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  const preferredDate = body.preferredDate?.trim() ?? "";

  if (name.length < 2) return { ok: false, error: "Please enter your name." };
  // Email is optional; if provided it must look valid
  if (emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    return {
      ok: false,
      error: "Please enter a valid email, or leave it blank.",
    };
  }
  if (phone.length < 7) return { ok: false, error: "Please enter a phone number." };
  const email = emailRaw ? emailRaw.toLowerCase() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
    return { ok: false, error: "Please choose a preferred pickup or delivery date." };
  }

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

  // Date + capacity validated in API after DB count (see create order route)

  const method = body.paymentMethod ?? "undecided";
  if (!["cash", "venmo", "zelle", "undecided"].includes(method)) {
    return { ok: false, error: "Invalid payment preference." };
  }

  const subtotalCents = lines.reduce((s, l) => s + l.lineTotalCents, 0);
  return { ok: true, lines, subtotalCents, email, preferredDate };
}

/**
 * Next order number based on the highest existing ARK-####, not row count.
 * Using count() breaks after deletes (e.g. 5 rows left → reuses ARK-1006).
 */
export async function nextOrderNumber(
  existingNumbers: () => Promise<string[]>,
): Promise<string> {
  const numbers = await existingNumbers();
  let max = 1000;
  for (const orderNumber of numbers) {
    const m = orderNumber.match(/(\d+)\s*$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return `ARK-${max + 1}`;
}

export { formatPrice, UNIT_LABELS };
