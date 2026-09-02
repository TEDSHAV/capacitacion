"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CertificateManagement } from "@/types";
import { anularCertificateAction } from "@/app/actions/certificados";
import { Loader2, X, AlertTriangle, Ban } from "lucide-react";
import { toTitleCase } from "@/utils/string-utils";

interface AnularCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Certificado objetivo a anular */
  certificate?: CertificateManagement | null;
}

const MIN_MOTIVO_LENGTH = 5;

export function AnularCertificateModal({
  isOpen,
  onClose,
  onSuccess,
  certificate,
}: AnularCertificateModalProps) {
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state whenever the modal opens or target changes
  useEffect(() => {
    if (isOpen) {
      setMotivo("");
      setError(null);
      setSubmitting(false);
    }
  }, [isOpen, certificate?.id]);

  const trimmedMotivo = motivo.trim();
  const isValid = trimmedMotivo.length >= MIN_MOTIVO_LENGTH;

  // Resumen del objetivo
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

  const handleSubmit = async () => {
    if (!isValid) {
      setError(
        `El motivo debe tener al menos ${MIN_MOTIVO_LENGTH} caracteres.`,
      );
      return;
    }

    if (!certificate) {
      setError("No se especificó un certificado para anular.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const result = await anularCertificateAction(certificate.id, trimmedMotivo);

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.message);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Error inesperado al anular.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && !submitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all"
      onKeyDown={handleKeyDown}
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <Ban className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Anular Certificado
              </h2>
              <p className="text-xs text-gray-500">
                Esta acción no se puede deshacer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto">
          {/* Advertencia */}
          <div className="mb-4 flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p>
                Se anulará el certificado y su carnet asociado. El
                participante desaparecerá de los documentos adicionales
                regenerados (certificado de competencias, nota de entrega,
                validación de datos). El registro se conserva para auditoría
                con el motivo, usuario y fecha de anulación.
              </p>
            </div>
          </div>

          {/* Resumen del objetivo */}
          {certificate && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Certificado a anular
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-gray-500">Participante</dt>
                <dd className="font-medium text-gray-900">
                  {participantName ? toTitleCase(participantName) : "-"}
                </dd>
                <dt className="text-gray-500">Cédula</dt>
                <dd className="font-medium text-gray-900">
                  {formatCedula(participantCedula, participantNacionalidad)}
                </dd>
                <dt className="text-gray-500">Curso</dt>
                <dd className="font-medium text-gray-900">{courseName ?? "-"}</dd>
                <dt className="text-gray-500">Empresa</dt>
                <dd className="font-medium text-gray-900">{companyName ?? "-"}</dd>
                <dt className="text-gray-500">N° Control</dt>
                <dd className="font-medium text-gray-900">
                  {certificate.nro_control ?? "-"}
                </dd>
                <dt className="text-gray-500">OSI</dt>
                <dd className="font-medium text-gray-900">
                  {certificate.nro_osi ?? "-"}
                </dd>
              </dl>
            </div>
          )}

          {/* Motivo */}
          <div className="mb-2">
            <label
              htmlFor="motivo-anulacion"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Motivo de anulación <span className="text-red-600">*</span>
            </label>
            <textarea
              id="motivo-anulacion"
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                if (error) setError(null);
              }}
              disabled={submitting}
              rows={4}
              placeholder="Explique el motivo de la anulación (mínimo 5 caracteres)..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-50 disabled:cursor-not-allowed resize-none"
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-gray-400">
                {trimmedMotivo.length}/{MIN_MOTIVO_LENGTH} caracteres mínimos
              </span>
              {trimmedMotivo.length > 0 && !isValid && (
                <span className="text-amber-600">
                  Motivo demasiado corto
                </span>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0 bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !isValid}
            className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Anulando...
              </>
            ) : (
              <>
                <Ban className="h-4 w-4 mr-2" />
                Anular
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
