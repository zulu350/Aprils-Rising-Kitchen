"use client";

import Link from "next/link";
import { UNIT_LABELS, formatPrice, getMenuItem } from "@/data/menu";
import { useCart } from "@/lib/cart";
import { MESSAGING } from "@/lib/availability";

export function CartClient() {
  const {
    ready,
    itemCount,
    subtotalCents,
    setQuantity,
    removeItem,
    clearCart,
    getLineDetails,
  } = useCart();

  if (!ready) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-muted">Loading cart…</p>
      </div>
    );
  }

  const details = getLineDetails();
  const hasSourdough = details.some(
    (d) => getMenuItem(d.menuItemId)?.category === "sourdough",
  );

  if (itemCount === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="font-display text-4xl text-espresso">Your cart</h1>
        <p className="mt-4 text-brown">
          Your cart is empty. Browse the menu to add fresh-baked favorites.
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-espresso">Your cart</h1>
          <p className="mt-2 text-sm text-muted">
            {itemCount} item{itemCount === 1 ? "" : "s"} · pickup/delivery
            1:00–5:00 PM
          </p>
        </div>
        <button
          type="button"
          onClick={clearCart}
          className="text-sm font-medium text-muted underline-offset-2 hover:text-espresso hover:underline"
        >
          Clear cart
        </button>
      </div>

      <div className="mt-6 rounded-2xl bg-wheat px-4 py-3 text-sm leading-relaxed text-brown ring-1 ring-linen">
        {hasSourdough ? (
          <>
            <p className="font-medium text-espresso">{MESSAGING.mixedCart}</p>
            <p className="mt-1 text-muted">{MESSAGING.sourdough}</p>
          </>
        ) : (
          <p>{MESSAGING.rollsOnly}</p>
        )}
        <p className="mt-1 text-muted">{MESSAGING.fulfillmentWindow}</p>
      </div>

      <ul className="mt-8 space-y-3">
        {details.map(({ menuItemId, quantity, item, lineTotalCents }) => (
          <li
            key={menuItemId}
            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-linen sm:p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="font-display text-xl text-espresso">
                  {item.name}
                </h2>
                <p className="text-sm text-muted">
                  {formatPrice(item.priceCents)} / {UNIT_LABELS[item.unitLabel]}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center rounded-full bg-wheat ring-1 ring-linen">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    className="px-3 py-2 text-lg font-medium text-espresso"
                    onClick={() => setQuantity(menuItemId, quantity - 1)}
                  >
                    −
                  </button>
                  <span className="min-w-8 text-center text-sm font-semibold tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    className="px-3 py-2 text-lg font-medium text-espresso"
                    onClick={() => setQuantity(menuItemId, quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <span className="min-w-16 text-right text-sm font-semibold text-espresso tabular-nums">
                  {formatPrice(lineTotalCents)}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(menuItemId)}
                  className="text-sm text-muted hover:text-espresso"
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 rounded-2xl bg-wheat p-5 ring-1 ring-linen sm:p-6">
        <div className="flex items-center justify-between text-base">
          <span className="font-medium text-brown">Subtotal</span>
          <span className="font-semibold text-espresso tabular-nums">
            {formatPrice(subtotalCents)}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted">
          No sales tax. Delivery available in Boise &amp; Meridian. Payment by
          cash, Venmo, or Zelle after we confirm.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/checkout"
            className="inline-flex flex-1 items-center justify-center rounded-full bg-crust-dark px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-espresso"
          >
            Continue to checkout
          </Link>
          <Link
            href="/menu"
            className="inline-flex flex-1 items-center justify-center rounded-full bg-cream px-6 py-3.5 text-sm font-semibold text-espresso ring-1 ring-linen transition hover:bg-white"
          >
            Keep shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
