import { getFacilitatorSession, getFacilitatorPortalData } from "@/app/actions/facilitador-portal";
import { redirect } from "next/navigation";
import FacilitadorDashboardClient from "./FacilitadorDashboardClient";
import { toTitleCase } from "@/utils/string-utils";

export default async function FacilitadorDashboardPage() {
  const session = await getFacilitatorSession();

  if (!session) {
    redirect("/portal/facilitador/login");
  }

  const portalDataRes = await getFacilitatorPortalData(session.facilitador_id);

  return (
    <FacilitadorDashboardClient
      nombre={toTitleCase(session.nombre)}
      initialData={portalDataRes.data || null}
      osis={portalDataRes.data?.osis || []}
      facilitadorId={session.facilitador_id}
    />
  );
}

