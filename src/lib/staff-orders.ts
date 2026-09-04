import {
  ORDER_STATUSES,
  STATUS_LABELS,
  isOrderStatus,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/admin-orders";

export type StaffOrderRow = {
  id: string;
  status: string;
  payment: "Paid" | "Unpaid";
  total: number;
  fulfillmentDate: string;
  fulfillmentType: "pickup" | "delivery";
  customerName: string;
  customerPhone: string | null;
  placedAt: string;
  items: Array<{ quantity: number; name: string }>;
};

type OrderLike = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalCents: number;
  preferredDate: string;
  fulfillment: string;
  customerName: string;
  phone: string;
  createdAt: Date;
  items: Array<{ quantity: number; name: string }>;
};

export function staffPhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed || trimmed === "—") return null;
  return trimmed;
}

export function toStaffOrderRow(order: OrderLike): StaffOrderRow {
  return {
    id: order.orderNumber,
    status: isOrderStatus(order.status)
      ? STATUS_LABELS[order.status]
      : order.status,
    payment: order.paymentStatus === "paid" ? "Paid" : "Unpaid",
    total: order.totalCents / 100,
    fulfillmentDate: order.preferredDate,
    fulfillmentType: order.fulfillment === "delivery" ? "delivery" : "pickup",
    customerName: order.customerName,
    customerPhone: staffPhone(order.phone),
    placedAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      quantity: item.quantity,
      name: item.name,
    })),
  };
}

const STATUS_BY_LABEL = Object.fromEntries(
  ORDER_STATUSES.map((status) => [STATUS_LABELS[status].toLowerCase(), status]),
) as Record<string, OrderStatus>;

export function parseStaffStatus(
  raw: unknown,
): { ok: true; value: OrderStatus } | { ok: false; error: string } {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, error: "status must be a kitchen status." };
  }
  const key = raw.trim().toLowerCase();
  if (isOrderStatus(key)) return { ok: true, value: key };
  const fromLabel = STATUS_BY_LABEL[key];
  if (fromLabel) return { ok: true, value: fromLabel };
  return {
    ok: false,
    error:
      "status must be New, Confirmed, Baking, Ready, Completed, or Cancelled.",
  };
}

export function parseStaffPayment(
  raw: unknown,
): { ok: true; value: PaymentStatus } | { ok: false; error: string } {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, error: "payment must be Paid or Unpaid." };
  }
  const key = raw.trim().toLowerCase();
  if (key === "paid" || key === "unpaid") return { ok: true, value: key };
  return { ok: false, error: "payment must be Paid or Unpaid." };
}

export function parseStaffDate(
  raw: unknown,
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, error: "fulfillmentDate must be YYYY-MM-DD." };
  }
  const value = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { ok: false, error: "fulfillmentDate must be YYYY-MM-DD." };
  }
  return { ok: true, value };
}

export function parseStaffPhone(
  raw: unknown,
): { ok: true; value: string } | { ok: false; error: string } {
  if (raw === null) return { ok: true, value: "—" };
  if (typeof raw !== "string") {
    return { ok: false, error: "customerPhone must be a string or null." };
  }
  const trimmed = raw.trim();
  return { ok: true, value: trimmed || "—" };
}

export function parseStaffNotes(
  raw: unknown,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === null) return { ok: true, value: null };
  if (typeof raw !== "string") {
    return { ok: false, error: "notes must be a string or null." };
  }
  return { ok: true, value: raw.trim() || null };
}
