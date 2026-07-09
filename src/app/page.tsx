import Image from "next/image";
import Link from "next/link";
import { BUSINESS } from "@/lib/constants";

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/image07.jpg"
            alt="Fresh sourdough loaves and ube pandesal from April's Rising Kitchen"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          {/* Light wash only — copy sits on its own solid card for contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-espresso/45 via-espresso/15 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-espresso/35 via-transparent to-espresso/10" />
        </div>
        <div className="relative mx-auto flex min-h-[72vh] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-20 md:justify-center md:pt-24">
          <div className="max-w-2xl rounded-2xl bg-espresso/92 p-6 shadow-2xl ring-1 ring-white/10 sm:p-8">
            <p className="mb-3 text-sm font-medium tracking-wide text-crust uppercase">
              {BUSINESS.tagline}
            </p>
            <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
              Bread baked with patience, pride &amp; organic ingredients
            </h1>
            <p className="mt-5 text-base leading-relaxed text-white/95 sm:text-lg">
              Naturally leavened sourdough, Filipino-inspired rolls, and sweet
              treats — handcrafted in small batches and made fresh to order for
              your table.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/menu"
                className="rounded-full bg-crust px-6 py-3 text-sm font-semibold text-espresso shadow-md transition hover:bg-wheat"
              >
                Browse the menu
              </Link>
              <Link
                href="/contact"
                className="rounded-full bg-crust px-6 py-3 text-sm font-semibold text-espresso shadow-md transition hover:bg-wheat"
              >
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-linen bg-wheat">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-6 text-center text-sm font-medium text-brown sm:grid-cols-4 sm:px-6">
          {[
            "Organic ingredients",
            "Made fresh to order",
            "Handcrafted in Boise",
            `Delivery in ${BUSINESS.serviceArea}`,
          ].map((item) => (
            <div key={item} className="px-2 py-1">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
          <div>
            <p className="mb-2 text-sm font-semibold tracking-wide text-crust-dark uppercase">
              Welcome
            </p>
            <h2 className="font-display text-3xl font-semibold text-espresso sm:text-4xl">
              A neighborhood bakery, rooted in care
            </h2>
            <p className="mt-4 leading-relaxed">
              {BUSINESS.name} is a small home bakery in Boise, Idaho, where
              every loaf and roll is handcrafted in small batches with organic
              ingredients and plenty of love.
            </p>
            <p className="mt-3 leading-relaxed">
              We specialize in naturally leavened sourdough alongside
              Filipino-inspired rolls and treats that blend comforting
              traditions with creative twists.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-brown">
              <li className="flex gap-2">
                <span className="text-sage-dark">✓</span> Small-batch, never
                mass-produced
              </li>
              <li className="flex gap-2">
                <span className="text-sage-dark">✓</span> Real ingredients you
                can recognize
              </li>
              <li className="flex gap-2">
                <span className="text-sage-dark">✓</span> Pickup or local
                delivery
              </li>
            </ul>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-lg ring-1 ring-linen">
            <Image
              src="/images/image05.jpg"
              alt="Cheddar and olive sourdough loaf sliced open"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      <section className="bg-wheat py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="mb-2 text-sm font-semibold tracking-wide text-crust-dark uppercase">
              How it works
            </p>
            <h2 className="font-display text-3xl font-semibold text-espresso sm:text-4xl">
              Made to order, just for you
            </h2>
          </div>
          <ol className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Choose your bakes",
                body: "Browse sourdough loaves and Filipino-inspired rolls — everything is baked fresh to order.",
              },
              {
                step: "2",
                title: "Pick a date",
                body: "Loaves need 48 hours notice; rolls need 24 hours. We bake on your schedule.",
              },
              {
                step: "3",
                title: "Pickup or delivery",
                body: `Pickup during daylight hours, or delivery in ${BUSINESS.serviceArea}. Pay with cash, Venmo, or Zelle.`,
              },
            ].map((item) => (
              <li
                key={item.step}
                className="rounded-2xl bg-cream p-6 shadow-sm ring-1 ring-linen"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-crust/25 font-display text-lg font-bold text-espresso">
                  {item.step}
                </span>
                <h3 className="mt-4 font-display text-xl text-espresso">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-brown">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
          <div className="mt-10 text-center">
            <Link
              href="/menu"
              className="inline-flex rounded-full bg-crust-dark px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-espresso"
            >
              Start your order
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              img: "/images/image01.jpg",
              title: "Freshness",
              body: "Small batches delivered as close to bake time as we can, so everything peaks on your table.",
            },
            {
              img: "/images/image14.jpg",
              title: "Made with care",
              body: "Every item is handled gently and packed the way we'd treat something for our own family.",
            },
            {
              img: "/images/image04.jpg",
              title: "Simple ingredients",
              body: "Organic flour, natural leaveners, purified water — nothing artificial.",
            },
          ].map((card) => (
            <article
              key={card.title}
              className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-linen"
            >
              <div className="relative aspect-square">
                <Image
                  src={card.img}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
              </div>
              <div className="p-5">
                <h3 className="font-display text-xl text-espresso">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-brown">
                  {card.body}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-linen bg-espresso text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h2 className="font-display text-3xl font-semibold text-white">
              Ready to taste the difference?
            </h2>
            <p className="mt-2 max-w-lg text-white/80">
              Pre-order online, or call/text{" "}
              <a href={BUSINESS.phoneHref} className="underline decoration-crust">
                {BUSINESS.phone}
              </a>
              .
            </p>
          </div>
          <Link
            href="/menu"
            className="rounded-full bg-crust px-7 py-3.5 text-sm font-semibold text-espresso transition hover:bg-wheat"
          >
            View menu &amp; order
          </Link>
        </div>
      </section>
    </>
  );
}
