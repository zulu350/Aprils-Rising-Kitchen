import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { isAdminAuthenticated } from "@/lib/auth";
import { nowInBoise, toISODate } from "@/lib/availability";

export default async function MileagePage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const year = nowInBoise().getFullYear();
  const today = toISODate(nowInBoise());
  const from = `${year}-01-01`;

  return (
    <AdminShell title="Mileage">
      <p className="max-w-xl text-sm leading-relaxed text-brown">
        Delivery miles you save on orders. Pickup is not included. Download a
        CSV for your books — date, from, destination, purpose, miles.
      </p>
      <form
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
        action="/api/admin/mileage"
        method="get"
      >
        <label className="block text-sm">
          <span className="font-medium text-brown">From</span>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="mt-1 w-full rounded-xl border border-linen bg-white px-3 py-3 text-base"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-brown">To</span>
          <input
            type="date"
            name="to"
            defaultValue={today}
            className="mt-1 w-full rounded-xl border border-linen bg-white px-3 py-3 text-base"
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-espresso px-6 py-3.5 text-base font-semibold text-white"
        >
          Download CSV
        </button>
      </form>
    </AdminShell>
  );
}
