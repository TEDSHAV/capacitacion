import { getFacilitatorSession, getFacilitatorPortalData } from "@/app/actions/facilitador-portal";
import { getFacilitadorPurchaseOrders } from "@/app/actions/facilitador-facturacion";
import { redirect } from "next/navigation";
import FacilitadorDashboardClient from "./FacilitadorDashboardClient";

import { toTitleCase } from "@/utils/string-utils";

interface FacilitadorDashboardPageProps {
  searchParams?: Promise<{ view?: string }>;
}

export default async function FacilitadorDashboardPage({ searchParams }: FacilitadorDashboardPageProps) {
  const session = await getFacilitatorSession();

  if (!session) {
    redirect("/portal/facilitador/login");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialView = resolvedSearchParams?.view === "facturacion" ? "facturacion" : "servicios";

  const [portalDataRes, poOrdersRes] = await Promise.all([
    getFacilitatorPortalData(session.facilitador_id),
    getFacilitadorPurchaseOrders(session.facilitador_id),
  ]);

  return (
    <FacilitadorDashboardClient
      nombre={toTitleCase(session.nombre)}
      initialData={portalDataRes.data || null}
      osis={portalDataRes.data?.osis || []}
      facilitadorId={session.facilitador_id}
      initialOrders={poOrdersRes.data || []}
      initialView={initialView}
    />
  );
}

