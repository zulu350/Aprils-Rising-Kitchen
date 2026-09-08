import { HOURS } from "@/lib/constants";

export function HoursCopy({ className }: { className?: string }) {
  return (
    <div className={className}>
      <p>{HOURS.sourdough}</p>
      <p className="mt-1">{HOURS.rolls}</p>
      <p className="mt-1">{HOURS.pickupDelivery}</p>
      <p className="mt-1">{HOURS.questions}</p>
    </div>
  );
}
