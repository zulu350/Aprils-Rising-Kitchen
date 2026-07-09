export const ORDER_STATUSES = [
  "new",
  "confirmed",
  "baking",
  "ready",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["unpaid", "paid"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: "New",
  confirmed: "Confirmed",
  baking: "Baking",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  new: "bg-amber-100 text-amber-900",
  confirmed: "bg-sky-100 text-sky-900",
  baking: "bg-orange-100 text-orange-900",
  ready: "bg-emerald-100 text-emerald-900",
  completed: "bg-stone-200 text-stone-700",
  cancelled: "bg-red-100 text-red-800",
};

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function isPaymentStatus(value: string): value is PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(value);
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
