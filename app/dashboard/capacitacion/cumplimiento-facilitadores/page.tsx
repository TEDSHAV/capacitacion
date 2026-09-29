import { Metadata } from "next";
import { getAdminComplianceOverview } from "@/app/actions/facilitador-compliance";
import { CumplimientoFacilitadoresClient } from "./CumplimientoFacilitadoresClient";

export const metadata: Metadata = {
  title: "Cumplimiento y Normativas de Facilitadores | PRISMA",
  description: "Control corporativo y seguimiento de firma de documentos normativos (LOPCYMAT e ISO 9001).",
};

export default async function CumplimientoFacilitadoresPage() {
  const result = await getAdminComplianceOverview();

  const initialStats = result.stats || {
    totalFacilitadores: 0,
    compliantCount: 0,
    partialCount: 0,
    nonCompliantCount: 0,
    complianceRate: 0,
    physicalPendingCount: 0,
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <CumplimientoFacilitadoresClient
        initialStats={initialStats}
        initialFacilitators={result.facilitators || []}
        error={result.error}
      />
    </div>
  );
}
