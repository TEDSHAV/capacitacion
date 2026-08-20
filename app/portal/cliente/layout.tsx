import type { Metadata } from "next";
import { PWALayout } from "@/components/PWALayout";
import PortalFooter from "@/components/PortalFooter";

export const metadata: Metadata = {
  title: "Portal de Clientes",
  description:
    "Acceso al portal de clientes de SHA de Venezuela. Consulta tus certificados y carnets emitidos.",
  openGraph: {
    title: "Portal de Clientes | SHA de Venezuela",
    description:
      "Acceso al portal de clientes de SHA de Venezuela para consultar certificados y carnets.",
  },
};

export default async function ClientePortalLayout({
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
