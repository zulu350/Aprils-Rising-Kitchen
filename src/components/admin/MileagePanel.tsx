"use client";

import { useState } from "react";

function destinationLine(
  address: string | null | undefined,
  city: string | null | undefined,
): string | null {
  const street = (address ?? "").trim();
  if (!street) return null;
  const place = (city ?? "").trim();
  return place ? `${street}, ${place}, ID` : `${street}, ID`;
}

function mapsDir(origin: string, destination: string): string {
  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export type MileageLastStop = {
  id: string;
  orderNumber: string;
  customerName: string;
  deliveryCity: string | null;
  deliveryAddress: string | null;
  deliveryMiles: number | null;
};

type Props = {
  orderId: string;
  deliveryCity: string | null;
  deliveryAddress: string | null;
  deliveryMiles: number | null;
  milesFrom: string | null;
  returnMiles: number | null;
  homeConfigured: boolean;
  homeAddress: string | null;
  lastStop: MileageLastStop | null;
  onSaved: (next: {
    deliveryMiles?: number | null;
    milesFrom?: string | null;
    returnMiles?: number | null;
  }) => void;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
};

export function MileagePanel({
  orderId,
  deliveryCity,
  deliveryAddress,
  deliveryMiles,
  milesFrom,
  returnMiles,
  homeConfigured,
  homeAddress,
  lastStop,
  onSaved,
  onError,
  onInfo,
}: Props) {
  const [from, setFrom] = useState<"home" | "last">(
    milesFrom && milesFrom !== "Home" && lastStop ? "last" : "home",
  );
  const [miles, setMiles] = useState(
    deliveryMiles == null ? "" : String(deliveryMiles),
  );
  const [backMiles, setBackMiles] = useState(
    returnMiles == null ? "" : String(returnMiles),
  );
  const [busy, setBusy] = useState<
    "estimate" | "save" | "return-estimate" | "return-save" | null
  >(null);

  const dest = destinationLine(deliveryAddress, deliveryCity);
  const origin =
    from === "last" && lastStop
      ? destinationLine(lastStop.deliveryAddress, lastStop.deliveryCity)
      : homeAddress;
  const mapsHref =
    dest && origin
      ? mapsDir(origin, dest)
      : dest
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest)}`
        : null;
  const returnMapsHref =
    dest && homeAddress ? mapsDir(dest, homeAddress) : null;

  async function estimate() {
    setBusy("estimate");
    onError("");
    onInfo("");
    try {
      const res = await fetch(
        `/api/admin/orders/${orderId}/mileage-estimate?from=${from}`,
      );
      const data = (await res.json()) as {
        miles?: number;
        milesFrom?: string;
        error?: string;
      };
      if (!res.ok) {
        onError(data.error || "Could not estimate miles.");
        return;
      }
      if (typeof data.miles === "number") {
        setMiles(String(data.miles));
        onInfo(
          `Estimated ${data.miles} miles from ${data.milesFrom ?? from}. Overwrite if you stopped anywhere else.`,
        );
      }
    } catch {
      onError("Network error estimating miles.");
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setBusy("save");
    onError("");
    onInfo("");
    try {
      const fromLabel =
        from === "last" && lastStop ? lastStop.orderNumber : "Home";
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryMiles: miles.trim() === "" ? null : miles,
          milesFrom: fromLabel,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        order?: { deliveryMiles: number | null; milesFrom: string | null };
      };
      if (!res.ok) {
        onError(data.error || "Could not save miles.");
        return;
      }
      onSaved({
        deliveryMiles: data.order?.deliveryMiles ?? null,
        milesFrom: data.order?.milesFrom ?? fromLabel,
      });
      onInfo("Miles saved.");
    } catch {
      onError("Network error saving miles.");
    } finally {
      setBusy(null);
    }
  }

  async function estimateReturn() {
    setBusy("return-estimate");
    onError("");
    onInfo("");
    try {
      const res = await fetch(
        `/api/admin/orders/${orderId}/mileage-estimate?from=return`,
      );
      const data = (await res.json()) as {
        miles?: number;
        error?: string;
      };
      if (!res.ok) {
        onError(data.error || "Could not estimate return miles.");
        return;
      }
      if (typeof data.miles === "number") {
        setBackMiles(String(data.miles));
        onInfo(
          `Estimated ${data.miles} miles back to the bakery. Overwrite if you did not go straight home.`,
        );
      }
    } catch {
      onError("Network error estimating return miles.");
    } finally {
      setBusy(null);
    }
  }

  async function saveReturn() {
    setBusy("return-save");
    onError("");
    onInfo("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnMiles: backMiles.trim() === "" ? null : backMiles,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        order?: { returnMiles: number | null };
      };
      if (!res.ok) {
        onError(data.error || "Could not save return miles.");
        return;
      }
      onSaved({ returnMiles: data.order?.returnMiles ?? null });
      onInfo("Return miles saved.");
    } catch {
      onError("Network error saving return miles.");
    } finally {
      setBusy(null);
    }
  }

  const milesSummary = [
    deliveryMiles != null ? `${deliveryMiles} mi` : null,
    returnMiles != null ? `return ${returnMiles}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <details className="rounded-2xl bg-wheat p-4 ring-1 ring-linen sm:p-5">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 font-display text-xl text-espresso [&::-webkit-details-marker]:hidden">
        <span>Delivery miles</span>
        <span className="text-sm font-sans font-medium text-muted">
          {milesSummary || "Tap to log"}
        </span>
      </summary>
      <p className="mt-3 text-sm text-muted">
        Tap From, then Estimate. Change the number if this run was not a
        straight bakery trip.
      </p>

      <p className="mt-4 text-xs font-semibold tracking-wide text-muted uppercase">
        From
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setFrom("home")}
          disabled={!homeConfigured}
          className={`min-h-12 rounded-2xl px-3 py-3 text-sm font-semibold ${
            from === "home"
              ? "bg-espresso text-white"
              : "bg-white text-brown ring-1 ring-linen"
          } disabled:opacity-40`}
        >
          Home
        </button>
        <button
          type="button"
          onClick={() => lastStop && setFrom("last")}
          disabled={!lastStop}
          className={`min-h-12 rounded-2xl px-3 py-3 text-sm font-semibold ${
            from === "last"
              ? "bg-espresso text-white"
              : "bg-white text-brown ring-1 ring-linen"
          } disabled:opacity-40`}
        >
          {lastStop ? `Last stop · ${lastStop.orderNumber}` : "No other stop today"}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void estimate()}
          disabled={busy !== null || !dest}
          className="min-h-12 rounded-full bg-crust-dark px-4 py-3.5 text-base font-semibold text-white disabled:opacity-50"
        >
          {busy === "estimate" ? "Estimating…" : "Estimate miles"}
        </button>
        {mapsHref ? (
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 items-center justify-center rounded-full bg-white px-4 py-3.5 text-base font-semibold text-espresso ring-1 ring-linen"
          >
            Open Maps
          </a>
        ) : null}
      </div>

      <label className="mt-4 block text-sm">
        <span className="font-medium text-brown">Miles</span>
        <input
          inputMode="decimal"
          value={miles}
          onChange={(e) => setMiles(e.target.value)}
          placeholder="e.g. 4.8"
          className="mt-1 w-full rounded-xl border border-linen bg-white px-3 py-3.5 text-lg tabular-nums"
        />
      </label>
      {milesFrom ? (
        <p className="mt-1 text-xs text-muted">Saved from {milesFrom}</p>
      ) : null}

      <button
        type="button"
        onClick={() => void save()}
        disabled={busy !== null}
        className="mt-3 min-h-12 w-full rounded-full bg-espresso px-4 py-3.5 text-base font-semibold text-white disabled:opacity-50"
      >
        {busy === "save" ? "Saving…" : "Save miles"}
      </button>

      <div className="mt-6 border-t border-linen pt-4">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">
          Last drop of the day
        </p>
        <p className="mt-1 text-sm text-muted">
          Only on the final delivery. Estimates this address back to the
          bakery.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void estimateReturn()}
            disabled={busy !== null || !homeConfigured || !dest}
            className="min-h-12 rounded-full bg-crust-dark px-4 py-3.5 text-base font-semibold text-white disabled:opacity-50"
          >
            {busy === "return-estimate"
              ? "Estimating…"
              : "Return to bakery"}
          </button>
          {returnMapsHref ? (
            <a
              href={returnMapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center justify-center rounded-full bg-white px-4 py-3.5 text-base font-semibold text-espresso ring-1 ring-linen"
            >
              Maps home
            </a>
          ) : null}
        </div>
        <label className="mt-3 block text-sm">
          <span className="font-medium text-brown">Return miles</span>
          <input
            inputMode="decimal"
            value={backMiles}
            onChange={(e) => setBackMiles(e.target.value)}
            placeholder="e.g. 4.8"
            className="mt-1 w-full rounded-xl border border-linen bg-white px-3 py-3.5 text-lg tabular-nums"
          />
        </label>
        <button
          type="button"
          onClick={() => void saveReturn()}
          disabled={busy !== null}
          className="mt-3 min-h-12 w-full rounded-full bg-espresso px-4 py-3.5 text-base font-semibold text-white disabled:opacity-50"
        >
          {busy === "return-save" ? "Saving…" : "Save return"}
        </button>
      </div>
    </details>
  );
}
