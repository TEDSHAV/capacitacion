import { getClienteSession, getClienteMetrics, getClienteBatchesFiltered, getClienteFilterOptions, logoutCliente } from "@/app/actions/cliente-portal";
import { redirect } from "next/navigation";
import { PortalNavbar } from "@/components/PortalNavbar";
import { ClienteDashboardClient } from "./cliente-dashboard-client";
import type { ClienteMetrics, ClienteBatchSummary, ClienteFilterOptions } from "@/types";
import { createClient } from "@/utils/supabase/server";

export default async function ClienteDashboardPage() {
  const session = await getClienteSession();

  if (!session) {
    redirect("/portal/cliente/login");
  }

  const [metricsResult, batchesResult, filterOptionsResult] =
    await Promise.all([
      getClienteMetrics(session.empresa_id),
      getClienteBatchesFiltered(session.empresa_id, { type: "all" }, 1, 10),
      getClienteFilterOptions(session.empresa_id),
    ]);
  const metrics: ClienteMetrics = metricsResult.data || {
    totalCertificates: 0,
    totalCarnets: 0,
    totalParticipants: 0,
    courseWithMostParticipants: null,
    certificatesByCourse: [],
  };

  const batches: ClienteBatchSummary[] = batchesResult.data || [];
  const initialTotalCount: number = batchesResult.totalCount || 0;
  const filterOptions: ClienteFilterOptions = filterOptionsResult.data || {
    courses: [],
    states: [],
    cities: [],
  };

  let sedeName: string | null = null;
  if (session.id_ciudad) {
    const supabase = await createClient();
    const { data: cityData } = await supabase
      .from("cat_ciudades")
      .select("nombre_ciudad")
      .eq("id", session.id_ciudad)
      .single();
    sedeName = cityData?.nombre_ciudad || null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalNavbar title="Portal de Clientes" logoutAction={logoutCliente} loginPath="/portal/cliente/login" />
      <div className="max-w-6xl mx-auto py-10 px-4">
      <header className="mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {session.empresa_nombre}
            {sedeName && (
              <span className="text-lg font-medium text-gray-500 ml-2">
                — Sede: {sedeName}
              </span>
            )}
          </h1>
          <p className="text-gray-600">
            {session.display_name
              ? `Bienvenido, ${session.display_name}`
              : "Consulta de certificados y carnets"}
          </p>
        </div>
      </header>

      <ClienteDashboardClient
        empresaId={session.empresa_id}
        initialMetrics={metrics}
        initialBatches={batches}
        initialTotalCount={initialTotalCount}
        filterOptions={filterOptions}
      />
    </div>
    </div>
  );
}
