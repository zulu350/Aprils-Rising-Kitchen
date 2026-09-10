import assert from "node:assert/strict";
import { test } from "node:test";
import { parseStaffListSearch, staffListPrismaWhere } from "./staff-order-search.ts";

test("custom=true aliases to menuItemId=custom", () => {
  const parsed = parseStaffListSearch(new URLSearchParams("custom=true"));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.query.custom, true);
  assert.equal(parsed.query.menuItemId, "custom");
  assert.deepEqual(staffListPrismaWhere(parsed.query), {
    AND: [{ items: { some: { menuItemId: "custom" } } }],
  });
});

test("explicit menuItemId wins over custom=true", () => {
  const parsed = parseStaffListSearch(
    new URLSearchParams("custom=true&menuItemId=cheese-rolls"),
  );
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.query.menuItemId, "cheese-rolls");
});

test("custom=false excludes custom lines", () => {
  const parsed = parseStaffListSearch(new URLSearchParams("custom=false"));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.query.custom, false);
  assert.equal(parsed.query.menuItemId, undefined);
  assert.deepEqual(staffListPrismaWhere(parsed.query), {
    AND: [{ NOT: { items: { some: { menuItemId: "custom" } } } }],
  });
});
