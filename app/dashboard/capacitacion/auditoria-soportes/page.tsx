import { Metadata } from "next";
import { getFacilitadorUploadsAudit } from "@/app/actions/facilitador-uploads-audit";
import { AuditoriaSoportesClient } from "./AuditoriaSoportesClient";

export const metadata: Metadata = {
  title: "Revisión de Documentos y Calificaciones | PRISMA",
  description: "Cotejo de documentos físicos y notas digitales entregadas por facilitadores.",
};

export default async function AuditoriaSoportesPage() {
  const summary = await getFacilitadorUploadsAudit();

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <AuditoriaSoportesClient initialSummary={summary} />
    </div>
  );
}
