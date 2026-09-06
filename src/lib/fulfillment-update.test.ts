import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveFulfillmentPatch } from "./fulfillment-update.ts";

const pickup17 = {
  fulfillment: "pickup",
  deliveryCity: null as string | null,
  deliveryAddress: null as string | null,
  subtotalCents: 1700,
  adjustmentCents: 0,
};

test("pickup to delivery adds $8 under $30", () => {
  const result = resolveFulfillmentPatch(pickup17, {
    fulfillmentType: "delivery",
    deliveryCity: "Boise",
    deliveryAddress: "123 Main St",
  });
  assert.equal(result.ok, true);
  if (!result.ok || !result.changed) throw new Error("expected change");
  assert.equal(result.value.fulfillment, "delivery");
  assert.equal(result.value.deliveryCity, "Boise");
  assert.equal(result.value.deliveryAddress, "123 Main St");
  assert.equal(result.value.deliveryFeeCents, 800);
  assert.equal(result.value.totalCents, 2500);
});

test("delivery to pickup clears address and fee", () => {
  const result = resolveFulfillmentPatch(
    {
      fulfillment: "delivery",
      deliveryCity: "Meridian",
      deliveryAddress: "9 Oak",
      subtotalCents: 1700,
      adjustmentCents: 0,
    },
    { fulfillmentType: "pickup" },
  );
  assert.equal(result.ok, true);
  if (!result.ok || !result.changed) throw new Error("expected change");
  assert.equal(result.value.fulfillment, "pickup");
  assert.equal(result.value.deliveryCity, null);
  assert.equal(result.value.deliveryAddress, null);
  assert.equal(result.value.deliveryFeeCents, 0);
  assert.equal(result.value.totalCents, 1700);
});

test("delivery without address is 400", () => {
  const result = resolveFulfillmentPatch(pickup17, {
    fulfillmentType: "delivery",
    deliveryCity: "Boise",
  });
  assert.equal(result.ok, false);
});

test("invalid city is 400", () => {
  const result = resolveFulfillmentPatch(pickup17, {
    fulfillmentType: "delivery",
    deliveryCity: "Nampa",
    deliveryAddress: "1 St",
  });
  assert.equal(result.ok, false);
});

test("address on pickup without switching is 400", () => {
  const result = resolveFulfillmentPatch(pickup17, {
    deliveryAddress: "1 St",
  });
  assert.equal(result.ok, false);
});

test("$30+ delivery is free", () => {
  const result = resolveFulfillmentPatch(
    {
      ...pickup17,
      subtotalCents: 3000,
    },
    {
      fulfillmentType: "delivery",
      deliveryCity: "meridian",
      deliveryAddress: "9 Oak",
    },
  );
  assert.equal(result.ok, true);
  if (!result.ok || !result.changed) throw new Error("expected change");
  assert.equal(result.value.deliveryCity, "Meridian");
  assert.equal(result.value.deliveryFeeCents, 0);
  assert.equal(result.value.totalCents, 3000);
});

test("keeps kitchen adjustment in the new total", () => {
  const result = resolveFulfillmentPatch(
    { ...pickup17, adjustmentCents: -200 },
    {
      fulfillmentType: "delivery",
      deliveryCity: "Boise",
      deliveryAddress: "123 Main St",
    },
  );
  assert.equal(result.ok, true);
  if (!result.ok || !result.changed) throw new Error("expected change");
  assert.equal(result.value.totalCents, 2300);
});
