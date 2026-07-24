import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { BlockedDaysManager } from "@/components/admin/BlockedDaysManager";
import { isAdminAuthenticated } from "@/lib/auth";

export default async function AdminBlockedDaysPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
  return (
    <AdminShell title="Blocked days">
      <BlockedDaysManager />
    </AdminShell>
  );
}
