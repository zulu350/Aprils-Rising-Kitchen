import type { Metadata } from "next";
import { CartClient } from "@/components/CartClient";

export const metadata: Metadata = {
  title: "Cart",
};

export default function CartPage() {
  return <CartClient />;
}
