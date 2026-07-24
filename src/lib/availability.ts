import { getMenuItem } from "@/data/menu";
import { BUSINESS } from "@/lib/constants";

/** Max non-cancelled checkouts per preferred fulfillment date */
export const MAX_ORDERS_PER_DAY = 4;

/** How far ahead customers may book (weeks) */
export const HORIZON_WEEKS = 4;

/** Bake days for sourdough (JS getDay: 0=Sun … 3=Wed, 5=Fri) */
export const SOURDOUGH_BAKE_DAYS = [3, 5] as const;

/** Cutoff hour local Boise (24h) — Monday for Wed, Wednesday for Fri */
export const CUTOFF_HOUR = 17; // 5:00 PM

export const MESSAGING = {
  hours:
    "We're here for you Monday–Friday, 1:00–5:00 PM (Mountain Time).",
  fulfillmentWindow:
    "Pickup and delivery are scheduled between 1:00 PM and 5:00 PM on your chosen day.",
  sourdoughTitle: "Sourdough bake days",
  sourdough:
    "Our sourdough loaves are baked fresh for Wednesday and Friday only. Please order by Monday 5:00 PM for Wednesday, or by Wednesday 5:00 PM for Friday. Rolls and treats are more flexible when ordered on their own.",
  sourdoughSpecial:
    "Need something outside these days? Leave a note at checkout — we'll do our best to accommodate special requests.",
  mixedCart:
    "Your cart includes sourdough, so this order is available for Wednesday or Friday only (with the same order cutoffs).",
  dayFull:
    "This day is full (our 4-order daily limit). Please choose another available day, or contact us for special requests.",
  noDates:
    "No open dates match your cart right now. Try removing a loaf, choosing another week, or call/text us — we're happy to help.",
  rollsOnly:
    "Rolls and treats: please allow at least 24 hours' notice. Pickup and delivery 1:00–5:00 PM.",
} as const;

export type DateSlot = {
  date: string; // YYYY-MM-DD
  label: string;
  available: boolean;
  reason?: string;
};

/** "Now" as a Date whose local getters reflect America/Boise wall time. */
export function nowInBoise(reference = new Date()): Date {
  return new Date(
    reference.toLocaleString("en-US", { timeZone: BUSINESS.timezone }),
  );
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export function cartHasSourdough(itemIds: string[]): boolean {
  return itemIds.some((id) => getMenuItem(id)?.category === "sourdough");
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Monday 00:00 of the week containing `d` (week starts Monday). */
function mondayOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

/**
 * Whether an order placed at `now` may request fulfillment on `target` (date-only).
 * Does not check capacity.
 */
export function isDateAllowedBySchedule(
  target: Date,
  itemIds: string[],
  now: Date = nowInBoise(),
): { ok: boolean; reason?: string } {
  const hasLoaf = cartHasSourdough(itemIds);
  const today = startOfDay(now);
  const targetDay = startOfDay(target);
  const horizonEnd = startOfDay(now);
  horizonEnd.setDate(horizonEnd.getDate() + HORIZON_WEEKS * 7);

  if (targetDay < today) {
    return { ok: false, reason: "That date has already passed." };
  }
  if (targetDay > horizonEnd) {
    return {
      ok: false,
      reason: `Please choose a date within the next ${HORIZON_WEEKS} weeks.`,
    };
  }

  if (hasLoaf) {
    const dow = targetDay.getDay();
    if (dow !== 3 && dow !== 5) {
      return {
        ok: false,
        reason:
          "Sourdough loaves (and mixed orders with loaves) are for Wednesday or Friday only.",
      };
    }

    const mon = mondayOfWeek(targetDay);
    if (dow === 3) {
      // Wednesday bake — order by Monday 5:00 PM of that week
      const cutoff = new Date(mon);
      cutoff.setHours(CUTOFF_HOUR, 0, 0, 0);
      if (now.getTime() > cutoff.getTime()) {
        return {
          ok: false,
          reason:
            "The Monday 5:00 PM cutoff for this Wednesday has passed. Please choose another bake day.",
        };
      }
    } else {
      // Friday bake — order by Wednesday 5:00 PM of that week
      const cutoff = new Date(mon);
      cutoff.setDate(cutoff.getDate() + 2); // Wednesday
      cutoff.setHours(CUTOFF_HOUR, 0, 0, 0);
      if (now.getTime() > cutoff.getTime()) {
        return {
          ok: false,
          reason:
            "The Wednesday 5:00 PM cutoff for this Friday has passed. Please choose another bake day.",
        };
      }
    }
    return { ok: true };
  }

  // Rolls / treats only: at least ~24 hours (next calendar day in Boise)
  const minDay = startOfDay(now);
  minDay.setDate(minDay.getDate() + 1);
  if (targetDay < minDay) {
    return {
      ok: false,
      reason: "Please allow at least 24 hours' notice for rolls and treats.",
    };
  }
  return { ok: true };
}

export function formatDateLabel(iso: string): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/**
 * Build selectable slots for the next HORIZON_WEEKS.
 * `countsByDate`: map of YYYY-MM-DD → non-cancelled order count.
 */
export function buildDateSlots(
  itemIds: string[],
  countsByDate: Record<string, number>,
  now: Date = nowInBoise(),
): DateSlot[] {
  const slots: DateSlot[] = [];
  const start = startOfDay(now);
  const days = HORIZON_WEEKS * 7;

  for (let i = 0; i <= days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = toISODate(d);
    const schedule = isDateAllowedBySchedule(d, itemIds, now);
    if (!schedule.ok) {
      // Only list days that could ever be valid for this cart type
      // (skip past roll-only "today", skip non Wed/Fri for loaf carts entirely)
      const hasLoaf = cartHasSourdough(itemIds);
      if (hasLoaf) {
        const dow = d.getDay();
        if (dow !== 3 && dow !== 5) continue;
      } else if (i === 0) {
        continue; // today never for rolls
      }
      // Still show Wed/Fri that missed cutoff so customer understands?
      // Better: only show available, OR show unavailable with reason.
      // Show cutoff-missed Wed/Fri as disabled with reason.
      if (hasLoaf && (d.getDay() === 3 || d.getDay() === 5)) {
        slots.push({
          date: iso,
          label: formatDateLabel(iso),
          available: false,
          reason: schedule.reason,
        });
      }
      continue;
    }

    const count = countsByDate[iso] ?? 0;
    if (count >= MAX_ORDERS_PER_DAY) {
      slots.push({
        date: iso,
        label: formatDateLabel(iso),
        available: false,
        reason: MESSAGING.dayFull,
      });
      continue;
    }

    slots.push({
      date: iso,
      label: formatDateLabel(iso),
      available: true,
      reason:
        count > 0
          ? `${count} of ${MAX_ORDERS_PER_DAY} orders booked`
          : undefined,
    });
  }

  return slots;
}

/** Server-side rejection message, or null if OK. */
export function validateFulfillmentDate(
  preferredDate: string,
  itemIds: string[],
  countsByDate: Record<string, number>,
  now: Date = nowInBoise(),
): string | null {
  const d = parseISODate(preferredDate);
  if (!d) return "Please choose a valid preferred date.";

  const schedule = isDateAllowedBySchedule(d, itemIds, now);
  if (!schedule.ok) return schedule.reason ?? "That date is not available.";

  const count = countsByDate[preferredDate] ?? 0;
  if (count >= MAX_ORDERS_PER_DAY) {
    return MESSAGING.dayFull;
  }
  return null;
}

export function publicAvailabilityCopy(hasSourdough: boolean) {
  return {
    hours: MESSAGING.hours,
    fulfillmentWindow: MESSAGING.fulfillmentWindow,
    schedule: hasSourdough ? MESSAGING.sourdough : MESSAGING.rollsOnly,
    special: MESSAGING.sourdoughSpecial,
    mixed: hasSourdough ? MESSAGING.mixedCart : null,
  };
}
