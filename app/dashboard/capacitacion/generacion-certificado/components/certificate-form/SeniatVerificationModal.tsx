"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, RefreshCw, AlertCircle } from "lucide-react";
import { ExtractedParticipant, ParticipantVerificationResult } from "@/types";

interface SeniatVerificationModalProps {
  isOpen: boolean;
  participant: ExtractedParticipant;
  sessionId: string | null;
  onVerify: (result: ParticipantVerificationResult) => void;
  onClose: () => void;
  onSessionRestart: () => Promise<{ sessionId: string; captchaImage: string }>;
  initialCaptchaImage?: string;
}

export const SeniatVerificationModal = ({
  isOpen,
  participant,
  sessionId,
  onVerify,
  onClose,
  onSessionRestart,
  initialCaptchaImage,
}: SeniatVerificationModalProps) => {
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaImage, setCaptchaImage] = useState(initialCaptchaImage || "");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoadingCaptcha, setIsLoadingCaptcha] =
    useState(!initialCaptchaImage);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initialCaptchaImage && isOpen) {
      loadNewCaptcha();
    }
  }, [initialCaptchaImage, isOpen]);

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
        status: data.status,
        error: data.error,
      };

      onVerify(result);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setCaptchaInput("");
    setError("");
    setCaptchaImage("");
    setIsLoadingCaptcha(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Verificación SENIAT
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              RIF:{" "}
              <span className="font-mono font-semibold">
                {participant.idNumber}
              </span>
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Participant Info */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Participante:</span>{" "}
              {participant.name}
            </p>
          </div>

          {/* Captcha Section */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-900">
              Código de Verificación
            </label>
            <div className="flex flex-col items-center bg-gray-50 p-6 rounded-lg border border-gray-200">
              {isLoadingCaptcha ? (
                <div className="h-24 flex items-center justify-center">
                  <RefreshCw className="animate-spin h-6 w-6 text-blue-500" />
                </div>
              ) : captchaImage ? (
                <div className="relative group">
                  <img
                    src={captchaImage}
                    alt="Captcha"
                    className="h-24 w-auto object-contain rounded"
                  />
                  <button
                    onClick={loadNewCaptcha}
                    className="absolute -top-2 -right-2 bg-white border border-gray-300 rounded-full p-2 shadow-md hover:shadow-lg hover:bg-gray-50 transition-all"
                    title="Recargar captcha"
                  >
                    <RefreshCw className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              ) : (
                <div className="h-24 flex flex-col items-center justify-center text-red-500 text-sm">
                  <AlertCircle className="h-6 w-6 mb-2" />
                  Error al cargar
                  <button
                    onClick={loadNewCaptcha}
                    className="text-blue-500 hover:underline mt-2 text-xs font-semibold"
                  >
                    Reintentar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Input */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Ingresa el código
            </label>
            <input
              type="text"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              placeholder="Ej: abc123"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-lg font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              disabled={isVerifying || isLoadingCaptcha}
              onKeyDown={(e) =>
                e.key === "Enter" && !isVerifying && handleVerify()
              }
              autoFocus
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 text-gray-700 border-gray-300 hover:bg-gray-50"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleVerify}
            disabled={isVerifying || !captchaInput || isLoadingCaptcha}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
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
    </div>
  );
};
