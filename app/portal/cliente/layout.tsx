import type { Metadata } from "next";
import { PWALayout } from "@/components/PWALayout";
import PortalFooter from "@/components/PortalFooter";
import { getClienteSession, logoutCliente } from "@/app/actions/cliente-portal";
import { toTitleCase } from "@/utils/string-utils";

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
  const session = await getClienteSession();
  const rawUserName = session?.display_name || session?.empresa_nombre || undefined;
  const userName = rawUserName ? toTitleCase(rawUserName) : undefined;

  return (
    <PWALayout
      userName={userName}
      onLogout={async () => {
        "use server";
        await logoutCliente();
      }}
    >
      {children}
      <PortalFooter />
    </PWALayout>
  );
}
