import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOsiAuditDetail } from "@/app/actions/facilitador-uploads-audit";
import { OsiAuditWorkspaceClient } from "./OsiAuditWorkspaceClient";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";

interface OsiAuditPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: OsiAuditPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Auditoría de Soportes OSI #${id} | Capacitación`,
    description: "Cotejo y auditoría de notas y soportes físicos entregados por facilitadores.",
  };
}

export default async function OsiAuditDetailPage({ params }: OsiAuditPageProps) {
  const { id } = await params;
  const osiId = parseInt(id, 10);

  if (isNaN(osiId)) {
    notFound();
  }

  const { data, error } = await getOsiAuditDetail(osiId);

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">
            No se pudo cargar la auditoría para la OSI #{id}
          </h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {error || "La orden de servicio no existe o no tiene registros asociados."}
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard/capacitacion/auditoria-soportes"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al Panel de Auditoría</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1720px] mx-auto py-5 px-4 sm:px-6 lg:px-8">
      <OsiAuditWorkspaceClient data={data} />
    </div>
  );
}
