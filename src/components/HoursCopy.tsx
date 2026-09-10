import { BUSINESS, HOURS } from "@/lib/constants";

export function HoursCopy({ className }: { className?: string }) {
  return (
    <div className={className}>
      <p>{HOURS.sourdough}</p>
      <p className="mt-1">{HOURS.rolls}</p>
      <p className="mt-1">{HOURS.pickupDelivery}</p>
      <p className="mt-1">
        Questions? Call or text{" "}
        <a href={BUSINESS.phoneHref} className="font-medium text-espresso hover:text-crust-dark">
          {BUSINESS.phone}
        </a>{" "}
        or email{" "}
        <a
          href={`mailto:${BUSINESS.email}`}
          className="font-medium text-espresso hover:text-crust-dark"
        >
          {BUSINESS.email}
        </a>
        .
      </p>
    </div>
  );
}
