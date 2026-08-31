import { notFound, redirect } from "next/navigation";
import { ReceiptPrint } from "@/components/admin/ReceiptPrint";
import { isAdminAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
};

export default async function AdminReceiptPage({ params, searchParams }: Props) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const { print } = await searchParams;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) notFound();

  return (
    <ReceiptPrint
      autoPrint={print === "1"}
      order={{
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        phone: order.phone,
        email: order.email,
        fulfillment: order.fulfillment,
        deliveryCity: order.deliveryCity,
        deliveryAddress: order.deliveryAddress,
        preferredDate: order.preferredDate,
        preferredTimeWindow: order.preferredTimeWindow,
        notes: order.notes,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        squareWallet: order.squareWallet,
        subtotalCents: order.subtotalCents,
        deliveryFeeCents: order.deliveryFeeCents,
        adjustmentCents: order.adjustmentCents,
        adjustmentLabel: order.adjustmentLabel,
        totalCents: order.totalCents,
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((item) => ({
          name: item.name,
          unitLabel: item.unitLabel,
          unitPriceCents: item.unitPriceCents,
          quantity: item.quantity,
          lineTotalCents: item.lineTotalCents,
        })),
      }}
    />
  );
}
