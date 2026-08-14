import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { NewOrderForm } from "@/components/admin/NewOrderForm";
import { isAdminAuthenticated } from "@/lib/auth";

export default async function AdminNewOrderPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
  return (
    <AdminShell title="New order">
      <NewOrderForm />
    </AdminShell>
  );
}
