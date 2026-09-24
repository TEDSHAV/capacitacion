import { getFacilitatorSession, getFacilitatorPortalData } from "@/app/actions/facilitador-portal";
import { redirect } from "next/navigation";
import FacilitadorDashboardClient from "./FacilitadorDashboardClient";

export default async function FacilitadorDashboardPage() {
  const session = await getFacilitatorSession();

  if (!session) {
    redirect("/portal/facilitador/login");
  }

  const { data: portalData } = await getFacilitatorPortalData(session.facilitador_id);

  return (
    <FacilitadorDashboardClient
      nombre={session.nombre}
      initialData={portalData || null}
      osis={portalData?.osis || []}
    />
  );
}
