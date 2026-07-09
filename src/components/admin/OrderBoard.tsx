"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ORDER_STATUSES,
  STATUS_COLORS,
  STATUS_LABELS,
  formatMoney,
  type OrderStatus,
} from "@/lib/admin-orders";

type OrderRow = {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  fulfillment: string;
  preferredDate: string;
  status: OrderStatus;
  paymentStatus: string;
  paymentMethod: string;
  totalCents: number;
  items: Array<{ name: string; quantity: number }>;
};

const FILTERS = [
  { value: "active", label: "Active" },
  { value: "all", label: "All" },
  ...ORDER_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
];

export function OrderBoard() {
  const [filter, setFilter] = useState("active");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q =
        filter === "active"
          ? ""
          : `?status=${encodeURIComponent(filter)}`;
      const res = await fetch(`/api/admin/orders${q}`);
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load orders");
        setOrders([]);
      } else {
        setOrders(data.orders as OrderRow[]);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold sm:text-sm ${
                filter === f.value
                  ? "bg-espresso text-white"
                  : "bg-cream text-brown ring-1 ring-linen"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-full bg-crust-dark px-4 py-2 text-sm font-semibold text-white"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-muted">Loading orders…</p>
      ) : error ? (
        <p className="text-red-700" role="alert">
          {error}
        </p>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl bg-cream p-8 text-center ring-1 ring-linen">
          <p className="font-display text-xl text-espresso">No orders here</p>
          <p className="mt-2 text-sm text-muted">
            New customer orders will show up in Active.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/admin/orders/${order.id}`}
                className="block rounded-2xl bg-cream p-4 shadow-sm ring-1 ring-linen transition hover:ring-crust sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-espresso tabular-nums">
                        {order.orderNumber}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[order.status] || "bg-stone-100"}`}
                      >
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                      {order.paymentStatus === "paid" ? (
                        <span className="rounded-full bg-sage/20 px-2.5 py-0.5 text-xs font-semibold text-sage-dark">
                          Paid
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                          Unpaid
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-brown">
                      {order.customerName} · {order.phone}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {order.preferredDate} · {order.fulfillment}
                      {" · "}
                      {order.items
                        .map((i) => `${i.quantity}× ${i.name}`)
                        .join(", ")}
                    </p>
                  </div>
                  <p className="font-semibold text-espresso tabular-nums">
                    {formatMoney(order.totalCents)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
