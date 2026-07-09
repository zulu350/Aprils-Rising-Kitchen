import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { OrderBoard } from "@/components/admin/OrderBoard";
import { isAdminAuthenticated } from "@/lib/auth";

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
  return (
    <AdminShell title="Orders">
      <OrderBoard />
    </AdminShell>
  );
}
