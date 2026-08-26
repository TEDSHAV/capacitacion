import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import {
  getDisenoServicioById,
  getCurrentUserForDiseno,
} from "@/app/actions/diseno-servicio";
import {
  isCapacitacionDept,
  isServiciosTecnicosDept,
} from "@/lib/requisiciones-gerencia";
import DisenoServicioWizard from "./components/DisenoServicioWizard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const solicitud = await getDisenoServicioById(parseInt(id));
  return {
    title: solicitud
      ? `${solicitud.nombre_sugerido} | Nuevos Servicios | Capacitación`
      : "Nuevos Servicios | Capacitación",
  };
}

export default async function DisenoServicioWizardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL || ""}/auth/login`);
  }

  const { id } = await params;
  const [solicitud, userData] = await Promise.all([
    getDisenoServicioById(parseInt(id)),
    getCurrentUserForDiseno(),
  ]);

  if (!solicitud) {
    notFound();
  }

  // Guard: only Capacitación and Servicios Técnicos users may manage these
  // services, and only those matching the service's executing department.
  // The service's executing department comes from
  // catalogo_servicios.id_departamento_ejecutante (3 = Capacitación,
  // 4 = Servicios Técnicos). Anyone else (or a direct URL to a service outside
  // the user's scope) is blocked.
  const userDeptName = (userData?.departamentos as any)?.nombre ?? null;
  const isCapUser = isCapacitacionDept(userDeptName);
  const isStUser = isServiciosTecnicosDept(userDeptName);

  if (!userData || (!isCapUser && !isStUser)) {
    notFound();
  }

  const ejecutanteId = solicitud.id_departamento_ejecutante;
  const scopeMatches = isCapUser
    ? ejecutanteId === 3
    : ejecutanteId === 4;
  if (!scopeMatches) {
    notFound();
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex items-center gap-4 max-w-5xl mx-auto">
        <Link href="/dashboard/capacitacion/nuevos-servicios">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {solicitud.nombre_sugerido}
          </h1>
          <p className="text-sm text-gray-600">
            Nuevos Servicios · {solicitud.estatus_nombre || "Pendiente"}
          </p>
        </div>
      </div>

      <DisenoServicioWizard solicitud={solicitud} userData={userData} />
    </div>
  );
}
