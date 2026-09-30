"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
  AlertCircle,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { ComplianceModal } from "./ComplianceModal";
import { getFacilitadorComplianceStatus } from "@/app/actions/facilitador-compliance";
import {
  ComplianceDocumentCode,
  FacilitadorComplianceRecord,
  COMPLIANCE_DOCUMENTS,
} from "@/types/compliance-documents";

interface ComplianceBannerProps {
  facilitadorId: number;
  facilitadorNombre: string;
  facilitadorCedula?: string;
}

export function ComplianceBanner({
  facilitadorId,
  facilitadorNombre,
  facilitadorCedula = "",
}: ComplianceBannerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<Record<ComplianceDocumentCode, FacilitadorComplianceRecord | null>>({
    identificacion_peligros: null,
    notificacion_riesgos: null,
    politica_operativa: null,
  });

  const loadStatus = useCallback(async () => {
    setLoading(true);
    const res = await getFacilitadorComplianceStatus(facilitadorId);
    if (res.success && res.data) {
      setRecords(res.data.records);
    }
    setLoading(false);
  }, [facilitadorId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const docCodes: ComplianceDocumentCode[] = [
    "identificacion_peligros",
    "notificacion_riesgos",
    "politica_operativa",
  ];

  const totalAck = docCodes.filter((c) => records[c]?.acknowledged).length;
  const isFullyCompliant = totalAck === 3;
  const pendingPhysical = docCodes.filter(
    (c) => COMPLIANCE_DOCUMENTS[c].requiresPhysicalDelivery && !records[c]?.fisico_entregado
  ).length;

  // Once all 3 documents are signed and physical copies marked as delivered in office,
  // the banner disappears completely from the dashboard
  const isFullyDelivered = isFullyCompliant && pendingPhysical === 0;

  if (loading || isFullyDelivered) {
    return null;
  }

  return (
    <>
      <div
        className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-2xs ${
          isFullyCompliant
            ? "bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/30 border-emerald-200/80"
            : "bg-gradient-to-r from-amber-50/80 via-white to-orange-50/30 border-amber-200/90"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isFullyCompliant
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                  : "bg-amber-100 text-amber-700 border-amber-200"
              }`}
            >
              {isFullyCompliant ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              ) : (
                <Clock className="w-5 h-5 text-amber-600" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900">
                  {isFullyCompliant
                    ? "Cumplimiento Normativo y Legal al Día"
                    : "Revisión de Normativas y Seguridad Pendiente"}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isFullyCompliant
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                      : "bg-amber-100 text-amber-800 border-amber-200"
                  }`}
                >
                  {totalAck} de 3 Documentos Firmados
                </span>
                {isFullyCompliant && pendingPhysical > 0 && (
                  <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                    {pendingPhysical} por consignar en físico
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                {isFullyCompliant
                  ? "Has completado la lectura y firma digital de los 3 documentos obligatorios de SHA de Venezuela, C.A. Puedes consultar o reimprimir tus constancias en cualquier momento."
                  : "Por políticas corporativas y de seguridad laboral (LOPCYMAT/ISO 9001), debes leer y firmar digitalmente una sola vez los 3 documentos normativos obligatorios."}
              </p>

              {/* Document badges row */}
              <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px]">
                {docCodes.map((code) => {
                  const def = COMPLIANCE_DOCUMENTS[code];
                  const isDone = Boolean(records[code]?.acknowledged);
                  return (
                    <span
                      key={code}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold ${
                        isDone
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      )}
                      {def.shortTitle}
                    </span>
                  );
                })}
              </div>

              {!isFullyCompliant && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-50/90 border border-rose-200/80 text-rose-800 text-[11px] leading-tight mt-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                  <span>
                    <strong className="font-bold text-rose-900">Aviso Obligatorio:</strong> La falta de cumplimiento oportuno de estas normativas conllevará a la <strong>suspensión o desactivación preventiva de su cuenta de facilitador en PRISMA</strong> y la pausa de nuevas asignaciones.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <Button
              type="button"
              variant={isFullyCompliant ? "outline" : "default"}
              onClick={() => setModalOpen(true)}
              className={`h-10 px-4 text-xs font-bold rounded-xl shadow-xs cursor-pointer ${
                isFullyCompliant
                  ? "bg-white hover:bg-slate-50 text-slate-800 border-slate-300 hover:border-slate-400"
                  : "bg-sky-600 hover:bg-sky-700 text-white border-0 shadow-sky-600/20"
              }`}
            >
              <span>{isFullyCompliant ? "Ver Documentos Firmados" : "Revisar y Firmar"}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>

      <ComplianceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        facilitadorId={facilitadorId}
        facilitadorNombre={facilitadorNombre}
        facilitadorCedula={facilitadorCedula}
        initialRecords={records}
        onComplianceUpdated={loadStatus}
      />
    </>
  );
}
