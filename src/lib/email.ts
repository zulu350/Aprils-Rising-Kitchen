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

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

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

export function isEmailConfigured(): boolean {
  return Boolean(env("SMTP_HOST") && env("SMTP_USER") && env("SMTP_PASS"));
}

function getTransporter() {
  const host = env("SMTP_HOST");
  const port = Number(env("SMTP_PORT") || "587");
  const secure = env("SMTP_SECURE") === "true" || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: env("SMTP_USER"),
      pass: env("SMTP_PASS"),
    },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
  });
}

/** Build a clean From: name + address (avoids double angle-brackets). */
function fromHeader(): { name: string; address: string } {
  const raw = env("SMTP_FROM");
  if (raw) {
    const angled = raw.match(/^(.*?)\s*<([^>]+)>\s*$/);
    if (angled) {
      const name = angled[1].replace(/^["']|["']$/g, "").trim();
      return {
        name: name || BUSINESS.name,
        address: angled[2].trim(),
      };
    }
    if (raw.includes("@") && !raw.includes(" ")) {
      return { name: BUSINESS.name, address: raw };
    }
  }
  const address = (env("SMTP_USER") || BUSINESS.email).replace(/^<|>$/g, "");
  return { name: BUSINESS.name, address };
}

function kitchenNotifyTo(): string {
  return env("ORDER_NOTIFY_EMAIL") || BUSINESS.email;
}

function siteBaseUrl(): string {
  const raw =
    env("NEXT_PUBLIC_SITE_URL") ||
    env("URL") || // Netlify deploy URL fallback
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
    "Payment: Cash, Venmo, or Zelle.",
    "Open your order page (link below) for Venmo/Zelle QR codes when you're ready to pay.",
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
 * Callers on serverless MUST await this so the process stays alive until SMTP finishes.
 */
export async function sendNewOrderEmails(
  order: OrderEmailPayload,
): Promise<{ kitchen: boolean; customer: boolean; skipReason?: string }> {
  if (!isEmailConfigured()) {
    const skipReason =
      "SMTP not configured (need SMTP_HOST, SMTP_USER, SMTP_PASS)";
    console.warn(`[email] ${skipReason} — order ${order.orderNumber}`);
    return { kitchen: false, customer: false, skipReason };
  }

  const result = { kitchen: false, customer: false };
  const transporter = getTransporter();
  const from = fromHeader();

  console.log(
    `[email] Sending for ${order.orderNumber} via ${env("SMTP_HOST")}:${env("SMTP_PORT") || "587"} from ${from.address} → kitchen ${kitchenNotifyTo()}`,
  );

  try {
    const info = await transporter.sendMail({
      from,
      to: kitchenNotifyTo(),
      ...(order.email ? { replyTo: order.email } : {}),
      subject: `New order ${order.orderNumber} — ${order.customerName}`,
      text: buildKitchenText(order),
    });
    result.kitchen = true;
    console.log(
      `[email] Kitchen OK ${order.orderNumber} messageId=${info.messageId ?? "?"}`,
    );
  } catch (err) {
    console.error(
      `[email] Kitchen FAILED ${order.orderNumber}:`,
      err instanceof Error ? err.message : err,
    );
  }

  const customerConfirmEnabled = env("EMAIL_CUSTOMER_CONFIRM") !== "false";
  if (customerConfirmEnabled && order.email) {
    try {
      const info = await transporter.sendMail({
        from,
        to: order.email,
        replyTo: kitchenNotifyTo(),
        subject: `We received your order ${order.orderNumber} — ${BUSINESS.name}`,
        text: buildCustomerText(order),
      });
      result.customer = true;
      console.log(
        `[email] Customer OK ${order.orderNumber} to=${order.email} messageId=${info.messageId ?? "?"}`,
      );
    } catch (err) {
      console.error(
        `[email] Customer FAILED ${order.orderNumber}:`,
        err instanceof Error ? err.message : err,
      );
    }
  } else if (!order.email) {
    console.log(
      `[email] Customer skipped ${order.orderNumber} (no customer email)`,
    );
  } else {
    console.log(
      `[email] Customer skipped ${order.orderNumber} (EMAIL_CUSTOMER_CONFIRM=false)`,
    );
  }

  return result;
}

export function emailStatusMessage(): string {
  return isEmailConfigured()
    ? "Email notifications are configured."
    : "Email notifications are off until SMTP_HOST, SMTP_USER, and SMTP_PASS are set.";
}
