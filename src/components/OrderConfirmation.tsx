"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "@/data/menu";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  isOrderStatus,
  type OrderStatus,
} from "@/lib/admin-orders";
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
  createdAt?: string;
  items: Array<{
    name: string;
    unitLabel: string;
    quantity: number;
    lineTotalCents: number;
  }>;
  pickupAddress: string | null;
  paymentNote: string;
};

/** Short customer-facing note for each kitchen status */
const STATUS_HELP: Record<OrderStatus, string> = {
  new: "We’ve received your order and will review it shortly.",
  confirmed:
    "Your order is confirmed. We’ll bake it for your preferred date.",
  baking: "Your order is in the oven — baking now.",
  ready:
    "Your order is ready for pickup or delivery. We’ll be in touch on timing if needed.",
  completed: "This order is complete. Thank you for supporting our kitchen!",
  cancelled:
    "This order was cancelled. Call or text us if you have questions.",
};

function statusLabel(status: string): string {
  if (isOrderStatus(status)) return STATUS_LABELS[status];
  return status;
}

function statusColor(status: string): string {
  if (isOrderStatus(status)) return STATUS_COLORS[status];
  return "bg-stone-100 text-stone-700";
}

function statusHelp(status: string): string {
  if (isOrderStatus(status)) return STATUS_HELP[status];
  return "We’ll update this page as your order progresses.";
}

export function OrderConfirmation({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = useState<OrderPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/orders/${encodeURIComponent(orderNumber)}`,
        );
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
        <p className="mt-3 text-brown">
          {error || "We couldn't find that order."}
        </p>
        <Link
          href="/menu"
          className="mt-8 inline-flex rounded-full bg-crust-dark px-5 py-2.5 text-sm font-semibold text-white"
        >
          Back to menu
        </Link>
      </div>
    );
  }

  const headline =
    order.status === "completed"
      ? "Order complete"
      : order.status === "cancelled"
        ? "Order cancelled"
        : order.status === "ready"
          ? "Your order is ready"
          : order.status === "baking"
            ? "We’re baking your order"
            : order.status === "confirmed"
              ? "Order confirmed"
              : "Order received";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-semibold tracking-wide text-sage-dark uppercase">
        Thank you
      </p>
      <h1 className="mt-2 font-display text-4xl text-espresso">{headline}</h1>
      <p className="mt-3 text-brown">
        Order{" "}
        <strong className="font-semibold text-espresso tabular-nums">
          {order.orderNumber}
        </strong>
        . Refresh this page anytime to see the latest status.
      </p>

      <div className="mt-6 rounded-2xl bg-wheat p-5 ring-1 ring-linen">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">
          Current status
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex rounded-full px-4 py-1.5 text-sm font-semibold ${statusColor(order.status)}`}
          >
            {statusLabel(order.status)}
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-brown">
          {statusHelp(order.status)}
        </p>
      </div>

      <div className="mt-6 space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-linen">
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
            {order.createdAt ? (
              <p className="mt-1 text-xs text-muted">
                Placed{" "}
                {new Date(order.createdAt).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            ) : null}
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">
              Contact
            </p>
            {order.email ? (
              <p className="text-espresso">{order.email}</p>
            ) : null}
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
