"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ORDER_STATUSES,
  STATUS_COLORS,
  STATUS_LABELS,
  formatMoney,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/admin-orders";

type LineDraft = {
  key: string;
  menuItemId: string;
  name: string;
  unitLabel: string;
  unitPriceCents: number;
  quantity: number;
};

type OrderDetailData = {
  id: string;
  orderNumber: string;
  accessToken?: string;
  customerName: string;
  email: string;
  phone: string;
  fulfillment: string;
  deliveryCity: string | null;
  deliveryAddress: string | null;
  preferredDate: string;
  preferredTimeWindow: string | null;
  notes: string | null;
  adminNote?: string | null;
  adjustmentCents?: number;
  adjustmentLabel?: string | null;
  adminEditedAt?: string | null;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  subtotalCents: number;
  totalCents: number;
  createdAt: string;
  pickupAddress: string | null;
  items: Array<{
    menuItemId?: string;
    name: string;
    unitLabel: string;
    unitPriceCents: number;
    quantity: number;
    lineTotalCents: number;
  }>;
};

function newKey() {
  return `line-${Math.random().toString(36).slice(2, 10)}`;
}

function dollarsToCents(value: string): number {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function centsToDollarsInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function OrderDetail({ id }: { id: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmNumber, setConfirmNumber] = useState("");
  const [editing, setEditing] = useState(false);

  const [lines, setLines] = useState<LineDraft[]>([]);
  const [notes, setNotes] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [adjustmentDollars, setAdjustmentDollars] = useState("0.00");
  const [adjustmentLabel, setAdjustmentLabel] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(false);

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
        const o = data.order as OrderDetailData;
        setOrder(o);
        setLines(
          o.items.map((item) => ({
            key: newKey(),
            menuItemId: item.menuItemId || "custom",
            name: item.name,
            unitLabel: item.unitLabel,
            unitPriceCents: item.unitPriceCents,
            quantity: item.quantity,
          })),
        );
        setNotes(o.notes || "");
        setAdminNote(o.adminNote || "");
        setPreferredDate(o.preferredDate || "");
        setAdjustmentDollars(centsToDollarsInput(o.adjustmentCents ?? 0));
        setAdjustmentLabel(o.adjustmentLabel || "");
        setNotifyCustomer(Boolean(o.email));
      }
    } catch {
      setError("Network error");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const previewSubtotal = useMemo(
    () =>
      lines.reduce((s, l) => s + l.unitPriceCents * Math.max(0, l.quantity), 0),
    [lines],
  );
  const previewAdjustment = dollarsToCents(adjustmentDollars);
  const previewTotal = previewSubtotal + previewAdjustment;

  async function patch(body: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
  }) {
    setSaving(true);
    setError("");
    setInfo("");
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

  async function saveContentEdits() {
    if (!order) return;
    if (lines.length === 0) {
      setError("Add at least one line item.");
      return;
    }
    for (const line of lines) {
      if (!line.name.trim()) {
        setError("Each line needs a name.");
        return;
      }
      if (line.quantity < 1) {
        setError(`Quantity for “${line.name}” must be at least 1.`);
        return;
      }
    }

    setSaving(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({
            menuItemId: l.menuItemId,
            name: l.name.trim(),
            unitLabel: l.unitLabel.trim() || "each",
            unitPriceCents: l.unitPriceCents,
            quantity: l.quantity,
          })),
          notes: notes.trim() || null,
          adminNote: adminNote.trim() || null,
          preferredDate: preferredDate.trim() || undefined,
          adjustmentCents: dollarsToCents(adjustmentDollars),
          adjustmentLabel: adjustmentLabel.trim() || null,
          notifyCustomer: notifyCustomer && Boolean(order.email),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Update failed");
      } else {
        setOrder(data.order as OrderDetailData);
        setEditing(false);
        if (data.emailed) {
          setInfo("Order saved. Customer was emailed about the update.");
        } else if (notifyCustomer && data.emailSkipped) {
          setInfo(`Order saved. Email not sent: ${data.emailSkipped}`);
        } else {
          setInfo("Order saved.");
        }
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
            {order.adminEditedAt ? (
              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-900">
                Customized
              </span>
            ) : null}
          </div>
        </div>
        <p className="font-display text-3xl text-espresso tabular-nums">
          {formatMoney(editing ? previewTotal : order.totalCents)}
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="text-sm text-sage-dark" role="status">
          {info}
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
        {order.accessToken ? (
          <div className="sm:col-span-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
              Customer order link
            </h3>
            <p className="mt-1 break-all text-xs text-muted">
              {(process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
                "https://www.aprilsrisingkitchen.com") +
                `/order/${order.orderNumber}?t=${order.accessToken}`}
            </p>
            <p className="mt-1 text-xs text-muted">
              Private link (includes secret token). Safe to text to the customer;
              order number alone will not open their page.
            </p>
          </div>
        ) : null}
        {order.notes && !editing ? (
          <div className="sm:col-span-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
              Customer notes
            </h3>
            <p className="mt-1 text-brown">{order.notes}</p>
          </div>
        ) : null}
        {order.adminNote && !editing ? (
          <div className="sm:col-span-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
              Note to customer
            </h3>
            <p className="mt-1 text-brown">{order.adminNote}</p>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl bg-cream p-5 ring-1 ring-linen">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-lg text-espresso">
            {editing ? "Edit order (custom / special requests)" : "Items"}
          </h3>
          {!editing ? (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setInfo("");
                setError("");
              }}
              className="rounded-full bg-crust-dark px-4 py-2 text-sm font-semibold text-white"
            >
              Edit order
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setEditing(false);
                  void load();
                  setError("");
                  setInfo("");
                }}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-brown ring-1 ring-linen"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveContentEdits()}
                className="rounded-full bg-espresso px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          )}
        </div>

        {!editing ? (
          <>
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
            {(order.adjustmentCents ?? 0) !== 0 ? (
              <div className="flex justify-between border-t border-linen pt-3 text-sm">
                <span>
                  {order.adjustmentLabel || "Adjustment"}
                </span>
                <span className="tabular-nums">
                  {order.adjustmentCents! > 0 ? "+" : ""}
                  {formatMoney(order.adjustmentCents!)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-linen pt-3 font-semibold text-espresso">
              <span>Amount owed</span>
              <span className="tabular-nums">
                {formatMoney(order.totalCents)}
              </span>
            </div>
          </>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted">
              Change quantities, prices, or add a custom line (e.g. half dozen).
              Use the adjustment for a simple +/− on the total. Menu stays whole
              units for the public.
            </p>
            {lines.map((line, index) => (
              <div
                key={line.key}
                className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-linen sm:grid sm:grid-cols-12 sm:items-end sm:gap-2 sm:space-y-0"
              >
                <label className="block text-xs sm:col-span-4">
                  <span className="text-muted">Item name</span>
                  <input
                    value={line.name}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === index ? { ...l, name: v } : l,
                        ),
                      );
                    }}
                    className="mt-1 w-full rounded-lg border border-linen px-2 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs sm:col-span-2">
                  <span className="text-muted">Unit</span>
                  <input
                    value={line.unitLabel}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === index ? { ...l, unitLabel: v } : l,
                        ),
                      );
                    }}
                    className="mt-1 w-full rounded-lg border border-linen px-2 py-2 text-sm"
                    placeholder="dozen"
                  />
                </label>
                <label className="block text-xs sm:col-span-2">
                  <span className="text-muted">Qty</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={line.quantity}
                    onChange={(e) => {
                      const v = Math.floor(Number(e.target.value) || 1);
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === index
                            ? { ...l, quantity: Math.min(99, Math.max(1, v)) }
                            : l,
                        ),
                      );
                    }}
                    className="mt-1 w-full rounded-lg border border-linen px-2 py-2 text-sm tabular-nums"
                  />
                </label>
                <label className="block text-xs sm:col-span-2">
                  <span className="text-muted">Unit $</span>
                  <input
                    type="number"
                    step="0.01"
                    value={centsToDollarsInput(line.unitPriceCents)}
                    onChange={(e) => {
                      const cents = dollarsToCents(e.target.value);
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === index ? { ...l, unitPriceCents: cents } : l,
                        ),
                      );
                    }}
                    className="mt-1 w-full rounded-lg border border-linen px-2 py-2 text-sm tabular-nums"
                  />
                </label>
                <div className="flex items-center justify-between gap-2 sm:col-span-2 sm:flex-col sm:items-stretch sm:justify-end">
                  <span className="text-sm font-medium tabular-nums text-espresso">
                    {formatMoney(line.unitPriceCents * line.quantity)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setLines((prev) => prev.filter((_, i) => i !== index))
                    }
                    className="text-xs font-medium text-red-800 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setLines((prev) => [
                  ...prev,
                  {
                    key: newKey(),
                    menuItemId: "custom",
                    name: "",
                    unitLabel: "each",
                    unitPriceCents: 0,
                    quantity: 1,
                  },
                ])
              }
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-espresso ring-1 ring-linen"
            >
              + Add custom line
            </button>

            <div className="grid gap-3 border-t border-linen pt-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-brown">
                  Adjustment label (optional)
                </span>
                <input
                  value={adjustmentLabel}
                  onChange={(e) => setAdjustmentLabel(e.target.value)}
                  placeholder="e.g. Half-dozen discount"
                  className="mt-1 w-full rounded-xl border border-linen bg-white px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-brown">
                  Adjustment $ (use negative to reduce total)
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={adjustmentDollars}
                  onChange={(e) => setAdjustmentDollars(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-linen bg-white px-3 py-2.5 text-sm tabular-nums"
                />
              </label>
            </div>

            <label className="block text-sm">
              <span className="font-medium text-brown">
                Fulfillment date (admin may set any day for specials)
              </span>
              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="mt-1 w-full max-w-xs rounded-xl border border-linen bg-white px-3 py-2.5 text-sm tabular-nums"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-brown">
                Customer request notes
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border border-linen bg-white px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-brown">
                Note to customer (shown on their order page)
              </span>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={2}
                placeholder="e.g. Adjusted to 1½ dozen Classic Pandesal as requested."
                className="mt-1 w-full rounded-xl border border-linen bg-white px-3 py-2.5 text-sm"
              />
            </label>

            <div className="rounded-xl bg-wheat px-4 py-3 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="tabular-nums">
                  {formatMoney(previewSubtotal)}
                </span>
              </div>
              {previewAdjustment !== 0 ? (
                <div className="mt-1 flex justify-between text-muted">
                  <span>{adjustmentLabel || "Adjustment"}</span>
                  <span className="tabular-nums">
                    {previewAdjustment > 0 ? "+" : ""}
                    {formatMoney(previewAdjustment)}
                  </span>
                </div>
              ) : null}
              <div className="mt-2 flex justify-between font-semibold text-espresso">
                <span>Amount owed</span>
                <span className="tabular-nums">
                  {formatMoney(previewTotal)}
                </span>
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm text-brown">
              <input
                type="checkbox"
                checked={notifyCustomer}
                disabled={!order.email}
                onChange={(e) => setNotifyCustomer(e.target.checked)}
                className="mt-1"
              />
              <span>
                Email customer about this update
                {!order.email ? (
                  <span className="block text-xs text-muted">
                    Unavailable — no email on this order.
                  </span>
                ) : (
                  <span className="block text-xs text-muted">
                    Sends a short update with the new amount and order link.
                  </span>
                )}
              </span>
            </label>
          </div>
        )}
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
