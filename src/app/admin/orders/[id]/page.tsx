import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { OrderDetail } from "@/components/admin/OrderDetail";
import { isAdminAuthenticated } from "@/lib/auth";

type Props = { params: Promise<{ id: string }> };

export default async function AdminOrderPage({ params }: Props) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
  const { id } = await params;
  return (
    <AdminShell title="Order detail">
      <OrderDetail id={id} />
    </AdminShell>
  );
}
