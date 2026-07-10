"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CATEGORY_LABELS,
  UNIT_LABELS,
  formatPrice,
  menuItems,
  type MenuCategory,
  type MenuItem,
} from "@/data/menu";
import { useCart } from "@/lib/cart";

const CATEGORIES: MenuCategory[] = ["sourdough", "rolls"];

function MenuItemRow({ item }: { item: MenuItem }) {
  const { addItem, lines } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const inCart = lines.find((l) => l.menuItemId === item.id)?.quantity ?? 0;

  function handleAdd() {
    addItem(item.id, 1);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);
  }

  return (
    <li className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-linen sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="font-display text-xl text-espresso">{item.name}</h3>
          <span className="text-sm font-semibold text-crust-dark">
            {formatPrice(item.priceCents)}
            <span className="font-normal text-muted">
              {" "}
              / {UNIT_LABELS[item.unitLabel]}
            </span>
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">
          Pre-order at least {item.leadTimeHours} hours ahead
          {inCart > 0 ? (
            <span className="text-sage-dark"> · {inCart} in cart</span>
          ) : null}
        </p>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
          justAdded
            ? "bg-sage-dark text-white"
            : "bg-crust-dark text-white hover:bg-espresso"
        }`}
      >
        {justAdded ? "Added" : "Add to cart"}
      </button>
    </li>
  );
}

export function MenuClient() {
  const { itemCount, subtotalCents } = useCart();
  const [filter, setFilter] = useState<MenuCategory | "all">("all");

  const grouped = useMemo(() => {
    const cats =
      filter === "all" ? CATEGORIES : CATEGORIES.filter((c) => c === filter);
    return cats.map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      items: menuItems.filter(
        (i) => i.category === category && i.available,
      ),
    }));
  }, [filter]);

  return (
    <div className="pb-28">
      <div className="border-b border-linen bg-wheat">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
          <p className="text-sm font-semibold tracking-wide text-crust-dark uppercase">
            Fresh to order
          </p>
          <h1 className="mt-2 font-display text-4xl text-espresso sm:text-5xl">
            Menu
          </h1>
          <p className="mt-3 max-w-xl text-brown">
            Everything is baked fresh in small batches. Loaves need 48 hours
            notice; rolls and treats need 24 hours. Custom requests welcome at
            checkout.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {(
              [
                ["all", "All"],
                ["sourdough", "Sourdough"],
                ["rolls", "Rolls & treats"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  filter === value
                    ? "bg-espresso text-white"
                    : "bg-cream text-brown ring-1 ring-linen hover:bg-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-12 px-4 py-10 sm:px-6">
        {grouped.map((group) => (
          <section key={group.category} aria-labelledby={`cat-${group.category}`}>
            <h2
              id={`cat-${group.category}`}
              className="mb-4 font-display text-2xl text-espresso sm:text-3xl"
            >
              {group.label}
            </h2>
            {group.category === "sourdough" ? (
              <p className="mb-4 text-sm text-muted">
                Standard loaf size. Larger or smaller available on request
                (price may vary).
              </p>
            ) : (
              <p className="mb-4 text-sm text-muted">
                Sold by the dozen. Pandesal, Spanish bread, pan de coco, and
                more.
              </p>
            )}
            <ul className="space-y-3">
              {group.items.map((item) => (
                <MenuItemRow key={item.id} item={item} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      {itemCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-linen bg-cream/95 p-4 shadow-[0_-8px_30px_rgba(44,36,22,0.12)] backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-espresso">
                {itemCount} item{itemCount === 1 ? "" : "s"} ·{" "}
                {formatPrice(subtotalCents)}
              </p>
              <p className="text-xs text-muted">No tax · pickup or delivery</p>
            </div>
            <Link
              href="/cart"
              className="rounded-full bg-crust-dark px-6 py-3 text-sm font-semibold text-white transition hover:bg-espresso"
            >
              View cart
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
