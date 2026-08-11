import type { Metadata } from "next";

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
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
