"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CertificateManagement } from "@/types";
import { reactivarCertificateAction } from "@/app/actions/certificados";
import { Loader2, X, RotateCcw, CheckCircle2 } from "lucide-react";
import { toTitleCase } from "@/utils/string-utils";

interface ReactivarCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Callback al reactivar exitosamente con el mensaje del servidor */
  onSuccess: (result: { message: string; annulledCarnets?: number }) => void;
  /** Certificado objetivo a reactivar */
  certificate?: CertificateManagement | null;
}

export function ReactivarCertificateModal({
  isOpen,
  onClose,
  onSuccess,
  certificate,
}: ReactivarCertificateModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSubmitting(false);
    }
  }, [isOpen, certificate?.id]);

  const participant = certificate?.participantes_certificados;
  const participantName = participant
    ? Array.isArray(participant)
      ? participant[0]?.nombre
      : participant.nombre
    : null;
  const participantCedula = participant
    ? Array.isArray(participant)
      ? participant[0]?.cedula
      : participant.cedula
    : null;
  const participantNacionalidad = participant
    ? Array.isArray(participant)
      ? participant[0]?.nacionalidad
      : participant.nacionalidad
    : null;

  const course = certificate?.catalogo_servicios;
  const courseName = course
    ? Array.isArray(course)
      ? course[0]?.nombre
      : course.nombre
    : null;

  const company = certificate?.empresas;
  const companyName = company
    ? Array.isArray(company)
      ? company[0]?.razon_social
      : company.razon_social
    : null;

  const formatCedula = (cedula: string | null | undefined, nac: string | null | undefined) => {
    if (!cedula) return "-";
    const prefix = nac === "extranjero" ? "E" : "V";
    return `${prefix}-${cedula}`;
  };

  const handleReactivar = async () => {
    if (!certificate) {
      setError("No se especificó un certificado para reactivar.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const result = await reactivarCertificateAction(certificate.id);

      if (result.success) {
        onSuccess(result);
        onClose();
      } else {
        setError(result.message || "Error al reactivar el certificado.");
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Error inesperado al reactivar.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !certificate) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Reactivar Certificado
              </h3>
              <p className="text-xs text-gray-500">
                Restablecer el certificado a estado activo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Al reactivar, el certificado y su carnet asociado volverán a estar <strong>Activos y Válidos</strong> en el sistema y para verificación QR pública.
            </span>
          </div>

          {/* Certificate details */}
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">N° Control:</span>
              <span className="font-mono font-bold text-gray-900">
                {certificate.nro_control || "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Participante:</span>
              <span className="font-semibold text-gray-900">
                {participantName ? toTitleCase(participantName) : "-"} (
                {formatCedula(participantCedula, participantNacionalidad)})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Curso:</span>
              <span className="font-semibold text-gray-900 text-right truncate max-w-[260px]">
                {courseName || "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Empresa:</span>
              <span className="font-semibold text-gray-900 text-right truncate max-w-[260px]">
                {companyName || "-"}
              </span>
            </div>
            {certificate.motivo_anulacion && (
              <div className="pt-2 border-t border-gray-200">
                <span className="text-gray-500 font-medium block mb-0.5">Motivo anterior de anulación:</span>
                <span className="text-gray-700 italic bg-white p-2 rounded border border-gray-200 block">
                  "{certificate.motivo_anulacion}"
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 p-4 bg-gray-50 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleReactivar}
            disabled={submitting}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Reactivando...
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Confirmar Reactivación
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
