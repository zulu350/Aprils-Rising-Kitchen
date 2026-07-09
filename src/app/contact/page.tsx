import type { Metadata } from "next";
import { BUSINESS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-sm font-semibold tracking-wide text-crust-dark uppercase">
        Stay in touch
      </p>
      <h1 className="mt-2 font-display text-4xl text-espresso">Contact</h1>
      <p className="mt-4 max-w-xl leading-relaxed text-brown">
        Questions, custom requests, or ready to order by phone? We&apos;re happy
        to help.
      </p>
      <ul className="mt-8 space-y-4 rounded-2xl bg-wheat p-6 ring-1 ring-linen">
        <li>
          <span className="block text-xs font-semibold tracking-wide text-muted uppercase">
            Phone / text
          </span>
          <a
            href={BUSINESS.phoneHref}
            className="text-2xl font-medium tracking-wide text-espresso tabular-nums hover:text-crust-dark"
          >
            {BUSINESS.phone}
          </a>
        </li>
        <li>
          <span className="block text-xs font-semibold tracking-wide text-muted uppercase">
            Email
          </span>
          <a
            href={`mailto:${BUSINESS.email}`}
            className="text-lg text-espresso hover:text-crust-dark"
          >
            {BUSINESS.email}
          </a>
        </li>
        <li>
          <span className="block text-xs font-semibold tracking-wide text-muted uppercase">
            Facebook
          </span>
          <a
            href={BUSINESS.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg text-espresso hover:text-crust-dark"
          >
            April&apos;s Rising Kitchen
          </a>
        </li>
        <li className="pt-2 text-sm text-muted">
          Delivery available in {BUSINESS.serviceArea}. Pickup during daylight
          hours by arrangement. Cash, Venmo, or Zelle accepted.
        </li>
      </ul>
    </div>
  );
}
