import Image from "next/image";
import { PAYMENT, showsPaymentQr } from "@/lib/payment";

type Props = {
  method: string | null | undefined;
  /** Extra classes on the outer card */
  className?: string;
  compact?: boolean;
  /**
   * When true (or method is undecided), show both Venmo and Zelle with guidance.
   * Used on the order confirmation page for "decide later".
   */
  showBothWhenUndecided?: boolean;
};

function QrCard({
  method,
  size,
}: {
  method: "venmo" | "zelle";
  size: number;
}) {
  const info = method === "venmo" ? PAYMENT.venmo : PAYMENT.zelle;

  return (
    <div className="rounded-2xl bg-wheat p-4 ring-1 ring-linen sm:p-5">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">
        Pay with {info.label}
      </p>
      <p className="mt-1 text-sm text-brown">
        Scan with your phone
        {method === "venmo" ? (
          <>
            {" "}
            —{" "}
            <span className="font-medium text-espresso">
              {PAYMENT.venmo.name}
            </span>
            {" · "}
            <span className="font-medium text-espresso">
              {PAYMENT.venmo.handle}
            </span>
          </>
        ) : (
          <>
            {" "}
            —{" "}
            <span className="font-medium text-espresso">
              {PAYMENT.zelle.name}
            </span>
            {" · "}
            <span className="font-medium text-espresso tabular-nums">
              {PAYMENT.zelle.detail}
            </span>
          </>
        )}
      </p>
      <div className="mt-4 flex justify-center">
        <div className="overflow-hidden rounded-xl bg-white p-2 shadow-sm ring-1 ring-linen">
          <Image
            src={info.qrSrc}
            alt={info.qrAlt}
            width={size}
            height={size}
            className="h-auto w-full max-w-[220px] object-contain"
            priority={false}
          />
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted">
        Tip: screenshot this code to keep it handy
      </p>
    </div>
  );
}

/**
 * Venmo/Zelle QR panels.
 * - venmo / zelle: one panel
 * - undecided + showBothWhenUndecided: both panels + guidance
 * - cash / undecided without flag: nothing
 */
export function PaymentQrPanel({
  method,
  className = "",
  compact,
  showBothWhenUndecided,
}: Props) {
  const size = compact ? 180 : 220;

  if (showsPaymentQr(method)) {
    return (
      <div className={className}>
        <QrCard method={method} size={size} />
      </div>
    );
  }

  if (showBothWhenUndecided && (method === "undecided" || !method)) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="rounded-2xl bg-cream p-4 ring-1 ring-linen sm:p-5">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            Ready to pay?
          </p>
          <p className="mt-2 text-sm leading-relaxed text-brown">
            You chose to decide later — that&apos;s fine. When you&apos;re ready,
            scan <strong className="font-medium text-espresso">Venmo</strong> or{" "}
            <strong className="font-medium text-espresso">Zelle</strong> below,
            or pay cash at pickup/delivery. Include your order number in the
            payment note if you can.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <QrCard method="venmo" size={size} />
          <QrCard method="zelle" size={size} />
        </div>
      </div>
    );
  }

  return null;
}
