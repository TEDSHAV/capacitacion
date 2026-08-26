import { redirect } from "next/navigation";
import { getDisenoServicioList } from "@/app/actions/diseno-servicio";
import { createClient } from "@/utils/supabase/server";
import DisenoServicioListClient from "./components/DisenoServicioListClient";
import { FileText } from "lucide-react";

export const metadata = {
  title: "Nuevos Servicios | Capacitación",
};

export const dynamic = "force-dynamic";

export default async function NuevosServiciosPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL || ""}/auth/login`);
  }

  const records = await getDisenoServicioList();

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-7 w-7 text-indigo-600" />
          Nuevos Servicios
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Listado de solicitudes de diseño y desarrollo de servicios. Continúe el llenado de los formularios asignados a su departamento.
        </p>
      </div>

      <DisenoServicioListClient records={records} />
    </div>
  );
}
