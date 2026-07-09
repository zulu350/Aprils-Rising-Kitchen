"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BUSINESS } from "@/lib/constants";
import { useCart } from "@/lib/cart";

const links = [
  { href: "/menu", label: "Menu" },
  { href: "/cart", label: "Cart" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { itemCount } = useCart();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) return null;

  const navLinks = links.map((link) =>
    link.href === "/cart" && itemCount > 0
      ? { ...link, label: `Cart (${itemCount})` }
      : link,
  );

  return (
    <header className="sticky top-0 z-50 border-b border-linen/80 bg-cream/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-[4.5rem] sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-3"
          onClick={() => setOpen(false)}
        >
          <Image
            src="/images/logo.jpg"
            alt={`${BUSINESS.name} logo`}
            width={48}
            height={48}
            className="h-11 w-11 rounded-full object-cover ring-1 ring-crust/30 sm:h-12 sm:w-12"
            priority
          />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-lg font-semibold tracking-tight text-espresso sm:text-xl">
              {BUSINESS.name}
            </span>
            <span className="hidden text-xs text-muted sm:block">
              Boise, Idaho
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-wheat text-espresso"
                    : "text-brown hover:bg-wheat/70 hover:text-espresso"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/menu"
            className="ml-2 rounded-full bg-crust-dark px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-espresso"
          >
            Order now
          </Link>
        </nav>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-linen text-espresso md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Menu</span>
          <span className="flex flex-col gap-1.5">
            <span
              className={`block h-0.5 w-5 bg-espresso transition ${open ? "translate-y-2 rotate-45" : ""}`}
            />
            <span
              className={`block h-0.5 w-5 bg-espresso transition ${open ? "opacity-0" : ""}`}
            />
            <span
              className={`block h-0.5 w-5 bg-espresso transition ${open ? "-translate-y-2 -rotate-45" : ""}`}
            />
          </span>
        </button>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          className="border-t border-linen bg-cream px-4 py-4 md:hidden"
        >
          <ul className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-xl px-4 py-3 text-base font-medium text-espresso hover:bg-wheat"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <Link
                href="/menu"
                className="block rounded-full bg-crust-dark px-4 py-3 text-center text-sm font-semibold text-white"
                onClick={() => setOpen(false)}
              >
                Order now
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
