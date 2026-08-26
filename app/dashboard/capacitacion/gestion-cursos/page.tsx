import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import GestionCursosClient from "./GestionCursosClient";
import { Empresa } from "@/types";
import { getCursos } from "./actions";
import { getAnalyticsMetrics } from "@/app/actions/participants";

async function AnalyticsWrapper() {
  const metrics = await getAnalyticsMetrics();
  return metrics;
}

export default async function GestionCursosPage() {
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    companiesResult,
    coursesResult,
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("empresas")
      .select("id, razon_social, rif, direccion_fiscal, codigo_cliente")
      .order("razon_social"),
    getCursos(),
  ]);

  if (!user) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }
  const companies = companiesResult.data as Empresa[] | null;

  if (coursesResult.error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h2 className="text-red-800 font-semibold">Error</h2>
          <p className="text-red-600">{coursesResult.error}</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<GestionCursosClient user={user} empresas={companies || []} cursos={coursesResult.data || undefined} analyticsMetrics={undefined} />}>
      <GestionCursosClientWithAnalytics user={user} empresas={companies || []} cursos={coursesResult.data || undefined} />
    </Suspense>
  );
}

async function GestionCursosClientWithAnalytics({ user, empresas, cursos }: { user: any; empresas: Empresa[]; cursos: any }) {
  const analyticsMetrics = await AnalyticsWrapper();
  return <GestionCursosClient user={user} empresas={empresas} cursos={cursos} analyticsMetrics={analyticsMetrics} />;
}
