"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatPrice } from "@/data/menu";

type SquareConfig = {
  configured: boolean;
  applicationId: string;
  locationId: string;
  environment: "sandbox" | "production";
  webSdkUrl: string;
};

type TokenResult = {
  status: string;
  token?: string;
};

type SquarePayments = {
  card: (opts?: object) => Promise<{
    attach: (selector: string) => Promise<void>;
    tokenize: () => Promise<TokenResult>;
    destroy?: () => Promise<void>;
  }>;
  applePay: (req: unknown) => Promise<{
    tokenize: () => Promise<TokenResult>;
  }>;
  googlePay: (req: unknown) => Promise<{
    attach: (selector: string) => Promise<void>;
    tokenize: () => Promise<TokenResult>;
  }>;
  paymentRequest: (opts: object) => unknown;
  verifyBuyer?: (
    token: string,
    details: object,
  ) => Promise<{ token?: string } | null>;
};

declare global {
  interface Window {
    Square?: {
      payments: (
        appId: string,
        locId: string,
      ) => Promise<SquarePayments> | SquarePayments;
    };
  }
}

function randomKey() {
  return crypto.randomUUID();
}

export function SquarePayPanel({
  orderNumber,
  accessToken,
  amountCents,
  onPaid,
}: {
  orderNumber: string;
  accessToken: string;
  amountCents: number;
  onPaid: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [sandbox, setSandbox] = useState(false);
  const paymentsRef = useRef<SquarePayments | null>(null);
  const cardRef = useRef<Awaited<
    ReturnType<SquarePayments["card"]>
  > | null>(null);
  const appleRef = useRef<Awaited<
    ReturnType<SquarePayments["applePay"]>
  > | null>(null);
  const googleRef = useRef<Awaited<
    ReturnType<SquarePayments["googlePay"]>
  > | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        const cfgRes = await fetch("/api/payments/square/config");
        const cfg = (await cfgRes.json()) as SquareConfig & { error?: string };
        if (!cfgRes.ok || !cfg.configured) {
          throw new Error(
            cfg.error || "Card / Apple Pay is not available right now.",
          );
        }
        if (cancelled) return;
        setSandbox(cfg.environment === "sandbox");

        await loadScript(cfg.webSdkUrl);
        if (cancelled || !window.Square) {
          throw new Error("Could not load Square payment form.");
        }

        const payments = await window.Square.payments(
          cfg.applicationId,
          cfg.locationId,
        );
        paymentsRef.current = payments;

        const card = await payments.card({
          style: {
            ".input-container": {
              borderColor: "#ebe2d4",
              borderRadius: "12px",
            },
            ".input-container.is-focus": {
              borderColor: "#c8956c",
            },
            input: { color: "#2c2416" },
          },
        });
        await card.attach("#ark-square-card");
        cardRef.current = card;

        const request = payments.paymentRequest({
          countryCode: "US",
          currencyCode: "USD",
          total: {
            amount: (amountCents / 100).toFixed(2),
            label: `Order ${orderNumber}`,
          },
        });

        try {
          const apple = await payments.applePay(request);
          appleRef.current = apple;
          if (!cancelled) setAppleAvailable(true);
        } catch {
          // Not Safari / domain not registered / desktop Chrome
        }

        try {
          const google = await payments.googlePay(request);
          await google.attach("#ark-square-google");
          googleRef.current = google;
        } catch {
          // Google Pay not available in this browser
        }

        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load card payments.",
          );
        }
      }
    }

    void setup();
    return () => {
      cancelled = true;
      void cardRef.current?.destroy?.();
    };
  }, [amountCents, orderNumber]);

  const charge = useCallback(
    async (sourceId: string, verificationToken?: string) => {
      const res = await fetch("/api/payments/square", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber,
          accessToken,
          sourceId,
          verificationToken,
          idempotencyKey: randomKey(),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        alreadyPaid?: boolean;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Payment failed. Please try again.");
      }
      onPaid();
    },
    [accessToken, onPaid, orderNumber],
  );

  async function payWithCard() {
    if (!cardRef.current || !paymentsRef.current) return;
    setPaying(true);
    setError("");
    try {
      const tokenResult = await cardRef.current.tokenize();
      if (tokenResult.status !== "OK" || !tokenResult.token) {
        throw new Error("Please check the card details and try again.");
      }
      let verificationToken: string | undefined;
      try {
        const verified = await paymentsRef.current.verifyBuyer?.(
          tokenResult.token,
          {
            amount: (amountCents / 100).toFixed(2),
            currencyCode: "USD",
            intent: "CHARGE",
          },
        );
        verificationToken = verified?.token;
      } catch {
        // SCA not required in many US sandbox/production cases
      }
      await charge(tokenResult.token, verificationToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setPaying(false);
    }
  }

  async function payWithWallet(kind: "apple" | "google") {
    const method =
      kind === "apple" ? appleRef.current : googleRef.current;
    if (!method) return;
    setPaying(true);
    setError("");
    try {
      const tokenResult = await method.tokenize();
      if (tokenResult.status !== "OK" || !tokenResult.token) {
        throw new Error("Payment was cancelled.");
      }
      await charge(tokenResult.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="rounded-2xl bg-wheat p-5 ring-1 ring-linen sm:p-6">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">
        Pay with card or Apple Pay
      </p>
      <p className="mt-1 text-sm text-brown">
        Amount due{" "}
        <span className="font-semibold tabular-nums text-espresso">
          {formatPrice(amountCents)}
        </span>
        . Processed securely by Square.
      </p>
      {sandbox ? (
        <p className="mt-2 text-xs text-amber-900">
          Test mode: use Square test card 4111 1111 1111 1111, any future date,
          CVV 111. No real charge.
        </p>
      ) : null}

      {appleAvailable ? (
        <button
          type="button"
          disabled={paying || !ready}
          onClick={() => void payWithWallet("apple")}
          className="mt-4 flex h-11 w-full items-center justify-center rounded-lg bg-black text-sm font-semibold text-white disabled:opacity-50"
        >
          Pay with Apple Pay
        </button>
      ) : null}

      <div id="ark-square-google" className="mt-3 min-h-0" />

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-muted">
          Or enter a card
        </p>
        <div id="ark-square-card" className="min-h-[90px]" />
        <button
          type="button"
          disabled={paying || !ready}
          onClick={() => void payWithCard()}
          className="mt-3 w-full rounded-full bg-espresso px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {paying ? "Processing…" : `Pay ${formatPrice(amountCents)}`}
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-muted">
        Prefer Venmo, Zelle, or cash instead? Call or text us and we&apos;ll
        help switch.
      </p>
    </div>
  );
}

function loadScript(src: string): Promise<void> {
  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("Could not load Square."));
    document.head.appendChild(el);
  });
}
