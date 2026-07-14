import { getClienteSession, getClienteMetrics, getClienteRecentBatches, getClienteFilterOptions, logoutCliente } from "@/app/actions/cliente-portal";
import { redirect } from "next/navigation";
import { PortalNavbar } from "@/components/PortalNavbar";
import { ClienteDashboardClient } from "./cliente-dashboard-client";
import type { ClienteMetrics, ClienteBatchSummary, ClienteFilterOptions } from "@/types";

export default async function ClienteDashboardPage() {
  const session = await getClienteSession();

  if (!session) {
    redirect("/portal/cliente/login");
  }

  const [metricsResult, batchesResult, filterOptionsResult] =
    await Promise.all([
      getClienteMetrics(session.empresa_id),
      getClienteRecentBatches(session.empresa_id, 5),
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
  const filterOptions: ClienteFilterOptions = filterOptionsResult.data || {
    courses: [],
    states: [],
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalNavbar title="Portal de Clientes" logoutAction={logoutCliente} loginPath="/portal/cliente/login" />
      <div className="max-w-6xl mx-auto py-10 px-4">
      <header className="mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {session.empresa_nombre}
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
        filterOptions={filterOptions}
      />
    </div>
    </div>
  );
}
