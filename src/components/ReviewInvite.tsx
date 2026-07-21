import { BUSINESS } from "@/lib/constants";

type Variant = "footer" | "order" | "order-highlight";

type Props = {
  variant?: Variant;
  className?: string;
};

/**
 * Polite Google review invite — soft in the footer, warmer after a good order moment.
 */
export function ReviewInvite({ variant = "footer", className = "" }: Props) {
  const link = (
    <a
      href={BUSINESS.googleMapsReview}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-espresso underline decoration-crust/50 underline-offset-2 transition hover:text-crust-dark hover:decoration-crust-dark"
    >
      Google
    </a>
  );

  if (variant === "footer") {
    return (
      <p className={`text-sm text-muted ${className}`}>
        Enjoyed your bake? If you have a moment, a kind review on {link} means
        the world to our small kitchen.
      </p>
    );
  }

  const highlight = variant === "order-highlight";

  return (
    <div
      className={`rounded-2xl p-5 ring-1 sm:p-6 ${
        highlight
          ? "bg-wheat ring-crust/30"
          : "bg-cream ring-linen"
      } ${className}`}
    >
      <p className="text-xs font-semibold tracking-wide text-crust-dark uppercase">
        A small favor
      </p>
      <p className="mt-2 text-sm leading-relaxed text-brown sm:text-base">
        {highlight ? (
          <>
            If our bread brought a little joy to your table, would you mind
            leaving a short review on {link}? It helps neighbors find this
            cottage kitchen — only if you have a spare moment.
          </>
        ) : (
          <>
            When you&apos;ve had a chance to enjoy your order, would you mind
            leaving a short review on {link} if you have a spare moment? It
            truly helps our small bakery.
          </>
        )}
      </p>
      <a
        href={BUSINESS.googleMapsReview}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex rounded-full bg-crust-dark px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-espresso"
      >
        Leave a Google review
      </a>
    </div>
  );
}
