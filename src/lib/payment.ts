/** Display info for Venmo / Zelle (QR images live in public/images). */

export type PaymentMethodPreference =
  | "cash"
  | "venmo"
  | "zelle"
  | "undecided";

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
