import { quoteOrderTotals } from "./delivery";

export const DELIVERY_CITIES = ["Boise", "Meridian"] as const;
export type DeliveryCity = (typeof DELIVERY_CITIES)[number];

export type FulfillmentType = "pickup" | "delivery";

export type FulfillmentExisting = {
  fulfillment: string;
  deliveryCity: string | null;
  deliveryAddress: string | null;
  subtotalCents: number;
  adjustmentCents: number;
};

export type FulfillmentPatchInput = {
  fulfillmentType?: unknown;
  fulfillment?: unknown;
  deliveryCity?: unknown;
  deliveryAddress?: unknown;
};

export type FulfillmentPatchResult = {
  fulfillment: FulfillmentType;
  deliveryCity: string | null;
  deliveryAddress: string | null;
  deliveryFeeCents: number;
  totalCents: number;
};

export function parseFulfillmentType(
  raw: unknown,
): { ok: true; value: FulfillmentType } | { ok: false; error: string } {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, error: "Must be pickup or delivery." };
  }
  const key = raw.trim().toLowerCase();
  if (key === "pickup" || key === "delivery") return { ok: true, value: key };
  return { ok: false, error: "Must be pickup or delivery." };
}

export function parseDeliveryCity(
  raw: unknown,
): { ok: true; value: DeliveryCity } | { ok: false; error: string } {
  if (typeof raw !== "string" || !raw.trim()) {
    return {
      ok: false,
      error: "deliveryCity must be Boise or Meridian.",
    };
  }
  const key = raw.trim().toLowerCase();
  if (key === "boise") return { ok: true, value: "Boise" };
  if (key === "meridian") return { ok: true, value: "Meridian" };
  return { ok: false, error: "deliveryCity must be Boise or Meridian." };
}

export function parseDeliveryAddress(
  raw: unknown,
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, error: "Delivery needs an address." };
  }
  return { ok: true, value: raw.trim() };
}

function fulfillmentFieldsPresent(input: FulfillmentPatchInput): boolean {
  return (
    input.fulfillmentType !== undefined ||
    input.fulfillment !== undefined ||
    input.deliveryCity !== undefined ||
    input.deliveryAddress !== undefined
  );
}

/**
 * Pickup↔delivery (and address edits). Pickup clears stored city/address.
 * Recalculates delivery fee from product subtotal + kitchen adjustment.
 */
export function resolveFulfillmentPatch(
  existing: FulfillmentExisting,
  input: FulfillmentPatchInput,
):
  | { ok: true; changed: false }
  | { ok: true; changed: true; value: FulfillmentPatchResult }
  | { ok: false; error: string } {
  if (!fulfillmentFieldsPresent(input)) {
    return { ok: true, changed: false };
  }

  const rawType =
    input.fulfillmentType !== undefined
      ? input.fulfillmentType
      : input.fulfillment;
  let nextType: FulfillmentType =
    existing.fulfillment === "delivery" ? "delivery" : "pickup";
  if (rawType !== undefined) {
    const parsed = parseFulfillmentType(rawType);
    if (!parsed.ok) return parsed;
    nextType = parsed.value;
  }

  if (nextType === "pickup") {
    if (
      rawType === undefined &&
      (input.deliveryCity !== undefined || input.deliveryAddress !== undefined)
    ) {
      return {
        ok: false,
        error:
          "Cannot set a delivery address on a pickup order. Set fulfillmentType to delivery.",
      };
    }
    const money = quoteOrderTotals(
      "pickup",
      existing.subtotalCents,
      existing.adjustmentCents,
    );
    return {
      ok: true,
      changed: true,
      value: {
        fulfillment: "pickup",
        deliveryCity: null,
        deliveryAddress: null,
        deliveryFeeCents: money.deliveryFeeCents,
        totalCents: money.totalCents,
      },
    };
  }

  if (existing.fulfillment !== "delivery" && rawType === undefined) {
    return {
      ok: false,
      error:
        "Cannot set a delivery address on a pickup order. Set fulfillmentType to delivery.",
    };
  }

  let city = (existing.deliveryCity ?? "").trim() || null;
  let address = (existing.deliveryAddress ?? "").trim() || null;

  if (input.deliveryCity !== undefined) {
    const parsed = parseDeliveryCity(input.deliveryCity);
    if (!parsed.ok) return parsed;
    city = parsed.value;
  }
  if (input.deliveryAddress !== undefined) {
    const parsed = parseDeliveryAddress(input.deliveryAddress);
    if (!parsed.ok) return parsed;
    address = parsed.value;
  }

  if (!city) {
    return {
      ok: false,
      error: "Delivery needs a city (Boise or Meridian).",
    };
  }
  if (city !== "Boise" && city !== "Meridian") {
    return { ok: false, error: "deliveryCity must be Boise or Meridian." };
  }
  if (!address) {
    return { ok: false, error: "Delivery needs an address." };
  }

  const money = quoteOrderTotals(
    "delivery",
    existing.subtotalCents,
    existing.adjustmentCents,
  );
  return {
    ok: true,
    changed: true,
    value: {
      fulfillment: "delivery",
      deliveryCity: city,
      deliveryAddress: address,
      deliveryFeeCents: money.deliveryFeeCents,
      totalCents: money.totalCents,
    },
  };
}
