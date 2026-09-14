import { salesTaxCents } from "@/lib/tax";

/** Delivery in Boise & Meridian: $8 under $30, free at $30 and up. Pickup is never charged. */

export const DELIVERY_FEE_CENTS = 800;
export const FREE_DELIVERY_MIN_CENTS = 3000;

export const HOW_IT_WORKS_FULFILLMENT =
  "Choose pickup or local delivery, 1:00–5:00 PM. Under $30, delivery is $8. At $30+, we deliver free!";

export function deliveryFeeCents(
  fulfillment: string,
  subtotalCents: number,
): number {
  if (fulfillment !== "delivery") return 0;
  return subtotalCents >= FREE_DELIVERY_MIN_CENTS ? 0 : DELIVERY_FEE_CENTS;
}

/** Product + tax + delivery + kitchen adjustment. Tax is 6% of product (incl. adjustment), not delivery. */
export function quoteOrderTotals(
  fulfillment: string,
  subtotalCents: number,
  adjustmentCents = 0,
): { deliveryFeeCents: number; taxCents: number; totalCents: number } {
  const fee = deliveryFeeCents(fulfillment, subtotalCents);
  const tax = salesTaxCents(subtotalCents + adjustmentCents);
  return {
    deliveryFeeCents: fee,
    taxCents: tax,
    totalCents: subtotalCents + fee + tax + adjustmentCents,
  };
}
