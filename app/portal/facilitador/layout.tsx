import type { Metadata } from "next";

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
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
