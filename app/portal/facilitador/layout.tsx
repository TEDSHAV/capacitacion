import type { Metadata } from "next";
import PortalFooter from "@/components/PortalFooter";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { SyncBadge } from "@/components/SyncBadge";

export const metadata: Metadata = {
  title: "Portal de Facilitadores",
  description:
    "Acceso al portal de facilitadores de SHA de Venezuela. Gestiona tus servicios de capacitación, OSI y certificados.",
  openGraph: {
    title: "Portal de Facilitadores | SHA de Venezuela",
    description:
      "Acceso al portal de facilitadores de SHA de Venezuela para gestionar servicios de capacitación.",
  },
};

export default async function FacilitadorPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {children}
      <PortalFooter />
      <OfflineIndicator />
      <SyncBadge />
    </div>
  );
}
