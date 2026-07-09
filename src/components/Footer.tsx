"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BUSINESS } from "@/lib/constants";

export function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <footer className="mt-auto border-t border-linen bg-wheat">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <Image
              src="/images/logo.jpg"
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 rounded-full object-cover ring-1 ring-crust/30"
            />
            <div>
              <p className="font-display text-xl font-semibold text-espresso">
                {BUSINESS.name}
              </p>
              <p className="text-sm text-muted">Cottage bakery · Idaho</p>
            </div>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-brown">
            Naturally leavened sourdough and Filipino-inspired rolls, handcrafted
            in small batches with organic ingredients and plenty of love.
          </p>
        </div>

        <div>
          <h3 className="mb-3 font-display text-lg text-espresso">Order</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/menu" className="hover:text-crust-dark">
                Menu
              </Link>
            </li>
            <li>
              <Link href="/cart" className="hover:text-crust-dark">
                Cart
              </Link>
            </li>
            <li>
              <Link href="/checkout" className="hover:text-crust-dark">
                Checkout
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 font-display text-lg text-espresso">Contact</h3>
          <ul className="space-y-2 text-sm text-brown">
            <li>
              <a href={BUSINESS.phoneHref} className="hover:text-crust-dark">
                {BUSINESS.phone}
              </a>
              <span className="text-muted"> · call or text</span>
            </li>
            <li>
              <a
                href={`mailto:${BUSINESS.email}`}
                className="hover:text-crust-dark"
              >
                {BUSINESS.email}
              </a>
            </li>
            <li>
              <a
                href={BUSINESS.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-crust-dark"
              >
                Facebook
              </a>
            </li>
            <li className="pt-2 text-muted">
              Delivery in {BUSINESS.serviceArea}
            </li>
            <li className="text-muted">Cash · Venmo · Zelle</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-linen/80 py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} {BUSINESS.name}. Cottage bakery · Idaho.
        All rights reserved.
      </div>
    </footer>
  );
}
