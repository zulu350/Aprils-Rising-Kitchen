/** Staff API payment method: separate from Paid | Unpaid. */

export const STAFF_PAYMENT_METHODS = [
  "cash",
  "venmo",
  "zelle",
  "square",
  "undecided",
] as const;

export type StaffPaymentMethod = (typeof STAFF_PAYMENT_METHODS)[number];

export const STAFF_PAYMENT_METHOD_ERROR =
  "paymentMethod must be Venmo, Zelle, Square, Cash, or empty.";

export const STAFF_PAYMENT_STATUS_ERROR =
  "payment must be Paid or Unpaid. Use paymentMethod for Venmo, Zelle, Square, or Cash.";

const STORED_TO_LABEL: Record<StaffPaymentMethod, string | null> = {
  cash: "Cash",
  venmo: "Venmo",
  zelle: "Zelle",
  square: "Square",
  undecided: null,
};

/** Desk/admin labels and a few aliases → stored enum. Card is Square (website card / Apple Pay). */
const ALIASES: Record<string, StaffPaymentMethod> = {
  cash: "cash",
  venmo: "venmo",
  zelle: "zelle",
  square: "square",
  card: "square",
  "apple pay": "square",
  apple_pay: "square",
  "google pay": "square",
  google_pay: "square",
  "card / apple pay / google pay": "square",
  undecided: "undecided",
  "to be decided": "undecided",
};

export function staffPaymentMethodLabel(
  stored: string | null | undefined,
): string | null {
  const key = (stored ?? "").trim().toLowerCase();
  if (!key) return null;
  if (key in STORED_TO_LABEL) {
    return STORED_TO_LABEL[key as StaffPaymentMethod];
  }
  return stored!.trim();
}

export function looksLikePaymentMethod(raw: string): boolean {
  return ALIASES[raw.trim().toLowerCase()] !== undefined;
}

export function parseStaffPaymentMethodStored(
  raw: unknown,
): { ok: true; value: StaffPaymentMethod } | { ok: false; error: string } {
  if (raw === null || raw === "") {
    return { ok: true, value: "undecided" };
  }
  if (typeof raw !== "string") {
    return { ok: false, error: STAFF_PAYMENT_METHOD_ERROR };
  }
  const mapped = ALIASES[raw.trim().toLowerCase()];
  if (!mapped) {
    return { ok: false, error: STAFF_PAYMENT_METHOD_ERROR };
  }
  return { ok: true, value: mapped };
}
