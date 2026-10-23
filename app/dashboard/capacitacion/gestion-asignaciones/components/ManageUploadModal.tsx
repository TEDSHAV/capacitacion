"use client";

import { useState, useEffect } from "react";
import {
  X,
  RotateCcw,
  Unlock,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  FileText,
  Users,
  Paperclip,
  ShieldAlert,
} from "lucide-react";
import {
  reopenFacilitadorOSI,
  resetFacilitadorOSI,
  getOsiCertificatesCount,
} from "@/app/actions/osi-facilitador-assignments";
import { toTitleCase } from "@/utils/string-utils";

export interface ManageUploadAssignment {
  id: number;
  osi_id: number;
  facilitador_id: number;
  nro_sesion: number | null;
  facilitadores: {
    id: number;
    nombre_apellido: string | null;
    cedula: string | null;
  } | null;
  osi: {
    id_osi: number;
    nro_osi: string;
    nombre_empresa: string | null;
    servicio: string | null;
  } | null;
  participant_status?: "final" | "draft" | null;
  participants_count?: number;
  attachments_count?: number;
}

interface ManageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: ManageUploadAssignment | null;
  onSuccess: () => void;
}

export default function ManageUploadModal({
  isOpen,
  onClose,
  assignment,
  onSuccess,
}: ManageUploadModalProps) {
  const [loadingAction, setLoadingAction] = useState<"reopen" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [certCount, setCertCount] = useState<number | null>(null);
  const [checkingCerts, setCheckingCerts] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  useEffect(() => {
    if (!isOpen || !assignment) {
      setError(null);
      setSuccessMsg(null);
      setCertCount(null);
      setConfirmWipe(false);
      setLoadingAction(null);
      return;
    }

    let isMounted = true;
    setCheckingCerts(true);
    getOsiCertificatesCount(assignment.osi_id, assignment.osi?.nro_osi)
      .then((count) => {
        if (isMounted) setCertCount(count);
      })
      .catch((err) => {
        console.error("Error loading cert count:", err);
      })
      .finally(() => {
        if (isMounted) setCheckingCerts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, assignment]);

  if (!isOpen || !assignment) return null;

  const facilitadorName = assignment.facilitadores?.nombre_apellido
    ? toTitleCase(assignment.facilitadores.nombre_apellido)
    : "Facilitador asignado";
  const osiNumber = assignment.osi?.nro_osi || `OSI #${assignment.osi_id}`;
  const empresaName = assignment.osi?.nombre_empresa || "Empresa cliente";

  const handleReopen = async () => {
    setError(null);
    setLoadingAction("reopen");
    try {
      const res = await reopenFacilitadorOSI(assignment.osi_id, assignment.facilitador_id);
      if (res.error) {
        setError(res.error);
        setLoadingAction(null);
      } else {
        setSuccessMsg(res.message || "Servicio reabierto con éxito.");
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoadingAction(null);
    }
  };

  const handleReset = async () => {
    if (!confirmWipe) {
      setError("Debes marcar la casilla de confirmación para proceder con el reinicio total.");
      return;
    }
    setError(null);
    setLoadingAction("reset");
    try {
      const res = await resetFacilitadorOSI(
        assignment.osi_id,
        assignment.facilitador_id,
        true,
        assignment.osi?.nro_osi,
      );
      if (res.error) {
        setError(res.error);
        setLoadingAction(null);
      } else {
        setSuccessMsg(res.message || "Carga reiniciada por completo.");
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoadingAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-sm">
              <RotateCcw className="w-5 h-5 text-sky-700" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Gestionar Carga de Facilitador
              </h3>
              <p className="text-xs text-slate-500">
                {osiNumber} — {empresaName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loadingAction !== null}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Assignment Summary Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-800">
                  {facilitadorName}
                </span>
                {assignment.facilitadores?.cedula && (
                  <span className="text-xs text-slate-500">
                    ({assignment.facilitadores.cedula})
                  </span>
                )}
              </div>
              <div>
                {assignment.participant_status === "final" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    Finalizado (Bloqueado)
                  </span>
                ) : assignment.participant_status === "draft" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
                    ✎ Borrador en curso
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-200/70 px-2.5 py-0.5 rounded-full">
                    Sin carga registrada
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Participantes: <strong>{assignment.participants_count ?? 0}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Soportes adjuntos: <strong>{assignment.attachments_count ?? 0}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Certificate Warning (if any) */}
          {checkingCerts ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Verificando certificados asociados...</span>
            </div>
          ) : certCount && certCount > 0 ? (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900 text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold">
                  Atención: Hay {certCount} certificado(s) emitidos para esta OSI.
                </span>
                <p className="text-amber-800 leading-relaxed">
                  Si la información de los participantes fue invertida o incorrecta, considera anular o reemitir los certificados correspondientes desde Gestión de Certificados para mantener la integridad de los números de control.
                </p>
              </div>
            </div>
          ) : null}

          {/* Messages */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action Options */}
          <div className="space-y-4 pt-1">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Selecciona una acción:
            </h4>

            {/* Option A: Reopen for editing */}
            <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/50 hover:bg-sky-50 transition-colors space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Unlock className="w-4 h-4" />
                </span>
                <div className="space-y-1 flex-1 min-w-0">
                  <h5 className="text-sm font-bold text-sky-950">
                    Opción 1: Reabrir para edición (Quitar bloqueo)
                  </h5>
                  <p className="text-xs text-sky-800 leading-relaxed">
                    Mantiene los participantes y archivos subidos, pero revierte el estado a <strong>Borrador</strong>. El facilitador podrá entrar a su portal, corregir participantes invertidos o notas, reemplazar archivos y volver a enviar formalmente.
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleReopen}
                  disabled={loadingAction !== null}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {loadingAction === "reopen" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5" />
                  )}
                  Reabrir y Desbloquear
                </button>
              </div>
            </div>

            {/* Option B: Full reset */}
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50/60 transition-colors space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <RotateCcw className="w-4 h-4" />
                </span>
                <div className="space-y-1 flex-1 min-w-0">
                  <h5 className="text-sm font-bold text-rose-950">
                    Opción 2: Reiniciar carga por completo (Desde cero)
                  </h5>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    Elimina todos los participantes registrados, borra los archivos adjuntos (lista, calificaciones, fotos) del almacenamiento y revierte los pasos del proceso para que el facilitador cargue todo desde cero.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-rose-200/60 space-y-2.5">
                <label className="flex items-center gap-2.5 text-xs text-rose-900 font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmWipe}
                    onChange={(e) => setConfirmWipe(e.target.checked)}
                    className="w-4 h-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500 accent-rose-600"
                  />
                  <span>
                    Confirmo que deseo purgar todos los datos y archivos de esta carga.
                  </span>
                </label>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={!confirmWipe || loadingAction !== null}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {loadingAction === "reset" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    Reiniciar desde Cero
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loadingAction !== null}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
