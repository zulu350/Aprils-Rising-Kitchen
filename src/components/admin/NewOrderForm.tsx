"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CATEGORY_LABELS,
  UNIT_LABELS,
  formatPrice,
  menuItems,
  type MenuItem,
} from "@/data/menu";
import { formatMoney } from "@/lib/admin-orders";
import { nowInBoise, toISODate } from "@/lib/availability";

type Line = {
  key: string;
  item: MenuItem;
  quantity: number;
};

function newKey() {
  return `line-${Math.random().toString(36).slice(2, 10)}`;
}

const availableItems = menuItems.filter((item) => item.available);

export function NewOrderForm() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">(
    "pickup",
  );
  const [deliveryCity, setDeliveryCity] = useState("Boise");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [preferredDate, setPreferredDate] = useState(() =>
    toISODate(nowInBoise()),
  );
  const [preferredTimeWindow, setPreferredTimeWindow] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "venmo" | "zelle" | "square" | "undecided"
  >("cash");
  const [paid, setPaid] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [addItemId, setAddItemId] = useState(availableItems[0]?.id ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const subtotalCents = useMemo(
    () => lines.reduce((sum, line) => sum + line.item.priceCents * line.quantity, 0),
    [lines],
  );

  function addLine() {
    const item = availableItems.find((i) => i.id === addItemId);
    if (!item) return;
    setLines((prev) => {
      const existing = prev.find((l) => l.item.id === item.id);
      if (existing) {
        return prev.map((l) =>
          l.item.id === item.id
            ? { ...l, quantity: Math.min(99, l.quantity + 1) }
            : l,
        );
      }
      return [...prev, { key: newKey(), item, quantity: 1 }];
    });
  }

  async function submit(andPrint: boolean) {
    setError("");
    if (lines.length === 0) {
      setError("Add at least one menu item.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          phone,
          email,
          fulfillment,
          deliveryCity: fulfillment === "delivery" ? deliveryCity : undefined,
          deliveryAddress:
            fulfillment === "delivery" ? deliveryAddress : undefined,
          preferredDate,
          preferredTimeWindow,
          notes,
          paymentMethod,
          paymentStatus: paid ? "paid" : "unpaid",
          items: lines.map((l) => ({
            menuItemId: l.item.id,
            quantity: l.quantity,
          })),
        }),
      });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        setError(data.error || "Could not save that order.");
        return;
      }
      if (andPrint) {
        router.push(`/admin/orders/${data.id}/receipt?print=1`);
      } else {
        router.push(`/admin/orders/${data.id}`);
      }
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(false);
      }}
    >
      <p className="max-w-2xl text-sm text-muted">
        For Facebook, phone, or walk-in orders. Saves to the same kitchen board
        as website orders. Any date is allowed (specials included). Print a
        receipt after saving if they need a paper copy.
      </p>

      <section className="space-y-4 rounded-2xl bg-cream p-5 ring-1 ring-linen">
        <h2 className="font-display text-lg text-espresso">Customer</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-brown">Name *</span>
            <input
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-linen bg-white px-3 py-2.5"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-brown">Phone</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional for walk-in"
              className="mt-1 w-full rounded-xl border border-linen bg-white px-3 py-2.5"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-brown">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Optional — sends a confirmation if provided"
              className="mt-1 w-full rounded-xl border border-linen bg-white px-3 py-2.5"
            />
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-cream p-5 ring-1 ring-linen">
        <h2 className="font-display text-lg text-espresso">Fulfillment</h2>
        <div className="flex flex-wrap gap-2">
          {(["pickup", "delivery"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setFulfillment(opt)}
              className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${
                fulfillment === opt
                  ? "bg-espresso text-white"
                  : "bg-white text-brown ring-1 ring-linen"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-brown">Date *</span>
            <input
              type="date"
              required
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-linen bg-white px-3 py-2.5"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-brown">
              Time (within 1:00–5:00 PM)
            </span>
            <input
              value={preferredTimeWindow}
              onChange={(e) => setPreferredTimeWindow(e.target.value)}
              placeholder="e.g. after 2pm"
              className="mt-1 w-full rounded-xl border border-linen bg-white px-3 py-2.5"
            />
          </label>
        </div>
        {fulfillment === "delivery" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-brown">City *</span>
              <select
                value={deliveryCity}
                onChange={(e) => setDeliveryCity(e.target.value)}
                className="mt-1 w-full rounded-xl border border-linen bg-white px-3 py-2.5"
              >
                <option value="Boise">Boise</option>
                <option value="Meridian">Meridian</option>
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium text-brown">Street address *</span>
              <textarea
                required
                rows={2}
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="mt-1 w-full rounded-xl border border-linen bg-white px-3 py-2.5"
              />
            </label>
          </div>
        ) : null}
      </section>

      <section className="space-y-4 rounded-2xl bg-cream p-5 ring-1 ring-linen">
        <h2 className="font-display text-lg text-espresso">Items</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={addItemId}
            onChange={(e) => setAddItemId(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-linen bg-white px-3 py-2.5 text-sm"
          >
            {(["sourdough", "rolls"] as const).map((cat) => (
              <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
                {availableItems
                  .filter((item) => item.category === cat)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} — {formatPrice(item.priceCents)} /{" "}
                      {UNIT_LABELS[item.unitLabel]}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <button
            type="button"
            onClick={addLine}
            className="rounded-full bg-espresso px-4 py-2.5 text-sm font-semibold text-white"
          >
            Add item
          </button>
        </div>

        {lines.length === 0 ? (
          <p className="text-sm text-muted">No items yet.</p>
        ) : (
          <ul className="divide-y divide-linen rounded-xl bg-white ring-1 ring-linen">
            {lines.map((line) => (
              <li
                key={line.key}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-espresso">{line.item.name}</p>
                  <p className="text-xs text-muted">
                    {formatPrice(line.item.priceCents)} /{" "}
                    {UNIT_LABELS[line.item.unitLabel]}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <span className="text-muted">Qty</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={line.quantity}
                      onChange={(e) => {
                        const q = Math.min(
                          99,
                          Math.max(1, Math.floor(Number(e.target.value) || 1)),
                        );
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key ? { ...l, quantity: q } : l,
                          ),
                        );
                      }}
                      className="w-16 rounded-lg border border-linen px-2 py-1.5 tabular-nums"
                    />
                  </label>
                  <span className="w-20 text-right text-sm font-semibold tabular-nums text-espresso">
                    {formatMoney(line.item.priceCents * line.quantity)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setLines((prev) => prev.filter((l) => l.key !== line.key))
                    }
                    className="text-xs font-medium text-red-800 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-right text-lg font-semibold tabular-nums text-espresso">
          Total {formatMoney(subtotalCents)}
          <span className="ml-2 text-sm font-normal text-muted">No tax</span>
        </p>
      </section>

      <section className="space-y-4 rounded-2xl bg-cream p-5 ring-1 ring-linen">
        <h2 className="font-display text-lg text-espresso">Payment & notes</h2>
        <div className="flex flex-wrap gap-2">
          {(["cash", "venmo", "zelle", "square", "undecided"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setPaymentMethod(m)}
              className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${
                paymentMethod === m
                  ? "bg-espresso text-white"
                  : "bg-white text-brown ring-1 ring-linen"
              }`}
            >
              {m === "square" ? "Card / Apple Pay / Google Pay" : m}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={paid}
            onChange={(e) => setPaid(e.target.checked)}
            className="size-4 rounded border-linen"
          />
          Already paid
        </label>
        <label className="block text-sm">
          <span className="font-medium text-brown">Notes</span>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Facebook order, walk-in, hospital delivery"
            className="mt-1 w-full rounded-xl border border-linen bg-white px-3 py-2.5"
          />
        </label>
      </section>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-espresso px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save order"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void submit(true)}
          className="rounded-full bg-crust-dark px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          Save and print receipt
        </button>
      </div>
    </form>
  );
}
