import type { Metadata } from "next";
import { BUSINESS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-sm font-semibold tracking-wide text-crust-dark uppercase">
        Privacy
      </p>
      <h1 className="mt-2 font-display text-4xl text-espresso">
        How we use your information
      </h1>
      <p className="mt-6 max-w-xl leading-relaxed text-brown">
        We use your name, phone, email, and order details to fill the order and
        reach you about pickup or delivery. We do not sell your information.
      </p>
      <p className="mt-4 leading-relaxed text-brown">
        Questions:{" "}
        <a
          href={`mailto:${BUSINESS.email}`}
          className="font-medium text-espresso underline decoration-crust"
        >
          {BUSINESS.email}
        </a>
        .
      </p>
    </div>
  );
}
