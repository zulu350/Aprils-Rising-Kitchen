import nodemailer from "nodemailer";
import { formatPrice } from "@/data/menu";
import { BUSINESS } from "@/lib/constants";

export type OrderEmailPayload = {
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
  paymentMethod: string;
  subtotalCents: number;
  totalCents: number;
  /** ISO timestamp when the order was placed */
  createdAt?: string;
  items: Array<{
    name: string;
    unitLabel: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }>;
};

function formatPlacedAt(iso?: string): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: BUSINESS.timezone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS,
  );
}

function getTransporter() {
  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT || "587");
  const secure =
    process.env.SMTP_SECURE === "true" || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/** Build a clean From: name + address (avoids double angle-brackets). */
function fromHeader(): { name: string; address: string } {
  const raw = process.env.SMTP_FROM?.trim();
  if (raw) {
    // Full form: Name <email@domain> or just <email@domain>
    const angled = raw.match(/^(.*?)\s*<([^>]+)>\s*$/);
    if (angled) {
      const name = angled[1].replace(/^["']|["']$/g, "").trim();
      return {
        name: name || BUSINESS.name,
        address: angled[2].trim(),
      };
    }
    // Bare email
    if (raw.includes("@") && !raw.includes(" ")) {
      return { name: BUSINESS.name, address: raw };
    }
  }
  const address = (
    process.env.SMTP_USER?.trim() ||
    BUSINESS.email
  ).replace(/^<|>$/g, "");
  return { name: BUSINESS.name, address };
}

function kitchenNotifyTo(): string {
  return (
    process.env.ORDER_NOTIFY_EMAIL?.trim() ||
    BUSINESS.email
  );
}

function siteBaseUrl(): string {
  // Prefer explicit public URL (custom domain on Netlify).
  // Set NEXT_PUBLIC_SITE_URL=https://www.aprilsrisingkitchen.com in Netlify env,
  // then redeploy — used in "View your order" / admin links in emails.
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.URL?.trim() || // Netlify deploy URL (fallback)
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

function itemsListText(order: OrderEmailPayload): string {
  return order.items
    .map(
      (item) =>
        `  • ${item.quantity}× ${item.name} (${item.unitLabel}) — ${formatPrice(item.lineTotalCents)}`,
    )
    .join("\n");
}

function fulfillmentText(order: OrderEmailPayload): string {
  if (order.fulfillment === "delivery") {
    const addr = [order.deliveryAddress, order.deliveryCity]
      .filter(Boolean)
      .join(", ");
    return `Delivery\n  ${addr}`;
  }
  return "Pickup (daylight hours; address shared with customer on confirmation)";
}

function buildKitchenText(order: OrderEmailPayload): string {
  const adminUrl = `${siteBaseUrl()}/admin/orders/${order.id}`;
  return [
    `New order ${order.orderNumber}`,
    "",
    `Customer: ${order.customerName}`,
    `Email: ${order.email || "(not provided)"}`,
    `Phone: ${order.phone}`,
    order.createdAt
      ? `Placed: ${formatPlacedAt(order.createdAt)} (${BUSINESS.timezone})`
      : null,
    "",
    `Preferred date: ${order.preferredDate}`,
    order.preferredTimeWindow
      ? `Time window: ${order.preferredTimeWindow}`
      : null,
    `Fulfillment: ${fulfillmentText(order)}`,
    `Payment preference: ${order.paymentMethod}`,
    "",
    "Items:",
    itemsListText(order),
    "",
    `Total: ${formatPrice(order.totalCents)} (no tax)`,
    order.notes ? `\nNotes: ${order.notes}` : null,
    "",
    `Open in kitchen: ${adminUrl}`,
    "",
    `— ${BUSINESS.name}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function buildCustomerText(order: OrderEmailPayload): string {
  const confirmUrl = `${siteBaseUrl()}/order/${order.orderNumber}`;
  const placed = formatPlacedAt(order.createdAt);
  return [
    `Hi ${order.customerName},`,
    "",
    `Thank you for ordering from ${BUSINESS.name}! We received your order and will confirm availability and timing soon.`,
    "",
    `Order number: ${order.orderNumber}`,
    placed ? `Order placed: ${placed} (${BUSINESS.timezone})` : null,
    `Preferred date: ${order.preferredDate}`,
    order.preferredTimeWindow
      ? `Time window: ${order.preferredTimeWindow}`
      : null,
    `Fulfillment: ${order.fulfillment}`,
    "",
    "Items:",
    itemsListText(order),
    "",
    `Total: ${formatPrice(order.totalCents)}`,
    "",
    "Payment: Cash, Venmo, or Zelle — details when we confirm.",
    "",
    `View your order: ${confirmUrl}`,
    "",
    `Questions? Call or text ${BUSINESS.phone} or email ${BUSINESS.email}.`,
    "",
    `With care,`,
    BUSINESS.name,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/**
 * Sends kitchen + customer emails for a new order.
 * Never throws — order creation must succeed even if mail fails.
 * No-ops with a console warning when SMTP is not configured.
 */
export async function sendNewOrderEmails(
  order: OrderEmailPayload,
): Promise<{ kitchen: boolean; customer: boolean }> {
  if (!isEmailConfigured()) {
    console.warn(
      `[email] SMTP not configured — skipped notify for ${order.orderNumber}. Set SMTP_HOST, SMTP_USER, SMTP_PASS.`,
    );
    return { kitchen: false, customer: false };
  }

  const result = { kitchen: false, customer: false };
  const transporter = getTransporter();
  const from = fromHeader();

  try {
    await transporter.sendMail({
      from,
      to: kitchenNotifyTo(),
      ...(order.email ? { replyTo: order.email } : {}),
      subject: `New order ${order.orderNumber} — ${order.customerName}`,
      text: buildKitchenText(order),
    });
    result.kitchen = true;
  } catch (err) {
    console.error(`[email] Kitchen notify failed for ${order.orderNumber}:`, err);
  }

  const sendCustomer =
    process.env.EMAIL_CUSTOMER_CONFIRM !== "false" && Boolean(order.email);
  if (sendCustomer) {
    try {
      await transporter.sendMail({
        from,
        to: order.email,
        replyTo: kitchenNotifyTo(),
        subject: `We received your order ${order.orderNumber} — ${BUSINESS.name}`,
        text: buildCustomerText(order),
      });
      result.customer = true;
    } catch (err) {
      console.error(
        `[email] Customer confirm failed for ${order.orderNumber}:`,
        err,
      );
    }
  }

  return result;
}

export function emailStatusMessage(): string {
  return isEmailConfigured()
    ? "Email notifications are configured."
    : "Email notifications are off until SMTP_HOST, SMTP_USER, and SMTP_PASS are set.";
}
