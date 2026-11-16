"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  QrCode,
  Laptop,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Users,
  CheckCircle2,
  Maximize2,
} from "lucide-react";
import OSIExamQRModal from "@/app/dashboard/capacitacion/gestion-examenes/OSIExamQRModal";

interface FacilitadorExamCardProps {
  osi: {
    id_osi: number;
    nro_osi: string;
    servicio: string;
    nombre_empresa: string;
  };
  examTitle: string;
  submissionsCount: number;
  totalQuestions?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function FacilitadorExamCard({
  osi,
  examTitle,
  submissionsCount,
  totalQuestions,
  onRefresh,
  isRefreshing,
}: FacilitadorExamCardProps) {
  const [showQRModal, setShowQRModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://prisma.shadevenezuela.com.ve";
  const cleanNro = osi.nro_osi || String(osi.id_osi);
  const mobileUrl = `${baseUrl}/evaluacion/${cleanNro}`;
  const kioskUrl = `${baseUrl}/evaluacion/${cleanNro}/kiosk`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(mobileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  return (
    <>
      <div className="rounded-2xl p-4 sm:p-5 bg-white text-slate-900 shadow-sm border border-slate-200/90 relative overflow-hidden">
        {/* Top Accent Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 pt-1">
          {/* Info Side */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                <Sparkles className="w-3 h-3 text-teal-600" />
                Evaluación Digital en Aula
              </span>
              <span className="text-xs text-slate-500 font-mono bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md">
                /evaluacion/{cleanNro}
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              {examTitle}
            </h2>

            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-600">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-teal-600" />
                <span>
                  <strong className="text-teal-900 font-bold">{submissionsCount}</strong> participante(s) han completado la evaluación
                </span>
              </div>
              {totalQuestions && (
                <div className="text-slate-400">
                  • {totalQuestions} preguntas (Escala 0–20 pts)
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => setShowQRModal(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
              title="Mostrar código QR en pantalla para que los participantes escaneen con su teléfono"
            >
              <QrCode className="w-4 h-4 text-white" />
              <span>Ver QR Aula</span>
            </Button>

            <a
              href={kioskUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold h-9 px-3.5 rounded-xl transition-colors cursor-pointer shadow-2xs"
              title="Abrir Kiosk en la computadora del aula para participantes sin teléfono móvil"
            >
              <Laptop className="w-4 h-4 text-teal-600" />
              <span>Abrir Kiosk (PC)</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>

            <Button
              type="button"
              variant="outline"
              onClick={handleCopyLink}
              className={`text-xs font-bold h-9 px-3 rounded-xl cursor-pointer shadow-2xs transition-colors ${
                copied
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  : "border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900"
              }`}
              title="Copiar URL directa al portapapeles"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                  <span className="text-emerald-700 font-bold">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500 mr-1" />
                  <span>Copiar Link</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {showQRModal && (
        <OSIExamQRModal
          osi={osi}
          onClose={() => setShowQRModal(false)}
        />
      )}
    </>
  );
}

