import assert from "node:assert/strict";
import { test } from "node:test";
import { quoteOrderTotals } from "./delivery.ts";
import { salesTaxCents } from "./tax.ts";

test("6% rounds to nearest cent on product", () => {
  assert.equal(salesTaxCents(700), 42);
  assert.equal(salesTaxCents(2400), 144);
  assert.equal(salesTaxCents(1900), 114);
  assert.equal(salesTaxCents(0), 0);
  assert.equal(salesTaxCents(-100), 0);
});

test("pickup Pinoy Cheese Bread $24 plus tax", () => {
  const quoted = quoteOrderTotals("pickup", 2400);
  assert.equal(quoted.deliveryFeeCents, 0);
  assert.equal(quoted.taxCents, 144);
  assert.equal(quoted.totalCents, 2544);
});

test("delivery does not get tax", () => {
  const quoted = quoteOrderTotals("delivery", 1900);
  assert.equal(quoted.deliveryFeeCents, 800);
  assert.equal(quoted.taxCents, 114);
  assert.equal(quoted.totalCents, 1900 + 800 + 114);
});
