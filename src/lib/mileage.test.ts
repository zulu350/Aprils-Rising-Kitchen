import assert from "node:assert/strict";
import { test } from "node:test";
import {
  csvEscape,
  formatDestination,
  mapsDirectionsUrl,
  parseMiles,
  pickLastStop,
} from "./mileage.ts";

test("parseMiles rounds to one decimal and allows clear", () => {
  assert.deepEqual(parseMiles(""), { ok: true, value: null });
  assert.deepEqual(parseMiles(null), { ok: true, value: null });
  assert.deepEqual(parseMiles("4.84"), { ok: true, value: 4.8 });
  assert.equal(parseMiles(-1).ok, false);
  assert.equal(parseMiles("nope").ok, false);
});

test("destination joins street and city", () => {
  assert.equal(
    formatDestination("123 Main St", "Boise"),
    "123 Main St, Boise, ID",
  );
  assert.equal(formatDestination("  ", "Boise"), null);
});

test("maps URL is driving directions", () => {
  const url = mapsDirectionsUrl("Home", "123 Main St, Boise, ID");
  assert.match(url, /google\.com\/maps\/dir/);
  assert.match(url, /travelmode=driving/);
});

test("last stop prefers a logged delivery", () => {
  const last = pickLastStop([
    {
      id: "1",
      orderNumber: "ARK-1",
      customerName: "A",
      deliveryCity: "Boise",
      deliveryAddress: "1 A St",
      deliveryMiles: null,
    },
    {
      id: "2",
      orderNumber: "ARK-2",
      customerName: "B",
      deliveryCity: "Boise",
      deliveryAddress: "2 B St",
      deliveryMiles: 3.1,
    },
  ]);
  assert.equal(last?.orderNumber, "ARK-2");
});

test("csv quotes commas", () => {
  assert.equal(csvEscape("Boise, ID"), '"Boise, ID"');
});
