"use client";

import React, { useState, useEffect } from "react";
import { OSIManagement, SurveyMode } from "@/types";
import { X, Copy, Download, ExternalLink, QrCode, FileText, Users, Layers } from "lucide-react";
import QRCode from "qrcode";
import Link from "next/link";
import { getSurveyMode, setSurveyMode as setSurveyModeAction } from "@/app/actions/surveys";

interface OSISurveyModalProps {
  osi: OSIManagement | null;
  /** Number of sessions for this OSI. If >1, shows a mode selector (unique vs per-session). */
  sessionCount?: number;
  onClose: () => void;
}

export default function OSISurveyModal({ osi, sessionCount = 1, onClose }: OSISurveyModalProps) {
  const [qrUrl, setQrUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [selectedSession, setSelectedSession] = useState<number>(1);
  const [surveyMode, setSurveyMode] = useState<SurveyMode>("unique");
  const [modeLoaded, setModeLoaded] = useState(false);

  // Use production domain for QR code even in localhost, or environment variable if set
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://prisma.shadevenezuela.com.ve";
  const hasMultipleSessions = sessionCount > 1;
  // Per-session QRs only when the OSI has multiple sessions AND the user chose per-session mode.
  const isPerSession = hasMultipleSessions && surveyMode === "per_session";

  // Build the survey URL based on the selected mode/session
  const buildSurveyUrl = (origin: string, nroSesion: number) => {
    const base = origin.includes("localhost") ? origin : baseUrl;
    return isPerSession
      ? `${base}/survey/${osi?.id_osi}?sesion=${nroSesion}`
      : `${base}/survey/${osi?.id_osi}`;
  };

  // Load persisted survey mode when an OSI is opened
  useEffect(() => {
    if (!osi) return;
    setModeLoaded(false);
    getSurveyMode(osi.id_osi)
      .then((mode) => {
        setSurveyMode(mode);
        setModeLoaded(true);
      })
      .catch(() => setModeLoaded(true));
  }, [osi]);

  // Regenerate QR when OSI, session, or mode changes
  useEffect(() => {
    if (osi) {
      // The QR code ALWAYS points to production (as per requirements)
      const url = buildSurveyUrl("", selectedSession);
      QRCode.toDataURL(url, { width: 300, margin: 2 }, (err, url) => {
        if (err) console.error(err);
        else setQrUrl(url);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [osi, selectedSession, baseUrl, isPerSession]);

  if (!osi) return null;

  // For the clickable link in the modal, use current origin if on localhost to allow testing
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const clickableUrl = buildSurveyUrl(currentOrigin, selectedSession);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(clickableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = isPerSession
      ? `QR_Encuesta_OSI_${osi.nro_osi}_Sesion${selectedSession}.png`
      : `QR_Encuesta_OSI_${osi.nro_osi}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleModeChange = (mode: SurveyMode) => {
    setSurveyMode(mode);
    // Persist the choice (fire-and-forget; optimistic update)
    persistSurveyMode(osi.id_osi, mode);
  };

  const persistSurveyMode = async (osiId: number, mode: SurveyMode) => {
    try {
      await setSurveyModeAction(osiId, mode);
    } catch (err) {
      console.error("Failed to persist survey mode:", err);
    }
  };

  // Pills for a small number of sessions; dropdown for many (prevents row explosion on mobile)
  const usePills = sessionCount <= 8;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-gray-50 flex-none">
          <div className="min-w-0 pr-2">
            <h2 className="text-lg font-bold text-gray-900 truncate">Encuesta de Satisfacción</h2>
            <p className="text-sm text-gray-500 truncate">OSI: {osi.nro_osi}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-none p-2.5 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors text-gray-700"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Mode selector — only for multi-session OSIs */}
          {hasMultipleSessions && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                Modo de encuesta
              </label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => handleModeChange("unique")}
                  disabled={!modeLoaded}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                    surveyMode === "unique"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                  } ${!modeLoaded ? "opacity-60" : ""}`}
                >
                  <Users className={`w-4 h-4 mt-0.5 flex-shrink-0 ${surveyMode === "unique" ? "text-blue-600" : "text-gray-400"}`} />
                  <div className="min-w-0">
                    <p className={`text-sm font-bold ${surveyMode === "unique" ? "text-blue-700" : "text-gray-800"}`}>
                      Un QR para toda la OSI
                    </p>
                    <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
                      Mismo grupo de participantes en todas las sesiones
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("per_session")}
                  disabled={!modeLoaded}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                    surveyMode === "per_session"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                  } ${!modeLoaded ? "opacity-60" : ""}`}
                >
                  <Layers className={`w-4 h-4 mt-0.5 flex-shrink-0 ${surveyMode === "per_session" ? "text-blue-600" : "text-gray-400"}`} />
                  <div className="min-w-0">
                    <p className={`text-sm font-bold ${surveyMode === "per_session" ? "text-blue-700" : "text-gray-800"}`}>
                      Un QR por sesión
                    </p>
                    <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
                      Grupos o facilitador diferentes por sesión
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Session selector — only in per-session mode */}
          {isPerSession && (
            <div className="flex flex-col items-center gap-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                Selecciona la sesión
              </label>
              {usePills ? (
                <div className="flex flex-wrap gap-2 justify-center">
                  {Array.from({ length: sessionCount }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => setSelectedSession(n)}
                      className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                        selectedSession === n
                          ? "bg-blue-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              ) : (
                <select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(Number(e.target.value))}
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: sessionCount }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      Sesión {n}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* QR Code Section */}
          <div className="flex flex-col items-center gap-5">
            <div className="p-3 bg-white border-2 border-gray-100 rounded-2xl shadow-inner">
              {qrUrl ? (
                <img src={qrUrl} alt="QR Survey" className="w-40 h-40" />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center bg-gray-50 rounded-xl">
                  <QrCode className="w-10 h-10 text-gray-300 animate-pulse" />
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <button
                onClick={handleDownloadQR}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95 w-full sm:flex-1"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar QR
              </button>
              <Link
                href={`/dashboard/capacitacion/gestion-osi/${osi.id_osi}/survey-view`}
                className="flex items-center justify-center gap-1.5 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-full text-sm font-bold hover:bg-blue-50 transition-all active:scale-95 w-full sm:flex-1"
              >
                <FileText className="w-3.5 h-3.5" />
                Ver Resultados
              </Link>
            </div>
          </div>

          {/* Link Section */}
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Enlace de la Encuesta</label>
            <div className="flex gap-2">
              <div className="flex-grow p-3 bg-gray-50 border rounded-xl text-sm font-mono text-gray-600 truncate">
                {clickableUrl}
              </div>
              <button
                onClick={handleCopyLink}
                className={`
                  p-3 rounded-xl transition-all border flex items-center justify-center min-w-[44px] flex-none
                  ${copied
                    ? "bg-green-50 border-green-200 text-green-600"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }
                `}
                title="Copiar enlace"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
              <a
                href={clickableUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center min-w-[44px] flex-none"
                title="Abrir enlace"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
            {currentOrigin.includes("localhost") && (
               <p className="text-[10px] text-yellow-600 font-medium">
                 💡 En localhost el QR apunta a producción, pero el botón &quot;Abrir enlace&quot; funciona localmente.
               </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
