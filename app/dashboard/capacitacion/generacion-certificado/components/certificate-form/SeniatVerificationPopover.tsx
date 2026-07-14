"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, RefreshCw, AlertCircle, Zap } from "lucide-react";
import { ExtractedParticipant, ParticipantVerificationResult } from "@/types";

interface SeniatVerificationPopoverProps {
  participant: ExtractedParticipant;
  onVerify: (result: ParticipantVerificationResult) => void;
  onClose: () => void;
  previewUrl?: string;
}

export const SeniatVerificationPopover = ({
  participant,
  onVerify,
  onClose,
}: SeniatVerificationPopoverProps) => {
  const [pnpSessionId, setPnpSessionId] = useState<string | null>(null);
  const [pnpChallenge, setPnpChallenge] = useState<string | null>(null);
  const [pnpAnswer, setPnpAnswer] = useState("");
  const [isFastVerifying, setIsFastVerifying] = useState(false);
  const [isLoadingPnp, setIsLoadingPnp] = useState(false);
  const [error, setError] = useState("");

  // Start PNP session immediately on mount
  useEffect(() => {
    startPnpSession();
  }, []);

  const startPnpSession = async () => {
    setIsLoadingPnp(true);
    setError("");
    try {
      const response = await fetch("/api/citizen/session");
      const data = await response.json();
      if (data.success) {
        setPnpSessionId(data.sessionId);
        setPnpChallenge(data.challenge);
        
        // If it was auto-solved, we can proceed immediately
        if (data.autoSolved && data.answer) {
          await handleFastVerify(data.sessionId, data.answer);
        }
      } else {
        throw new Error(data.error || "Error al iniciar sesión alternativa");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al conectar con el servicio alternativo");
    } finally {
      setIsLoadingPnp(false);
    }
  };

  const handleFastVerify = async (sId?: string, ans?: string) => {
    const finalSessionId = sId || pnpSessionId;
    const finalAnswer = ans || pnpAnswer;

    if (!finalSessionId || !finalAnswer) {
      setError("Por favor resuelve el reto matemático");
      return;
    }

    setIsFastVerifying(true);
    setError("");
    try {
      const response = await fetch("/api/citizen/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idNumber: participant.idNumber,
          sessionId: finalSessionId,
          answer: finalAnswer,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "No se pudo realizar la consulta rápida");
      }

      const result: ParticipantVerificationResult = {
        rif: participant.idNumber,
        ocrName: participant.name,
        seniatName: data.name || "Ciudadano Encontrado",
        status: "verified",
      };

      onVerify(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error en consulta rápida";
      setError(errorMessage);
      
      // If session is truly expired, clear it, otherwise keep it for manual retry
      if (errorMessage.toLowerCase().includes("expirada") || errorMessage.toLowerCase().includes("no encontrada")) {
        setPnpSessionId(null);
        setPnpChallenge(null);
        setPnpAnswer("");
      }
    } finally {
      setIsFastVerifying(false);
    }
  };

  return (
    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-[60] bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-80 animate-in fade-in zoom-in duration-200">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-bold text-gray-900">
          Validación de Identidad
        </h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 rounded-full p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        {/* PNP Challenge */}
        <div className="flex flex-col items-center bg-blue-50 p-4 rounded border border-blue-100">
          {isLoadingPnp ? (
            <div className="h-12 flex items-center justify-center">
              <RefreshCw className="animate-spin h-5 w-5 text-blue-500" />
            </div>
          ) : pnpChallenge ? (
            <div className="text-center">
              <p className="text-xs text-blue-600 mb-1 font-semibold uppercase">Resuelve:</p>
              <p className="text-xl font-bold text-blue-900 tracking-wider">{pnpChallenge}</p>
            </div>
          ) : (
            <div className="text-red-500 text-xs text-center">
              <AlertCircle className="h-5 w-5 mx-auto mb-1" />
              No se pudo cargar el reto
            </div>
          )}
        </div>

        {/* PNP Input */}
        <input
          type="text"
          value={pnpAnswer}
          onChange={(e) => setPnpAnswer(e.target.value)}
          placeholder="Resultado"
          className="w-full px-3 py-2 border border-blue-300 rounded text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isFastVerifying || isLoadingPnp}
          onKeyDown={(e) => e.key === "Enter" && handleFastVerify()}
          autoFocus
        />

        {/* Error */}
        {error && (
          <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
            {error}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => (pnpSessionId ? handleFastVerify() : startPnpSession())}
            disabled={isFastVerifying || (pnpSessionId && !pnpAnswer) || isLoadingPnp}
            className="w-full text-sm bg-blue-600 hover:bg-blue-700"
          >
            {isFastVerifying ? (
              <>
                <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                Validando...
              </>
            ) : !pnpSessionId ? (
              "Reintentar"
            ) : (
              "Validar Identidad"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
