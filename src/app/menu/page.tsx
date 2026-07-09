import type { Metadata } from "next";
import { MenuClient } from "@/components/MenuClient";

export const metadata: Metadata = {
  title: "Menu",
};

export default function MenuPage() {
  return <MenuClient />;
}
