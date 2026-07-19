"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import {
  UNIT_LABELS,
  formatPrice,
  getRequiredLeadTimeHours,
} from "@/data/menu";
import { PaymentQrPanel } from "@/components/PaymentQrPanel";
import { useCart } from "@/lib/cart";
import { BUSINESS } from "@/lib/constants";
import { minPreferredDateISO } from "@/lib/orders";
import type { PaymentMethodPreference } from "@/lib/payment";

export function CheckoutClient() {
  const router = useRouter();
  const { ready, itemCount, subtotalCents, getLineDetails, clearCart } =
    useCart();
  const details = getLineDetails();
  const itemIds = details.map((d) => d.menuItemId);
  const itemIdsKey = itemIds.join(",");
  const leadHours = getRequiredLeadTimeHours(itemIds);
  const minDate = useMemo(
    () => minPreferredDateISO(itemIdsKey ? itemIdsKey.split(",") : []),
    [itemIdsKey],
  );

  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">(
    "pickup",
  );
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethodPreference>("undecided");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!ready) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  if (itemCount === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="font-display text-4xl text-espresso">Checkout</h1>
        <p className="mt-4 text-brown">
          Your cart is empty. Add items from the menu first.
        </p>
        <Link
          href="/menu"
          className="mt-8 inline-flex rounded-full bg-crust-dark px-6 py-3 text-sm font-semibold text-white"
        >
          Browse menu
        </Link>
      </div>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const payload = {
      customerName: String(form.get("customerName") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      fulfillment,
      deliveryCity:
        fulfillment === "delivery"
          ? String(form.get("deliveryCity") ?? "")
          : undefined,
      deliveryAddress:
        fulfillment === "delivery"
          ? String(form.get("deliveryAddress") ?? "")
          : undefined,
      preferredDate: String(form.get("preferredDate") ?? ""),
      preferredTimeWindow: String(form.get("preferredTimeWindow") ?? "") || undefined,
      notes: String(form.get("notes") ?? "") || undefined,
      paymentMethod,
      items: details.map((d) => ({
        menuItemId: d.menuItemId,
        quantity: d.quantity,
      })),
    };

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { orderNumber?: string; error?: string };
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      clearCart();
      router.push(`/order/${data.orderNumber}`);
    } catch {
      setError("Network error. Please try again or call us.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-4xl text-espresso">Checkout</h1>
      <p className="mt-2 text-sm text-muted">
        {leadHours
          ? `Your order needs at least ${leadHours} hours notice.`
          : null}{" "}
        No tax. Pay with cash, Venmo, or Zelle when we confirm.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <form onSubmit={onSubmit} className="space-y-5">
          <fieldset className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-linen">
            <legend className="px-1 font-display text-xl text-espresso">
              Your info
            </legend>
            <label className="block text-sm">
              <span className="font-medium text-brown">Name *</span>
              <input
                name="customerName"
                required
                autoComplete="name"
                className="mt-1 w-full rounded-xl border border-linen bg-cream px-3 py-2.5 outline-none focus:border-crust focus:ring-2 focus:ring-crust/30"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-brown">Email</span>
              <span className="ml-1 text-xs font-normal text-muted">
                (optional — for order confirmation)
              </span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                className="mt-1 w-full rounded-xl border border-linen bg-cream px-3 py-2.5 outline-none focus:border-crust focus:ring-2 focus:ring-crust/30"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-brown">Phone *</span>
              <input
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                className="mt-1 w-full rounded-xl border border-linen bg-cream px-3 py-2.5 outline-none focus:border-crust focus:ring-2 focus:ring-crust/30"
              />
            </label>
          </fieldset>

          <fieldset className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-linen">
            <legend className="px-1 font-display text-xl text-espresso">
              Fulfillment
            </legend>
            <div className="flex flex-wrap gap-3">
              {(
                [
                  ["pickup", "Pickup"],
                  ["delivery", "Delivery"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium ring-1 transition ${
                    fulfillment === value
                      ? "bg-espresso text-white ring-espresso"
                      : "bg-cream text-brown ring-linen"
                  }`}
                >
                  <input
                    type="radio"
                    name="fulfillment"
                    value={value}
                    checked={fulfillment === value}
                    onChange={() => setFulfillment(value)}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
            {fulfillment === "pickup" ? (
              <p className="text-sm text-muted">
                Pickup during daylight hours at our home kitchen. Address is
                shared after you place the order.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted">
                  Delivery available in {BUSINESS.serviceArea}.
                </p>
                <label className="block text-sm">
                  <span className="font-medium text-brown">City *</span>
                  <select
                    name="deliveryCity"
                    required={fulfillment === "delivery"}
                    className="mt-1 w-full rounded-xl border border-linen bg-cream px-3 py-2.5 outline-none focus:border-crust focus:ring-2 focus:ring-crust/30"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select city
                    </option>
                    <option value="Boise">Boise</option>
                    <option value="Meridian">Meridian</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-brown">Street address *</span>
                  <textarea
                    name="deliveryAddress"
                    required={fulfillment === "delivery"}
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-linen bg-cream px-3 py-2.5 outline-none focus:border-crust focus:ring-2 focus:ring-crust/30"
                  />
                </label>
              </div>
            )}
            <label className="block text-sm">
              <span className="font-medium text-brown">Preferred date *</span>
              <input
                name="preferredDate"
                type="date"
                required
                min={minDate}
                defaultValue={minDate}
                className="mt-1 w-full rounded-xl border border-linen bg-cream px-3 py-2.5 outline-none focus:border-crust focus:ring-2 focus:ring-crust/30"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-brown">
                Preferred time window
              </span>
              <input
                name="preferredTimeWindow"
                placeholder="e.g. afternoon, after 3pm"
                className="mt-1 w-full rounded-xl border border-linen bg-cream px-3 py-2.5 outline-none focus:border-crust focus:ring-2 focus:ring-crust/30"
              />
            </label>
          </fieldset>

          <fieldset className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-linen">
            <legend className="px-1 font-display text-xl text-espresso">
              Payment preference
            </legend>
            <p className="text-sm text-muted">
              Cash, Venmo, or Zelle. Choose Venmo or Zelle to show a QR code you
              can scan. Codes also appear on your order page after you place the
              order.
            </p>
            <select
              name="paymentMethod"
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(e.target.value as PaymentMethodPreference)
              }
              className="w-full rounded-xl border border-linen bg-cream px-3 py-2.5 text-sm outline-none focus:border-crust focus:ring-2 focus:ring-crust/30"
            >
              <option value="undecided">Decide later</option>
              <option value="cash">Cash</option>
              <option value="venmo">Venmo</option>
              <option value="zelle">Zelle</option>
            </select>
            <PaymentQrPanel method={paymentMethod} />
            {paymentMethod === "cash" ? (
              <p className="text-sm text-muted">
                Pay with cash at pickup or delivery.
              </p>
            ) : null}
            <label className="block text-sm">
              <span className="font-medium text-brown">Notes / custom requests</span>
              <textarea
                name="notes"
                rows={3}
                placeholder="Special requests, loaf size, gate codes…"
                className="mt-1 w-full rounded-xl border border-linen bg-cream px-3 py-2.5 outline-none focus:border-crust focus:ring-2 focus:ring-crust/30"
              />
            </label>
          </fieldset>

          {error ? (
            <p
              className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-100"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-crust-dark px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-espresso disabled:opacity-60"
          >
            {submitting ? "Placing order…" : "Place order"}
          </button>
          <p className="text-center text-xs text-muted">
            Or call/text{" "}
            <a href={BUSINESS.phoneHref} className="font-medium text-espresso">
              {BUSINESS.phone}
            </a>
          </p>
        </form>

        <aside className="h-fit rounded-2xl bg-wheat p-5 ring-1 ring-linen lg:sticky lg:top-24">
          <h2 className="font-display text-xl text-espresso">Order summary</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {details.map((d) => (
              <li key={d.menuItemId} className="flex justify-between gap-3">
                <span>
                  {d.quantity}× {d.item.name}
                  <span className="block text-xs text-muted">
                    {UNIT_LABELS[d.item.unitLabel]}
                  </span>
                </span>
                <span className="shrink-0 font-medium tabular-nums">
                  {formatPrice(d.lineTotalCents)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-linen pt-4 font-semibold text-espresso">
            <span>Total</span>
            <span className="tabular-nums">{formatPrice(subtotalCents)}</span>
          </div>
          <Link
            href="/cart"
            className="mt-4 inline-block text-sm font-medium text-muted hover:text-espresso"
          >
            ← Edit cart
          </Link>
        </aside>
      </div>
    </div>
  );
}
