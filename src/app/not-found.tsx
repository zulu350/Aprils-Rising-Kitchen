import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
      <p className="text-sm font-semibold tracking-wide text-crust-dark uppercase">
        404
      </p>
      <h1 className="mt-2 font-display text-4xl text-espresso">
        Page not found
      </h1>
      <p className="mt-3 text-brown">
        That page doesn&apos;t exist. Head back to the menu to order fresh bread.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-crust-dark px-6 py-3 text-sm font-semibold text-white"
        >
          Home
        </Link>
        <Link
          href="/menu"
          className="rounded-full bg-cream px-6 py-3 text-sm font-semibold text-espresso ring-1 ring-linen"
        >
          Menu
        </Link>
      </div>
    </div>
  );
}
