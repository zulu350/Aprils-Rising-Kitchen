import type { Metadata } from "next";
import { OrderConfirmation } from "@/components/OrderConfirmation";

type Props = {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ t?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orderNumber } = await params;
  return { title: `Order ${orderNumber}` };
}

export default async function OrderPage({ params, searchParams }: Props) {
  const { orderNumber } = await params;
  const { t } = await searchParams;
  return (
    <OrderConfirmation orderNumber={orderNumber} accessToken={t ?? ""} />
  );
}
