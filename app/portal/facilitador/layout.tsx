import type { Metadata } from "next";
import { PWALayout } from "@/components/PWALayout";
import PortalFooter from "@/components/PortalFooter";
import { getFacilitatorSession } from "@/app/actions/facilitador-portal";
import { logoutFacilitator } from "@/app/actions/facilitador-portal";

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
  const session = await getFacilitatorSession();

  return (
    <PWALayout
      userName={session?.nombre}
      onLogout={async () => {
        "use server";
        await logoutFacilitator();
      }}
    >
      {children}
      <PortalFooter />
    </PWALayout>
  );
}
