import {
  ORDER_STATUSES,
  STATUS_LABELS,
  isOrderStatus,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/admin-orders";
import { UNIT_LABELS } from "@/data/menu";
import { deliveryFeeCents } from "@/lib/delivery";
import {
  validateAdminCreateOrder,
  type AdminCreateOrderInput,
  type CartLineInput,
} from "@/lib/orders";

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

const PAYMENT_METHODS = [
  "cash",
  "venmo",
  "zelle",
  "square",
  "undecided",
] as const;

export type StaffPaymentMethod = (typeof PAYMENT_METHODS)[number];

export function parseStaffPaymentMethod(
  raw: unknown,
): { ok: true; value: StaffPaymentMethod } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, value: "cash" };
  }
  if (typeof raw !== "string") {
    return {
      ok: false,
      error: "paymentMethod must be cash, venmo, zelle, square, or undecided.",
    };
  }
  const key = raw.trim().toLowerCase();
  if ((PAYMENT_METHODS as readonly string[]).includes(key)) {
    return { ok: true, value: key as StaffPaymentMethod };
  }
  return {
    ok: false,
    error: "paymentMethod must be cash, venmo, zelle, square, or undecided.",
  };
}

export type StaffCreateBody = {
  customerName?: unknown;
  customerPhone?: unknown;
  items?: unknown;
  fulfillmentDate?: unknown;
  fulfillmentType?: unknown;
  payment?: unknown;
  paymentMethod?: unknown;
  notes?: unknown;
  deliveryCity?: unknown;
  deliveryAddress?: unknown;
  preferredTimeWindow?: unknown;
};

export type StaffCreateQuote = {
  input: AdminCreateOrderInput;
  lines: Array<{
    menuItemId: string;
    name: string;
    unit: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }>;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  preview: {
    customerName: string;
    customerPhone: string | null;
    fulfillmentType: "pickup" | "delivery";
    fulfillmentDate: string;
    payment: "Paid" | "Unpaid";
    paymentMethod: StaffPaymentMethod;
    items: Array<{
      menuItemId: string;
      name: string;
      unit: string;
      quantity: number;
      lineTotal: number;
    }>;
    subtotal: number;
    deliveryFee: number;
    total: number;
    notes: string | null;
    deliveryCity: string | null;
    deliveryAddress: string | null;
  };
};

function asString(raw: unknown): string {
  return typeof raw === "string" ? raw : "";
}

export function quoteStaffCreate(
  body: StaffCreateBody,
): { ok: true; quote: StaffCreateQuote } | { ok: false; error: string } {
  const fulfillmentType = asString(body.fulfillmentType).trim().toLowerCase();
  if (fulfillmentType !== "pickup" && fulfillmentType !== "delivery") {
    return { ok: false, error: "fulfillmentType must be pickup or delivery." };
  }

  const date = parseStaffDate(body.fulfillmentDate);
  if (!date.ok) return date;

  const payment = parseStaffPayment(body.payment);
  if (!payment.ok) return payment;

  const method = parseStaffPaymentMethod(body.paymentMethod);
  if (!method.ok) return method;

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return { ok: false, error: "Add at least one menu item." };
  }

  const items: CartLineInput[] = [];
  for (const raw of body.items) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: "Each item needs menuItemId and quantity." };
    }
    const row = raw as {
      menuItemId?: unknown;
      id?: unknown;
      quantity?: unknown;
    };
    const menuItemId = asString(row.menuItemId || row.id).trim();
    const quantity = Math.floor(Number(row.quantity));
    if (!menuItemId) {
      return { ok: false, error: "Each item needs menuItemId and quantity." };
    }
    items.push({ menuItemId, quantity });
  }

  let phoneValue = "";
  if (body.customerPhone !== undefined) {
    const parsed = parseStaffPhone(body.customerPhone);
    if (!parsed.ok) return parsed;
    phoneValue = parsed.value;
  }

  let notesValue: string | undefined;
  if (body.notes !== undefined) {
    const parsed = parseStaffNotes(body.notes);
    if (!parsed.ok) return parsed;
    notesValue = parsed.value ?? undefined;
  }

  const input: AdminCreateOrderInput = {
    customerName: asString(body.customerName),
    phone: phoneValue,
    fulfillment: fulfillmentType,
    preferredDate: date.value,
    notes: notesValue,
    paymentMethod: method.value,
    paymentStatus: payment.value,
    items,
    deliveryCity:
      fulfillmentType === "delivery"
        ? asString(body.deliveryCity).trim() || undefined
        : undefined,
    deliveryAddress:
      fulfillmentType === "delivery"
        ? asString(body.deliveryAddress).trim() || undefined
        : undefined,
    preferredTimeWindow: asString(body.preferredTimeWindow).trim() || undefined,
  };

  const result = validateAdminCreateOrder(input);
  if (!result.ok) return result;

  const feeCents = deliveryFeeCents(input.fulfillment, result.subtotalCents);
  const totalCents = result.subtotalCents + feeCents;

  return {
    ok: true,
    quote: {
      input,
      lines: result.lines.map((line) => ({
        menuItemId: line.item.id,
        name: line.item.name,
        unit: UNIT_LABELS[line.item.unitLabel],
        quantity: line.quantity,
        unitPriceCents: line.item.priceCents,
        lineTotalCents: line.lineTotalCents,
      })),
      subtotalCents: result.subtotalCents,
      deliveryFeeCents: feeCents,
      totalCents,
      preview: {
        customerName: input.customerName.trim(),
        customerPhone: staffPhone(result.phone),
        fulfillmentType: input.fulfillment,
        fulfillmentDate: result.preferredDate,
        payment: result.paymentStatus === "paid" ? "Paid" : "Unpaid",
        paymentMethod: method.value,
        items: result.lines.map((line) => ({
          menuItemId: line.item.id,
          name: line.item.name,
          unit: UNIT_LABELS[line.item.unitLabel],
          quantity: line.quantity,
          lineTotal: line.lineTotalCents / 100,
        })),
        subtotal: result.subtotalCents / 100,
        deliveryFee: feeCents / 100,
        total: totalCents / 100,
        notes: input.notes?.trim() || null,
        deliveryCity: input.deliveryCity ?? null,
        deliveryAddress: input.deliveryAddress ?? null,
      },
    },
  };
}
