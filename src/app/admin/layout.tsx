import type { Metadata } from "next";
import { BUSINESS } from "@/lib/constants";

export const metadata: Metadata = {
  title: {
    default: "Kitchen",
    template: `%s · ${BUSINESS.shortName} Kitchen`,
  },
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-wheat text-brown print:min-h-0">
      {children}
    </div>
  );
}
