"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "@/data/menu";
import { BUSINESS } from "@/lib/constants";

type OrderPayload = {
  orderNumber: string;
  customerName: string;
  email: string;
  phone: string;
  fulfillment: string;
  deliveryCity: string | null;
  deliveryAddress: string | null;
  preferredDate: string;
  preferredTimeWindow: string | null;
  notes: string | null;
  status: string;
  paymentMethod: string;
  subtotalCents: number;
  totalCents: number;
  items: Array<{
    name: string;
    unitLabel: string;
    quantity: number;
    lineTotalCents: number;
  }>;
  pickupAddress: string | null;
  paymentNote: string;
};

export function OrderConfirmation({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = useState<OrderPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}`);
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) setError(data.error || "Order not found.");
        } else if (!cancelled) {
          setOrder(data as OrderPayload);
        }
      } catch {
        if (!cancelled) setError("Could not load order.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <p className="text-muted">Loading your order…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <h1 className="font-display text-3xl text-espresso">Order not found</h1>
        <p className="mt-3 text-brown">{error || "We couldn't find that order."}</p>
        <Link
          href="/menu"
          className="mt-8 inline-flex rounded-full bg-crust-dark px-5 py-2.5 text-sm font-semibold text-white"
        >
          Back to menu
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-semibold tracking-wide text-sage-dark uppercase">
        Thank you
      </p>
      <h1 className="mt-2 font-display text-4xl text-espresso">
        Order received
      </h1>
      <p className="mt-3 text-brown">
        We&apos;ll confirm availability and timing soon. Save your order number:{" "}
        <strong className="font-semibold text-espresso tabular-nums">
          {order.orderNumber}
        </strong>
      </p>

      <div className="mt-8 space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-linen">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">
              Name
            </p>
            <p className="text-espresso">{order.customerName}</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">
              Preferred date
            </p>
            <p className="text-espresso tabular-nums">{order.preferredDate}</p>
            {order.preferredTimeWindow ? (
              <p className="text-muted">{order.preferredTimeWindow}</p>
            ) : null}
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">
              Contact
            </p>
            <p className="text-espresso">{order.email}</p>
            <p className="text-espresso tabular-nums">{order.phone}</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">
              Fulfillment
            </p>
            <p className="capitalize text-espresso">{order.fulfillment}</p>
            {order.fulfillment === "delivery" ? (
              <p className="text-muted">
                {order.deliveryAddress}
                {order.deliveryCity ? `, ${order.deliveryCity}` : ""}
              </p>
            ) : (
              <p className="text-muted">
                {order.pickupAddress
                  ? order.pickupAddress
                  : "We'll share the pickup address when we confirm (or call/text us)."}
              </p>
            )}
          </div>
        </div>

        <ul className="space-y-2 border-t border-linen pt-4 text-sm">
          {order.items.map((item, i) => (
            <li key={`${item.name}-${i}`} className="flex justify-between gap-3">
              <span>
                {item.quantity}× {item.name}
              </span>
              <span className="tabular-nums">
                {formatPrice(item.lineTotalCents)}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex justify-between border-t border-linen pt-4 font-semibold text-espresso">
          <span>Total</span>
          <span className="tabular-nums">{formatPrice(order.totalCents)}</span>
        </div>

        <p className="text-sm text-muted">{order.paymentNote}</p>
        {order.notes ? (
          <p className="text-sm">
            <span className="font-medium text-brown">Notes: </span>
            {order.notes}
          </p>
        ) : null}
      </div>

      <p className="mt-8 text-sm text-brown">
        Questions? Call or text{" "}
        <a href={BUSINESS.phoneHref} className="font-medium text-espresso">
          {BUSINESS.phone}
        </a>{" "}
        or email{" "}
        <a
          href={`mailto:${BUSINESS.email}`}
          className="font-medium text-espresso"
        >
          {BUSINESS.email}
        </a>
        .
      </p>

      <Link
        href="/menu"
        className="mt-6 inline-flex rounded-full bg-crust-dark px-6 py-3 text-sm font-semibold text-white"
      >
        Order again
      </Link>
    </div>
  );
}
