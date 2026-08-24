"use client";

import { useEffect } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/admin-orders";
import { formatDateLabel } from "@/lib/availability";
import { BUSINESS } from "@/lib/constants";

export type ReceiptOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  email: string;
  fulfillment: string;
  deliveryCity: string | null;
  deliveryAddress: string | null;
  preferredDate: string;
  preferredTimeWindow: string | null;
  notes: string | null;
  paymentMethod: string;
  paymentStatus: string;
  subtotalCents: number;
  adjustmentCents: number;
  adjustmentLabel: string | null;
  totalCents: number;
  createdAt: string;
  items: Array<{
    name: string;
    unitLabel: string;
    unitPriceCents: number;
    quantity: number;
    lineTotalCents: number;
  }>;
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  venmo: "Venmo",
  zelle: "Zelle",
  square: "Card / Apple Pay",
  undecided: "To be decided",
};

function formatPlaced(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      timeZone: BUSINESS.timezone,
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function ReceiptPrint({
  order,
  autoPrint = false,
}: {
  order: ReceiptOrder;
  autoPrint?: boolean;
}) {
  useEffect(() => {
    if (!autoPrint) return;
    const t = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(t);
  }, [autoPrint]);

  const paid = order.paymentStatus === "paid";

  return (
    <div className="min-h-screen bg-wheat text-espresso print:bg-white">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-4 print:hidden">
        <Link
          href={`/admin/orders/${order.id}`}
          className="text-sm font-medium text-muted hover:text-espresso"
        >
          ← Back to order
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full bg-espresso px-5 py-2 text-sm font-semibold text-white"
        >
          Print
        </button>
      </div>

      <article className="receipt mx-auto mb-10 max-w-xl bg-white px-8 py-8 text-black shadow-sm ring-1 ring-linen print:mb-0 print:max-w-none print:px-0 print:py-0 print:shadow-none print:ring-0">
        <header className="border-b border-stone-300 pb-3 text-center">
          <p className="font-display text-3xl text-espresso">{BUSINESS.name}</p>
          <p className="mt-1 text-sm text-stone-600">{BUSINESS.tagline}</p>
          <p className="mt-1 text-sm text-stone-600">
            {BUSINESS.phone} · aprilsrisingkitchen.com
          </p>
        </header>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
              Receipt {order.orderNumber}
            </p>
          </div>
          <div className="text-right text-sm">
            {paid ? <p className="font-medium">PAID</p> : null}
            <p className="text-stone-600">Placed {formatPlaced(order.createdAt)}</p>
          </div>
        </div>

        <section className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
              Customer
            </p>
            <p className="font-medium">{order.customerName}</p>
            {order.phone && order.phone !== "—" ? <p>{order.phone}</p> : null}
            {order.email ? <p>{order.email}</p> : null}
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
              {order.fulfillment === "delivery" ? "Delivery" : "Pickup"}
            </p>
            <p className="text-base font-semibold">
              {formatDateLabel(order.preferredDate)}
            </p>
            {order.preferredTimeWindow ? (
              <p>{order.preferredTimeWindow}</p>
            ) : (
              <p>{BUSINESS.fulfillmentHours}</p>
            )}
            {order.fulfillment === "delivery" ? (
              <p className="mt-1">
                {order.deliveryAddress}
                {order.deliveryCity ? `, ${order.deliveryCity}` : ""}
              </p>
            ) : (
              <p className="mt-1">Pickup — address shared with customer</p>
            )}
          </div>
        </section>

        <table className="mt-5 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-stone-300 text-left text-xs tracking-wide text-stone-500 uppercase">
              <th className="py-2 pr-2 font-semibold">Item</th>
              <th className="py-2 pr-2 text-right font-semibold">Qty</th>
              <th className="py-2 pr-2 text-right font-semibold">Each</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={`${item.name}-${i}`} className="border-b border-stone-200">
                <td className="py-2 pr-2">
                  {item.name}
                  <span className="block text-xs text-stone-500">
                    {item.unitLabel}
                  </span>
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">
                  {item.quantity}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">
                  {formatMoney(item.unitPriceCents)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatMoney(item.lineTotalCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto w-56 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatMoney(order.subtotalCents)}</span>
          </div>
          {order.adjustmentCents !== 0 ? (
            <div className="flex justify-between">
              <span>{order.adjustmentLabel || "Adjustment"}</span>
              <span className="tabular-nums">
                {order.adjustmentCents > 0 ? "+" : ""}
                {formatMoney(order.adjustmentCents)}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between text-stone-600">
            <span>Tax</span>
            <span>None</span>
          </div>
          <div className="flex justify-between border-t border-stone-300 pt-2 text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatMoney(order.totalCents)}</span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Payment</span>
            <span>
              {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
              {paid ? " · Paid" : ""}
            </span>
          </div>
        </div>

        {order.notes ? (
          <p className="mt-6 text-sm text-stone-600">
            <span className="font-semibold text-stone-700">Notes: </span>
            {order.notes}
          </p>
        ) : null}

        <footer className="receipt-footer mt-8 border-t border-stone-300 pt-4 text-sm text-stone-600">
          <p className="text-center">
            Thank you for supporting our cottage bakery.
          </p>
          <p className="mt-1 text-center">
            Questions? Call or text {BUSINESS.phone}.
          </p>
          <div className="mt-5 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/google-review-qr.svg"
              alt="QR code to leave a Google review"
              width={96}
              height={96}
              className="size-24 shrink-0"
            />
            <p className="leading-relaxed">
              Enjoyed your bake? Scan for a Google review, or search{" "}
              <span className="font-medium text-stone-800">
                April&apos;s Rising Kitchen
              </span>{" "}
              in Google Maps.
            </p>
          </div>
        </footer>
      </article>

      <style>{`
        @media print {
          @page {
            size: letter;
            margin: 0.55in;
          }
          html,
          body {
            background: white !important;
          }
          .receipt-footer {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          table tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
