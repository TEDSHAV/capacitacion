"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { ExtractedParticipant, ParticipantVerificationResult } from "@/types";

interface SeniatVerificationPopoverProps {
  participant: ExtractedParticipant;
  onVerify: (result: ParticipantVerificationResult) => void;
  onClose: () => void;
  previewUrl?: string;
  useFixedPosition?: boolean;
}

export const SeniatVerificationPopover = ({
  participant,
  onVerify,
  onClose,
  useFixedPosition = false,
}: SeniatVerificationPopoverProps) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = useCallback(async () => {
    if (!participant.idNumber) {
      setError("Número de cédula no disponible");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const response = await fetch("/api/citizen/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idNumber: participant.idNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.name) {
        const errorMsg =
          data.error === "RECORD_NOT_FOUND"
            ? "No se encontró el ciudadano en el registro ni en el histórico."
            : data.error || "No se encontraron datos para esta cédula.";
        throw new Error(errorMsg);
      }

      const result: ParticipantVerificationResult = {
        rif: participant.idNumber,
        ocrName: participant.name,
        seniatName: data.name,
        status: "verified",
      };

      onVerify(result);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error al verificar la identidad del participante.";
      setError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  }, [participant.idNumber, participant.name, onVerify]);

  // Run verification immediately on mount
  useEffect(() => {
    handleVerify();
  }, [handleVerify]);

  return (
    <div
      className={
        useFixedPosition
          ? "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[200] bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-[90vw] sm:w-80 max-w-[320px] animate-in fade-in zoom-in duration-200"
          : "absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-[60] bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-[90vw] sm:w-80 max-w-[320px] animate-in fade-in zoom-in duration-200"
      }
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-bold text-gray-900">
          Validación de Identidad
        </h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 rounded-full p-1 transition-colors"
          title="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Participant info preview */}
      <div className="bg-slate-50 border border-slate-200 rounded p-2.5 mb-3 text-xs">
        <div className="text-gray-500 font-medium">Cédula / Documento:</div>
        <div className="font-bold text-gray-900 text-sm">{participant.idNumber}</div>
        {participant.name && (
          <div className="text-gray-600 mt-1 truncate" title={participant.name}>
            <span className="text-gray-400">Nombre: </span>
            {participant.name}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {/* Verification Status */}
        {isVerifying ? (
          <div className="flex flex-col items-center justify-center p-4 bg-blue-50/60 rounded border border-blue-100 text-center">
            <Loader2 className="animate-spin h-6 w-6 text-blue-600 mb-2" />
            <p className="text-xs font-semibold text-blue-900">
              Consultando registro de identidad...
            </p>
            <p className="text-[11px] text-blue-600 mt-0.5">
              Buscando en caché, API e histórico
            </p>
          </div>
        ) : error ? (
          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-900">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-tight">{error}</div>
            </div>
          </div>
        ) : null}

        {/* Action Buttons */}
        {!isVerifying && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex-1 text-xs"
            >
              Cerrar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleVerify}
              className="flex-1 text-xs bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Reintentar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

