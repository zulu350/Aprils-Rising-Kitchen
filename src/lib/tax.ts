/** Idaho sales tax on bakery product. Delivery is not taxed. */
export const IDAHO_SALES_TAX_RATE = 0.06;

/** Nearest cent. Negative or empty product is $0 tax. */
export function salesTaxCents(taxableProductCents: number): number {
  const base = Math.max(0, Math.round(taxableProductCents));
  return Math.round(base * IDAHO_SALES_TAX_RATE);
}
