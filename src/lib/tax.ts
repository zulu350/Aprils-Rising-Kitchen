/** Idaho sales tax on bakery product. Delivery is not taxed. */
export const IDAHO_SALES_TAX_RATE = 0.06;

/** Same wording on checkout, confirmation, kitchen, receipts, and emails. */
export const TAX_LINE_LABEL = "Idaho 6% Tax";

/** Nearest cent. Negative or empty product is $0 tax. */
export function salesTaxCents(taxableProductCents: number): number {
  const base = Math.max(0, Math.round(taxableProductCents));
  return Math.round(base * IDAHO_SALES_TAX_RATE);
}
