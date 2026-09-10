import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveAdminOrderLines, resolveOrderLines } from "./orders.ts";

test("custom Ensaymada $12 pickup product total", () => {
  const result = resolveAdminOrderLines([
    { custom: true, name: "Ensaymada", quantity: 1, unitPrice: 12 },
  ]);
  assert.equal(result.error, undefined);
  assert.equal(result.lines.length, 1);
  assert.equal(result.lines[0]?.name, "Ensaymada");
  assert.equal(result.lines[0]?.menuItemId, "custom");
  assert.equal(result.lines[0]?.unitPriceCents, 1200);
  assert.equal(result.lines[0]?.lineTotalCents, 1200);
});

test("catalog cheese rolls still uses menu price", () => {
  const result = resolveAdminOrderLines([
    { menuItemId: "cheese-rolls", quantity: 1 },
  ]);
  assert.equal(result.error, undefined);
  assert.equal(result.lines[0]?.name, "Cheese Rolls");
  assert.equal(result.lines[0]?.unitPriceCents, 2500);
});

test("public checkout still rejects unknown ids", () => {
  const result = resolveOrderLines([
    { menuItemId: "ensaymada", quantity: 1 },
  ]);
  assert.ok(result.error);
});

test("mixed catalog plus custom", () => {
  const result = resolveAdminOrderLines([
    { menuItemId: "classic-pandesal", quantity: 1 },
    { custom: true, name: "Ensaymada", quantity: 2, unitPrice: 12 },
  ]);
  assert.equal(result.error, undefined);
  const total = result.lines.reduce((s, l) => s + l.lineTotalCents, 0);
  assert.equal(total, 2000 + 2400);
});
