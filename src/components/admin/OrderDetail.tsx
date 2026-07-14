"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ORDER_STATUSES,
  STATUS_COLORS,
  STATUS_LABELS,
  formatMoney,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/admin-orders";

type OrderDetailData = {
  id: string;
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
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  subtotalCents: number;
  totalCents: number;
  createdAt: string;
  pickupAddress: string | null;
  items: Array<{
    name: string;
    unitLabel: string;
    unitPriceCents: number;
    quantity: number;
    lineTotalCents: number;
  }>;
};

export function OrderDetail({ id }: { id: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmNumber, setConfirmNumber] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${id}`);
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Not found");
        setOrder(null);
      } else {
        setOrder(data.order as OrderDetailData);
      }
    } catch {
      setError("Network error");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(body: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
  }) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Update failed");
      } else {
        setOrder(data.order as OrderDetailData);
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteOrder() {
    if (!order) return;
    if (confirmNumber.trim() !== order.orderNumber) {
      setError(`Type ${order.orderNumber} exactly to confirm delete.`);
      return;
    }
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!res.ok) {
        setError(data.error || "Delete failed");
        setDeleting(false);
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Network error");
      setDeleting(false);
    }
  }

  if (error && !order) {
    return (
      <div>
        <p className="text-red-700">{error}</p>
        <Link href="/admin" className="mt-4 inline-block text-sm text-espresso">
          ← Back to board
        </Link>
      </div>
    );
  }

  if (!order) {
    return <p className="text-muted">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className="text-sm font-medium text-muted hover:text-espresso"
      >
        ← All orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-espresso tabular-nums">
            {order.orderNumber}
          </p>
          <h2 className="font-display text-3xl text-espresso">
            {order.customerName}
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[order.status]}`}
            >
              {STATUS_LABELS[order.status]}
            </span>
            <span className="rounded-full bg-cream px-2.5 py-0.5 text-xs font-semibold ring-1 ring-linen">
              {order.paymentStatus === "paid" ? "Paid" : "Unpaid"} ·{" "}
              {order.paymentMethod}
            </span>
          </div>
        </div>
        <p className="font-display text-3xl text-espresso tabular-nums">
          {formatMoney(order.totalCents)}
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <section className="rounded-2xl bg-cream p-5 ring-1 ring-linen">
        <h3 className="font-display text-lg text-espresso">Update status</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {ORDER_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              disabled={saving || order.status === status}
              onClick={() => void patch({ status })}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                order.status === status
                  ? "bg-espresso text-white"
                  : "bg-white text-brown ring-1 ring-linen hover:bg-wheat"
              }`}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving || order.paymentStatus === "paid"}
            onClick={() => void patch({ paymentStatus: "paid" })}
            className="rounded-full bg-sage-dark px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Mark paid
          </button>
          <button
            type="button"
            disabled={saving || order.paymentStatus === "unpaid"}
            onClick={() => void patch({ paymentStatus: "unpaid" })}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-brown ring-1 ring-linen disabled:opacity-50"
          >
            Mark unpaid
          </button>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl bg-cream p-5 ring-1 ring-linen sm:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
            Contact
          </h3>
          {order.email ? (
            <p className="mt-1 text-espresso">{order.email}</p>
          ) : (
            <p className="mt-1 text-sm text-muted">No email provided</p>
          )}
          <a
            href={`tel:${order.phone}`}
            className="text-espresso tabular-nums hover:underline"
          >
            {order.phone}
          </a>
        </div>
        <div>
          <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
            Schedule
          </h3>
          <p className="mt-1 tabular-nums text-espresso">{order.preferredDate}</p>
          {order.preferredTimeWindow ? (
            <p className="text-sm text-muted">{order.preferredTimeWindow}</p>
          ) : null}
        </div>
        <div>
          <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
            Fulfillment
          </h3>
          <p className="mt-1 capitalize text-espresso">{order.fulfillment}</p>
          {order.fulfillment === "delivery" ? (
            <p className="text-sm text-muted">
              {order.deliveryAddress}
              {order.deliveryCity ? `, ${order.deliveryCity}` : ""}
            </p>
          ) : (
            <p className="text-sm text-muted">
              {order.pickupAddress || "Pickup address not set in env"}
            </p>
          )}
        </div>
        <div>
          <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
            Placed
          </h3>
          <p className="mt-1 text-sm text-muted">
            {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        {order.notes ? (
          <div className="sm:col-span-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
              Notes
            </h3>
            <p className="mt-1 text-brown">{order.notes}</p>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl bg-cream p-5 ring-1 ring-linen">
        <h3 className="font-display text-lg text-espresso">Items</h3>
        <ul className="mt-3 divide-y divide-linen">
          {order.items.map((item, i) => (
            <li
              key={`${item.name}-${i}`}
              className="flex justify-between gap-3 py-3 text-sm"
            >
              <span>
                {item.quantity}× {item.name}
                <span className="block text-xs text-muted">
                  {formatMoney(item.unitPriceCents)} / {item.unitLabel}
                </span>
              </span>
              <span className="font-medium tabular-nums">
                {formatMoney(item.lineTotalCents)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t border-linen pt-3 font-semibold text-espresso">
          <span>Total</span>
          <span className="tabular-nums">{formatMoney(order.totalCents)}</span>
        </div>
      </section>

      <section className="rounded-2xl border border-red-200 bg-red-50/80 p-5">
        <h3 className="font-display text-lg text-red-900">Delete order</h3>
        <p className="mt-2 text-sm text-red-900/80">
          Permanently removes this order from the kitchen list and database.
          Use for test orders or mistakes. This cannot be undone.
        </p>
        <label className="mt-4 block text-sm text-red-950">
          Type{" "}
          <span className="font-semibold tabular-nums">{order.orderNumber}</span>{" "}
          to confirm
          <input
            type="text"
            value={confirmNumber}
            onChange={(e) => setConfirmNumber(e.target.value)}
            autoComplete="off"
            placeholder={order.orderNumber}
            className="mt-1 w-full max-w-xs rounded-xl border border-red-200 bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
          />
        </label>
        <button
          type="button"
          disabled={
            deleting || confirmNumber.trim() !== order.orderNumber
          }
          onClick={() => void deleteOrder()}
          className="mt-4 rounded-full bg-red-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {deleting ? "Deleting…" : "Delete permanently"}
        </button>
      </section>
    </div>
  );
}
