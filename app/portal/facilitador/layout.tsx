import type { Metadata } from "next";
import { PWALayout } from "@/components/PWALayout";
import PortalFooter from "@/components/PortalFooter";

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
    <PWALayout>
      {children}
      <PortalFooter />
    </PWALayout>
  );
}
