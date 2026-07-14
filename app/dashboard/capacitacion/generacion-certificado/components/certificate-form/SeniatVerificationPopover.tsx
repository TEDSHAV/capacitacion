"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, RefreshCw, AlertCircle } from "lucide-react";
import { ExtractedParticipant, ParticipantVerificationResult } from "@/types";

interface SeniatVerificationPopoverProps {
  participant: ExtractedParticipant;
  sessionId: string | null;
  onVerify: (result: ParticipantVerificationResult) => void;
  onClose: () => void;
  onSessionRestart: () => Promise<{ sessionId: string; captchaImage: string }>;
  initialCaptchaImage?: string;
  previewUrl?: string;
}

export const SeniatVerificationPopover = ({
  participant,
  sessionId,
  onVerify,
  onClose,
  onSessionRestart,
  initialCaptchaImage,
}: SeniatVerificationPopoverProps) => {
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaImage, setCaptchaImage] = useState(initialCaptchaImage || "");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoadingCaptcha, setIsLoadingCaptcha] =
    useState(!initialCaptchaImage);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initialCaptchaImage) {
      loadNewCaptcha();
    }
  }, [initialCaptchaImage]);

  const loadNewCaptcha = async () => {
    setIsLoadingCaptcha(true);
    setError("");
    try {
      const result = await onSessionRestart();
      setCaptchaImage(result.captchaImage);
      setCaptchaInput("");
    } catch (err) {
      setError("Error al cargar captcha");
    } finally {
      setIsLoadingCaptcha(false);
    }
  };

  const handleVerify = async () => {
    if (!captchaInput) {
      setError("Ingresa el código");
      return;
    }

    if (!sessionId) {
      setError("Sesión no válida");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const response = await fetch("/api/seniat/verify-participant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          rif: participant.idNumber,
          captcha: captchaInput,
        }),
      });

      const data = await response.json();

      if (data.error === "Captcha incorrecto") {
        setError("Captcha incorrecto. Intenta de nuevo.");
        setCaptchaInput("");
        // Load new captcha on failure
        await loadNewCaptcha();
        return;
      }

      if (!response.ok || (data.success === false && data.status === "error")) {
        throw new Error(data.error || "Error en verificación");
      }

      const result: ParticipantVerificationResult = {
        rif: participant.idNumber,
        ocrName: participant.name,
        seniatName: data.seniatName,
        status: data.status, // "verified", "not_found", etc.
        error: data.error,
      };

      onVerify(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-[60] bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-80 animate-in fade-in zoom-in duration-200">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-bold text-gray-900">Código SENIAT</h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 rounded-full p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        {/* Captcha Image */}
        <div className="flex flex-col items-center bg-gray-50 p-3 rounded border border-gray-200">
          {isLoadingCaptcha ? (
            <div className="h-16 flex items-center justify-center">
              <RefreshCw className="animate-spin h-5 w-5 text-blue-500" />
            </div>
          ) : captchaImage ? (
            <div className="relative group">
              <img
                src={captchaImage}
                alt="Captcha"
                className="h-16 w-auto object-contain rounded"
              />
              <button
                onClick={loadNewCaptcha}
                className="absolute -top-1 -right-1 bg-white border border-gray-200 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                title="Recargar captcha"
              >
                <RefreshCw className="h-3 w-3 text-gray-600" />
              </button>
            </div>
          ) : (
            <div className="h-16 flex flex-col items-center justify-center text-red-500 text-xs">
              <AlertCircle className="h-5 w-5 mb-1" />
              Error al cargar
              <button
                onClick={loadNewCaptcha}
                className="text-blue-500 hover:underline mt-1"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>

        {/* Input */}
        <input
          type="text"
          value={captchaInput}
          onChange={(e) => setCaptchaInput(e.target.value)}
          placeholder="Código"
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isVerifying || isLoadingCaptcha}
          onKeyDown={(e) => e.key === "Enter" && handleVerify()}
          autoFocus
        />

        {/* Error */}
        {error && (
          <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
            {error}
          </p>
        )}

        {/* Verify Button */}
        <Button
          onClick={handleVerify}
          disabled={isVerifying || !captchaInput || isLoadingCaptcha}
          className="w-full text-sm h-9"
          size="sm"
        >
          {isVerifying ? (
            <>
              <RefreshCw className="animate-spin h-4 w-4 mr-2" />
              Verificando...
            </>
          ) : (
            "Verificar RIF"
          )}
        </Button>
      </div>
    </div>
  );
};
