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
  type AdminLineInput,
} from "@/lib/orders";
import {
  STAFF_PAYMENT_STATUS_ERROR,
  looksLikePaymentMethod,
  parseStaffPaymentMethodStored,
  staffPaymentMethodLabel,
  type StaffPaymentMethod,
} from "@/lib/staff-payment-method";

export type { StaffPaymentMethod } from "@/lib/staff-payment-method";

export type StaffOrderRow = {
  id: string;
  status: string;
  payment: "Paid" | "Unpaid";
  /** Venmo | Zelle | Square | Cash, or null if unset (undecided). */
  paymentMethod: string | null;
  /** apple_pay | google_pay | card when paid/chosen via Square; else null. */
  squareWallet: string | null;
  notes: string | null;
  preferredTimeWindow: string | null;
  total: number;
  deliveryFee: number;
  fulfillmentDate: string;
  fulfillmentType: "pickup" | "delivery";
  deliveryCity: string | null;
  deliveryAddress: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  placedAt: string;
  items: Array<{
    quantity: number;
    name: string;
    menuItemId: string;
    unitPrice: number;
    lineTotal: number;
  }>;
};

type OrderLike = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  squareWallet?: string | null;
  notes?: string | null;
  preferredTimeWindow?: string | null;
  totalCents: number;
  deliveryFeeCents?: number;
  preferredDate: string;
  fulfillment: string;
  deliveryCity?: string | null;
  deliveryAddress?: string | null;
  customerName: string;
  phone: string;
  email?: string | null;
  createdAt: Date;
  items: Array<{
    quantity: number;
    name: string;
    menuItemId?: string;
    unitPriceCents?: number;
    lineTotalCents?: number;
  }>;
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
    paymentMethod: staffPaymentMethodLabel(order.paymentMethod),
    squareWallet: order.squareWallet?.trim() || null,
    notes: staffText(order.notes),
    preferredTimeWindow: staffText(order.preferredTimeWindow),
    total: order.totalCents / 100,
    deliveryFee: (order.deliveryFeeCents ?? 0) / 100,
    fulfillmentDate: order.preferredDate,
    fulfillmentType: order.fulfillment === "delivery" ? "delivery" : "pickup",
    deliveryCity: staffText(order.deliveryCity),
    deliveryAddress: staffText(order.deliveryAddress),
    customerName: order.customerName,
    customerPhone: staffPhone(order.phone),
    customerEmail: staffEmail(order.email),
    placedAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      quantity: item.quantity,
      name: item.name,
      menuItemId: item.menuItemId ?? "",
      unitPrice: (item.unitPriceCents ?? 0) / 100,
      lineTotal: (item.lineTotalCents ?? 0) / 100,
    })),
  };
}

export function staffText(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed || null;
}

export function staffEmail(email: string | null | undefined): string | null {
  return staffText(email);
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
    return { ok: false, error: STAFF_PAYMENT_STATUS_ERROR };
  }
  const key = raw.trim().toLowerCase();
  if (key === "paid" || key === "unpaid") return { ok: true, value: key };
  if (looksLikePaymentMethod(raw)) {
    return { ok: false, error: STAFF_PAYMENT_STATUS_ERROR };
  }
  return { ok: false, error: STAFF_PAYMENT_STATUS_ERROR };
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

export function parseStaffPaymentMethod(
  raw: unknown,
): { ok: true; value: StaffPaymentMethod } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, value: "cash" };
  }
  return parseStaffPaymentMethodStored(raw);
}

/** PATCH: omitted is handled by caller; empty/null clears to undecided. */
export function parseStaffPaymentMethodPatch(
  raw: unknown,
): { ok: true; value: StaffPaymentMethod } | { ok: false; error: string } {
  return parseStaffPaymentMethodStored(raw);
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
    paymentMethod: string | null;
    items: Array<{
      menuItemId: string;
      name: string;
      unit: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>;
    subtotal: number;
    deliveryFee: number;
    total: number;
    notes: string | null;
    preferredTimeWindow: string | null;
    deliveryCity: string | null;
    deliveryAddress: string | null;
  };
};

function asString(raw: unknown): string {
  return typeof raw === "string" ? raw : "";
}

function staffUnitLabel(unitLabel: string): string {
  return UNIT_LABELS[unitLabel as keyof typeof UNIT_LABELS] ?? unitLabel;
}

export function parseStaffLine(
  raw: unknown,
): { ok: true; value: AdminLineInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      error:
        "Each item needs menuItemId and quantity, or custom: true with name and unitPrice.",
    };
  }
  const row = raw as {
    menuItemId?: unknown;
    id?: unknown;
    quantity?: unknown;
    custom?: unknown;
    name?: unknown;
    unitPrice?: unknown;
    unitPriceCents?: unknown;
    unitLabel?: unknown;
  };
  const quantity = Math.floor(Number(row.quantity));
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) {
    return { ok: false, error: "Each item needs a quantity from 1 to 99." };
  }
  const custom =
    row.custom === true || String(row.custom ?? "").toLowerCase() === "true";
  if (custom) {
    const name = asString(row.name).trim();
    if (!name) {
      return { ok: false, error: "Custom items need a name." };
    }
    return {
      ok: true,
      value: {
        custom: true,
        name,
        quantity,
        unitPrice:
          typeof row.unitPrice === "number" || typeof row.unitPrice === "string"
            ? row.unitPrice
            : undefined,
        unitPriceCents:
          typeof row.unitPriceCents === "number"
            ? row.unitPriceCents
            : undefined,
        unitLabel: asString(row.unitLabel).trim() || undefined,
      },
    };
  }
  const menuItemId = asString(row.menuItemId || row.id).trim();
  if (!menuItemId) {
    return {
      ok: false,
      error:
        "Each item needs menuItemId and quantity, or custom: true with name and unitPrice.",
    };
  }
  return { ok: true, value: { menuItemId, quantity } };
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
    return { ok: false, error: "Add at least one item." };
  }

  const items: AdminLineInput[] = [];
  for (const raw of body.items) {
    const parsed = parseStaffLine(raw);
    if (!parsed.ok) return parsed;
    items.push(parsed.value);
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
        menuItemId: line.menuItemId,
        name: line.name,
        unit: staffUnitLabel(line.unitLabel),
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
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
        paymentMethod: staffPaymentMethodLabel(method.value),
        items: result.lines.map((line) => ({
          menuItemId: line.menuItemId,
          name: line.name,
          unit: staffUnitLabel(line.unitLabel),
          quantity: line.quantity,
          unitPrice: line.unitPriceCents / 100,
          lineTotal: line.lineTotalCents / 100,
        })),
        subtotal: result.subtotalCents / 100,
        deliveryFee: feeCents / 100,
        total: totalCents / 100,
        notes: input.notes?.trim() || null,
        preferredTimeWindow: input.preferredTimeWindow?.trim() || null,
        deliveryCity: input.deliveryCity ?? null,
        deliveryAddress: input.deliveryAddress ?? null,
      },
    },
  };
}
