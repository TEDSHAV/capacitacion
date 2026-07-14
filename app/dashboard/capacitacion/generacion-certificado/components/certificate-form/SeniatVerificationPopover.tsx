"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, RefreshCw, AlertCircle, Zap } from "lucide-react";
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
  sessionId: initialSessionId,
  onVerify,
  onClose,
  onSessionRestart,
  initialCaptchaImage,
}: SeniatVerificationPopoverProps) => {
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaImage, setCaptchaImage] = useState(initialCaptchaImage || "");
  const [pnpSessionId, setPnpSessionId] = useState<string | null>(null);
  const [pnpChallenge, setPnpChallenge] = useState<string | null>(null);
  const [pnpAnswer, setPnpAnswer] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isFastVerifying, setIsFastVerifying] = useState(false);
  const [isLoadingCaptcha, setIsLoadingCaptcha] = useState(!initialCaptchaImage && !initialSessionId);
  const [isLoadingPnp, setIsLoadingPnp] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"seniat" | "pnp">("seniat");

  // Sync state if initial props change (essential for pre-warmed sessions)
  useEffect(() => {
    if (initialSessionId) setSessionId(initialSessionId);
    if (initialCaptchaImage) setCaptchaImage(initialCaptchaImage);
  }, [initialSessionId, initialCaptchaImage]);

  useEffect(() => {
    if (!initialSessionId && !initialCaptchaImage) {
      loadNewCaptcha();
    }
  }, [initialSessionId, initialCaptchaImage]);

  const loadNewCaptcha = async () => {
    setIsLoadingCaptcha(true);
    setError("");
    try {
      const result = await onSessionRestart();
      setSessionId(result.sessionId);
      setCaptchaImage(result.captchaImage);
      setCaptchaInput("");
    } catch (err) {
      setError("Error al conectar con SENIAT. El servicio podría estar saturado.");
    } finally {
      setIsLoadingCaptcha(false);
    }
  };

  const startPnpSession = async () => {
    setIsLoadingPnp(true);
    setError("");
    setView("pnp");
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
      setView("seniat");
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
        <h4 className="text-sm font-bold text-gray-900">
          {view === "seniat" ? "Código SENIAT" : "Reto Matemático"}
        </h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 rounded-full p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        {view === "seniat" ? (
          <>
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
          </>
        ) : (
          <>
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
          </>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
            {error}
          </p>
        )}

        {/* Action Buttons */}
        {view === "seniat" ? (
          <>
            <Button
              onClick={handleVerify}
              disabled={isVerifying || !captchaInput || isLoadingCaptcha || isFastVerifying}
              className="w-full text-sm h-9"
              size="sm"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                  Verificando...
                </>
              ) : (
                "Verificar RIF (SENIAT)"
              )}
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white px-2 text-gray-400 font-bold">Ó prueba</span>
              </div>
            </div>

            <Button
              onClick={startPnpSession}
              disabled={isVerifying || isLoadingCaptcha || isFastVerifying}
              variant="outline"
              className="w-full text-sm h-9 border-blue-200 text-blue-700 hover:bg-blue-50"
              size="sm"
            >
              {isLoadingPnp ? (
                <>
                  <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                  Cargando...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2 text-amber-500 fill-amber-500" />
                  Consulta Rápida (Sin Captcha)
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setView("seniat");
                setError("");
              }}
              variant="ghost"
              className="flex-1 text-xs text-gray-500 hover:bg-gray-100"
              disabled={isFastVerifying}
            >
              Volver a SENIAT
            </Button>
            <Button
              onClick={() => (pnpSessionId ? handleFastVerify() : startPnpSession())}
              disabled={isFastVerifying || (pnpSessionId && !pnpAnswer) || isLoadingPnp}
              className="flex-1 text-sm bg-blue-600 hover:bg-blue-700"
            >
              {isFastVerifying ? (
                <RefreshCw className="animate-spin h-4 w-4" />
              ) : !pnpSessionId ? (
                "Reintentar"
              ) : (
                "Validar"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
