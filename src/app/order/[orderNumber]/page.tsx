import type { Metadata } from "next";
import { OrderConfirmation } from "@/components/OrderConfirmation";

type Props = { params: Promise<{ orderNumber: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orderNumber } = await params;
  return { title: `Order ${orderNumber}` };
}

export default async function OrderPage({ params }: Props) {
  const { orderNumber } = await params;
  return <OrderConfirmation orderNumber={orderNumber} />;
}
