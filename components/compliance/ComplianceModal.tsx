"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShieldCheck,
  FileText,
  Printer,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Building2,
  Download,
  Loader2,
  ExternalLink,
} from "lucide-react";
import {
  ComplianceDocumentCode,
  COMPLIANCE_DOCUMENTS,
  FacilitadorComplianceRecord,
} from "@/types/compliance-documents";
import { acknowledgeComplianceDocument } from "@/app/actions/facilitador-compliance";

interface ComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilitadorId: number;
  facilitadorNombre: string;
  facilitadorCedula?: string;
  initialRecords: Record<ComplianceDocumentCode, FacilitadorComplianceRecord | null>;
  onComplianceUpdated?: () => void;
}

export function ComplianceModal({
  isOpen,
  onClose,
  facilitadorId,
  facilitadorNombre,
  facilitadorCedula = "",
  initialRecords,
  onComplianceUpdated,
}: ComplianceModalProps) {
  const [activeCode, setActiveCode] = useState<ComplianceDocumentCode>("identificacion_peligros");
  const [records, setRecords] = useState(initialRecords);
  const [signerName, setSignerName] = useState(facilitadorNombre);
  const [signerCedula, setSignerCedula] = useState(facilitadorCedula);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const activeDocDef = COMPLIANCE_DOCUMENTS[activeCode];
  const activeRecord = records[activeCode];
  const isAcknowledged = Boolean(activeRecord?.acknowledged);

  const handleSelectDoc = (code: ComplianceDocumentCode) => {
    setActiveCode(code);
    setHasAgreed(false);
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  /**
   * Native PDF Printing: Targets the actual PDF document directly
   * instead of capturing a webpage/DOM screenshot.
   */
  const handlePrint = () => {
    if (!activeDocDef.canPrint) return;

    const iframeId = "print-compliance-pdf-frame";
    let printFrame = document.getElementById(iframeId) as HTMLIFrameElement | null;
    if (!printFrame) {
      printFrame = document.createElement("iframe");
      printFrame.id = iframeId;
      printFrame.style.position = "fixed";
      printFrame.style.right = "0";
      printFrame.style.bottom = "0";
      printFrame.style.width = "0";
      printFrame.style.height = "0";
      printFrame.style.border = "0";
      document.body.appendChild(printFrame);
    }

    printFrame.src = activeDocDef.pdfUrl;
    printFrame.onload = () => {
      try {
        printFrame?.contentWindow?.focus();
        printFrame?.contentWindow?.print();
      } catch (err) {
        console.warn("Direct iframe print restricted, opening PDF directly:", err);
        window.open(activeDocDef.pdfUrl, "_blank");
      }
    };
  };

  const handleAcknowledge = async () => {
    if (!hasAgreed) {
      setSubmitError("Debes marcar la casilla de aceptación para registrar tu firma digital.");
      return;
    }
    if (!signerName.trim() || !signerCedula.trim()) {
      setSubmitError("Por favor completa tu nombre y cédula para la constancia digital.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    const res = await acknowledgeComplianceDocument(facilitadorId, activeCode, {
      signer_name: signerName,
      signer_cedula: signerCedula,
    });

    if (res.success) {
      const nowIso = new Date().toISOString();
      setRecords((prev) => ({
        ...prev,
        [activeCode]: {
          facilitador_id: facilitadorId,
          document_code: activeCode,
          document_title: activeDocDef.title,
          document_version: activeDocDef.version,
          acknowledged: true,
          acknowledged_at: nowIso,
          signer_name: signerName,
          signer_cedula: signerCedula,
          fisico_entregado: prev[activeCode]?.fisico_entregado || false,
          fisico_entregado_at: prev[activeCode]?.fisico_entregado_at || null,
          fisico_entregado_recibido_por: prev[activeCode]?.fisico_entregado_recibido_por || null,
        },
      }));
      setSubmitSuccess("¡Documento revisado y firmado digitalmente con éxito!");
      onComplianceUpdated?.();
    } else {
      setSubmitError(res.error || "Ocurrió un error al registrar la firma digital.");
    }
    setSubmitting(false);
  };

  const docCodes: ComplianceDocumentCode[] = [
    "identificacion_peligros",
    "notificacion_riesgos",
    "politica_operativa",
  ];

  const totalAck = docCodes.filter((c) => records[c]?.acknowledged).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[96vw] max-h-[94vh] flex flex-col p-0 overflow-hidden bg-slate-50/50">
        {/* Top Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200">
                <ShieldCheck className="w-5 h-5 text-sky-600" />
              </span>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Normativas de Seguridad y Cumplimiento Corporativo
              </DialogTitle>
            </div>
            <p className="text-xs text-slate-500 pl-9">
              Procedimientos obligatorios para facilitadores de SHA DE VENEZUELA, C.A. (Revisión única)
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Progreso: <strong className="text-sky-700">{totalAck}</strong> de 3 al día
            </span>

            {/* ONLY show print and downloadable options for docs that require physical printing */}
            {activeDocDef.canPrint ? (
              <>
                <a
                  href={activeDocDef.pdfUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold transition-colors shadow-2xs"
                  title="Descargar PDF oficial original para imprimir y firmar en físico"
                >
                  <Download className="w-3.5 h-3.5 text-sky-600" />
                  Descargar PDF Oficial
                </a>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="h-8 text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-50 cursor-pointer"
                  title="Imprimir documento PDF directamente"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
                  Imprimir PDF
                </Button>
              </>
            ) : (
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Solo lectura digital (No requiere impresión)
              </span>
            )}
          </div>
        </div>

        {/* Modal Body: Sidebar Selector + Document Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Document Tabs Sidebar */}
          <div className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-3 space-y-2 overflow-y-auto shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
              Documentos Requeridos
            </p>
            {docCodes.map((code, idx) => {
              const def = COMPLIANCE_DOCUMENTS[code];
              const rec = records[code];
              const isDone = Boolean(rec?.acknowledged);
              const isSelected = activeCode === code;

              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleSelectDoc(code)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${isSelected
                      ? "bg-sky-50/80 border-sky-400 ring-2 ring-sky-200/60 shadow-2xs"
                      : isDone
                        ? "bg-white hover:bg-emerald-50/40 border-slate-200/80"
                        : "bg-white hover:bg-slate-50 border-slate-200/80"
                    }`}
                >
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${isDone
                        ? "bg-emerald-600 text-white"
                        : isSelected
                          ? "bg-sky-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                  >
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold truncate ${isSelected ? "text-sky-950" : "text-slate-800"}`}>
                      {def.shortTitle}
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {def.category}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isDone
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                          }`}
                      >
                        {isDone ? "Firmado Digital" : "Pendiente"}
                      </span>
                      {def.requiresPhysicalDelivery ? (
                        <span
                          className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${rec?.fisico_entregado
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                            }`}
                        >
                          {rec?.fisico_entregado ? "Entregado en Físico" : "Requiere Físico"}
                        </span>
                      ) : (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-slate-50 text-slate-500 border-slate-200">
                          Solo Lectura
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Account Deactivation Warning Card in Sidebar */}
            <div className="mt-4 p-3 bg-rose-50/90 rounded-xl border border-rose-200 text-[11px] text-rose-900 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5 text-rose-950">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                Aviso de Consecuencias
              </p>
              <p className="leading-relaxed text-[10.5px] text-rose-800">
                La falta de cumplimiento oportuno de estas 3 normativas podrá conllevar a la <strong>suspensión temporal o desactivación preventiva de su cuenta de facilitador en PRISMA</strong>, así como la pausa de nuevas asignaciones.
              </p>
            </div>

            {/* Physical Delivery Info */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-[11px] text-slate-600 space-y-1">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-sky-600" />
                Entrega Física en Sede
              </p>
              <p className="leading-relaxed text-[10.5px] text-slate-500">
                Los documentos 2 y 3 deben ser descargados o impresos, firmados con huella y entregados en físico en las oficinas de SHA de Venezuela, C.A. (o vía Casillero ZOOM para facilitadores foráneos).
              </p>
            </div>
          </div>

          {/* Document Content View Area: 100% Authentic PDF Viewer */}
          <div className="flex-1 bg-white overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Document Header Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-sky-50/40 border border-slate-200/80 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-100/70 px-2 py-0.5 rounded-md inline-block">
                    {activeDocDef.category} • Versión {activeDocDef.version}
                  </span>
                  {activeCode === "identificacion_peligros" && (
                    <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md inline-block">
                      13 Páginas Oficiales
                    </span>
                  )}
                </div>

                {isAcknowledged ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200 self-start sm:self-auto">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Firmado digitalmente el {new Date(activeRecord!.acknowledged_at!).toLocaleDateString("es-VE")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200 self-start sm:self-auto">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Pendiente de firma digital
                  </span>
                )}
              </div>

              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {activeDocDef.title}
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                {activeDocDef.description}
              </p>
              <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between">
                <p className="text-[10px] text-slate-400 font-mono">
                  Marco Legal: {activeDocDef.legalFramework}
                </p>
              </div>
            </div>

            {/* Official PDF Viewer Container: Genuine, Full, and Authentic */}
            <div className="space-y-2">
              <div className="w-full h-[650px] rounded-2xl overflow-hidden border border-slate-300 bg-slate-100 shadow-inner flex flex-col relative">
                <div className="bg-slate-100/90 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700 shrink-0">
                  <span className="font-semibold flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-sky-600" />
                    Documento Oficial Original
                    {activeCode === "identificacion_peligros" && (
                      <span className="text-[10px] font-bold text-sky-800 bg-sky-100/80 px-2 py-0.5 rounded-full ml-1">
                        13 Páginas • NT-03-2016
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-3">
                    <a
                      href={activeDocDef.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 hover:text-sky-800 font-bold inline-flex items-center gap-1 text-xs hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Abrir en ventana completa
                    </a>
                    {activeDocDef.canPrint && (
                      <a
                        href={activeDocDef.pdfUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-700 hover:text-slate-900 font-semibold inline-flex items-center gap-1 text-xs hover:underline"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-600" />
                        Descargar PDF
                      </a>
                    )}
                  </div>
                </div>

                <iframe
                  src={`${activeDocDef.pdfUrl}#toolbar=1&navpanes=0`}
                  className="w-full flex-1 border-0"
                  title={activeDocDef.title}
                />
              </div>
              <p className="text-[11px] text-slate-500 italic text-center">
                * Desplázate hacia abajo en el visor para revisar la totalidad del documento antes de asentar tu firma digital.
              </p>
            </div>

            {/* MANDATORY WARNING: CONSEQUENCES OF NON-COMPLIANCE */}
            <div className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200/90 text-rose-900 text-xs flex items-start gap-3.5 shadow-2xs">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-rose-950 text-sm">
                  Advertencia Obligatoria de Cumplimiento y Seguridad Laboral:
                </p>
                <p className="text-xs text-rose-800 leading-relaxed">
                  Conforme a los lineamientos de SHA DE VENEZUELA, C.A., la Ley Orgánica de Prevención, Condiciones y Medio Ambiente de Trabajo (LOPCYMAT) y el Sistema de Gestión de la Calidad (ISO 9001:2015), la lectura y firma de estas tres normativas es de carácter <strong>estrictamente obligatorio</strong>. La omisión o falta de suscripción en el sistema conllevará a la <strong>suspensión temporal o desactivación preventiva de su cuenta de facilitador en PRISMA</strong>, así como la inhabilitación inmediata para la asignación de nuevos servicios de capacitación u órdenes de servicio (OSIs).
                </p>
              </div>
            </div>

            {/* Signature & Digital Acknowledgment Section */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-600" />
                Constancia de Lectura y Firma Digital
              </h3>

              {isAcknowledged ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Documento firmado y aceptado digitalmente</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-emerald-800 pt-1 border-t border-emerald-200/60">
                    <p>
                      Firmante: <strong>{activeRecord?.signer_name || facilitadorNombre}</strong>
                    </p>
                    <p>
                      Cédula / RIF: <strong>{activeRecord?.signer_cedula || facilitadorCedula}</strong>
                    </p>
                    <p>
                      Fecha y Hora: <strong>{activeRecord?.acknowledged_at ? new Date(activeRecord.acknowledged_at).toLocaleString("es-VE") : "Registrado"}</strong>
                    </p>
                    <p>
                      Estado Físico en Oficinas:{" "}
                      <strong>
                        {activeDocDef.requiresPhysicalDelivery
                          ? activeRecord?.fisico_entregado
                            ? "✓ Entregado en Físico"
                            : "⏳ Pendiente de entrega física en oficina"
                          : "No aplica (Solo digital)"}
                      </strong>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500">
                        Nombre Completo del Facilitador
                      </label>
                      <Input
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        placeholder="Nombre y Apellido"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500">
                        Cédula de Identidad / RIF
                      </label>
                      <Input
                        value={signerCedula}
                        onChange={(e) => setSignerCedula(e.target.value)}
                        placeholder="V-12345678"
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
                    <input
                      type="checkbox"
                      checked={hasAgreed}
                      onChange={(e) => setHasAgreed(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 mt-0.5 cursor-pointer shrink-0"
                    />
                    <span className="text-xs text-slate-700 leading-snug">
                      Declaro bajo fe de juramento que he leído íntegramente este documento oficial, comprendido sus alcances preventivos y normativos, y acepto formalmente su estricto cumplimiento conforme a las leyes y normativas de SHA DE VENEZUELA, C.A.
                    </span>
                  </label>

                  {submitError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {submitSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{submitSuccess}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2 flex-wrap">
                    {/* ONLY display print / download if this document can be printed */}
                    {activeDocDef.canPrint && (
                      <>
                        <a
                          href={activeDocDef.pdfUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors shadow-2xs"
                          title="Descargar PDF original para imprimir"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-600" />
                          Descargar PDF para Imprimir
                        </a>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handlePrint}
                          className="h-10 px-4 rounded-xl border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
                          Imprimir PDF
                        </Button>
                      </>
                    )}

                    <Button
                      type="button"
                      variant={hasAgreed ? "default" : "secondary"}
                      onClick={handleAcknowledge}
                      disabled={submitting || !hasAgreed}
                      className={`h-10 px-5 text-xs font-bold rounded-xl shadow-xs transition-all ${hasAgreed
                          ? "bg-sky-600 hover:bg-sky-700 text-white cursor-pointer"
                          : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          Registrando firma...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                          Confirmar Lectura y Firma Digital
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
