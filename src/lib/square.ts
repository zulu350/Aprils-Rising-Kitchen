import { createHmac, timingSafeEqual } from "node:crypto";

export function squareConfig() {
  const environment = (process.env.SQUARE_ENVIRONMENT ?? "sandbox")
    .trim()
    .toLowerCase();
  const isSandbox = environment !== "production";
  return {
    isSandbox,
    environment: isSandbox ? ("sandbox" as const) : ("production" as const),
    applicationId: (process.env.SQUARE_APPLICATION_ID ?? "").trim(),
    locationId: (process.env.SQUARE_LOCATION_ID ?? "").trim(),
    accessToken: (process.env.SQUARE_ACCESS_TOKEN ?? "").trim(),
    webhookSignatureKey: (
      process.env.SQUARE_WEBHOOK_SIGNATURE_KEY ?? ""
    ).trim(),
    baseUrl: isSandbox
      ? "https://connect.squareupsandbox.com"
      : "https://connect.squareup.com",
    webSdkUrl: isSandbox
      ? "https://sandbox.web.squarecdn.com/v1/square.js"
      : "https://web.squarecdn.com/v1/square.js",
  };
}

export function isSquareConfigured(): boolean {
  const c = squareConfig();
  return Boolean(c.applicationId && c.locationId && c.accessToken);
}

type SquareMoney = { amount: number; currency: string };

type SquarePayment = {
  id?: string;
  status?: string;
  amount_money?: SquareMoney;
  reference_id?: string;
  note?: string;
};

type SquareErrorBody = {
  errors?: Array<{ detail?: string; code?: string; field?: string }>;
  payment?: SquarePayment;
};

export async function createSquarePayment(input: {
  sourceId: string;
  amountCents: number;
  orderNumber: string;
  idempotencyKey: string;
  verificationToken?: string;
  buyerEmail?: string;
}): Promise<
  | { ok: true; payment: SquarePayment }
  | { ok: false; error: string; status: number }
> {
  const c = squareConfig();
  if (!isSquareConfigured()) {
    return { ok: false, error: "Square is not configured.", status: 503 };
  }

  const body: Record<string, unknown> = {
    source_id: input.sourceId,
    idempotency_key: input.idempotencyKey,
    amount_money: {
      amount: input.amountCents,
      currency: "USD",
    },
    location_id: c.locationId,
    reference_id: input.orderNumber,
    note: `${input.orderNumber} · April's Rising Kitchen`,
    autocomplete: true,
  };
  if (input.verificationToken) {
    body.verification_token = input.verificationToken;
  }
  if (input.buyerEmail) {
    body.buyer_email_address = input.buyerEmail;
  }

  const res = await fetch(`${c.baseUrl}/v2/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${c.accessToken}`,
      "Square-Version": "2025-08-20",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as SquareErrorBody;
  if (!res.ok) {
    const detail =
      json.errors?.map((e) => e.detail).filter(Boolean).join(" ") ||
      "Square could not process that payment.";
    console.error("Square CreatePayment failed:", res.status, json.errors);
    return { ok: false, error: detail, status: 400 };
  }

  const payment = json.payment ?? {};
  const status = payment.status ?? "";
  if (status !== "COMPLETED" && status !== "APPROVED") {
    return {
      ok: false,
      error: `Payment status is ${status || "unknown"}. Please try again or use Venmo, Zelle, or cash.`,
      status: 400,
    };
  }

  return { ok: true, payment };
}

/** Square webhook: HMAC-SHA256 of notificationUrl + raw body, base64. */
export function verifySquareWebhookSignature(input: {
  signatureHeader: string;
  notificationUrl: string;
  body: string;
}): boolean {
  const key = squareConfig().webhookSignatureKey;
  if (!key || !input.signatureHeader) return false;
  const hmac = createHmac("sha256", key);
  hmac.update(input.notificationUrl + input.body);
  const digest = Buffer.from(hmac.digest("base64"));
  const given = Buffer.from(input.signatureHeader);
  if (digest.length !== given.length) return false;
  return timingSafeEqual(digest, given);
}
