"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BUSINESS } from "@/lib/constants";

export function AdminShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-linen bg-cream">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold tracking-wide text-crust-dark uppercase">
              {BUSINESS.shortName} kitchen
            </p>
            <h1 className="font-display text-2xl text-espresso">{title}</h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
            <Link
              href="/admin"
              className="rounded-full px-3 py-2 text-sm text-muted hover:bg-wheat hover:text-espresso"
            >
              Orders
            </Link>
            <Link
              href="/admin/blocked-days"
              className="rounded-full px-3 py-2 text-sm text-muted hover:bg-wheat hover:text-espresso"
            >
              Blocked days
            </Link>
            <Link
              href="/"
              className="rounded-full px-3 py-2 text-sm text-muted hover:bg-wheat hover:text-espresso"
            >
              Storefront
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-full bg-espresso px-4 py-2 text-sm font-semibold text-white"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
    </div>
  );
}
