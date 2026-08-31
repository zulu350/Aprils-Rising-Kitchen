/** Display info for Venmo / Zelle (QR images live in public/images). */

export type PaymentMethodPreference =
  | "cash"
  | "venmo"
  | "zelle"
  | "square"
  | "undecided";

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  venmo: "Venmo",
  zelle: "Zelle",
  square: "Card / Apple Pay / Google Pay",
  undecided: "To be decided",
};

export function squarePaidLabel(wallet?: string | null): string {
  if (wallet === "apple_pay") return "Paid with Apple Pay.";
  if (wallet === "google_pay") return "Paid with Google Pay.";
  if (wallet === "card") return "Paid with card.";
  return "Paid with card or digital wallet.";
}

/** Customer-facing thank-you once the kitchen (or Square) has marked the order paid. */
export function paidThankYouLabel(
  method: string,
  wallet?: string | null,
): string {
  if (method === "square") return `${squarePaidLabel(wallet)} Thank you.`;
  if (method === "venmo") return "Paid with Venmo. Thank you.";
  if (method === "zelle") return "Paid with Zelle. Thank you.";
  if (method === "cash") return "Paid with cash. Thank you.";
  return "Paid. Thank you.";
}

export function squareMethodLabel(wallet?: string | null): string {
  if (wallet === "apple_pay") return "Apple Pay";
  if (wallet === "google_pay") return "Google Pay";
  if (wallet === "card") return "Card";
  return "Card / Apple Pay / Google Pay";
}

export const PAYMENT = {
  venmo: {
    label: "Venmo",
    name: "Aprilyn Thompson",
    handle: "@Aprilyn-Thompson",
    qrSrc: "/images/pay-venmo-qr.jpg",
    qrAlt: "Venmo QR code for Aprilyn Thompson, @Aprilyn-Thompson",
  },
  zelle: {
    label: "Zelle",
    name: "APRILYN",
    detail: "360-383-7464",
    qrSrc: "/images/pay-zelle-qr.jpg",
    qrAlt: "Zelle QR code for APRIL YN at 360-383-7464",
  },
} as const;

export function showsPaymentQr(
  method: string | null | undefined,
): method is "venmo" | "zelle" {
  return method === "venmo" || method === "zelle";
}
