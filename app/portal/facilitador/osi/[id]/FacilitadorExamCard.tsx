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
      <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-teal-900 via-sky-950 to-slate-900 text-white shadow-md border border-teal-500/30 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          {/* Info Side */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-teal-400" />
                Evaluación Digital en Aula
              </span>
              <span className="text-xs text-slate-300 font-mono">
                /evaluacion/{cleanNro}
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              {examTitle}
            </h2>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-teal-400" />
                <span>
                  <strong>{submissionsCount}</strong> participante(s) han completado la evaluación
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
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs h-9 px-3.5 rounded-xl shadow cursor-pointer flex items-center gap-1.5 transition-colors"
              title="Mostrar código QR en pantalla para que los participantes escaneen con su teléfono"
            >
              <QrCode className="w-4 h-4" />
              <span>Ver QR Aula</span>
            </Button>

            <a
              href={kioskUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-xs font-semibold h-9 px-3.5 rounded-xl transition-colors cursor-pointer"
              title="Abrir Kiosk en la computadora del aula para participantes sin teléfono móvil"
            >
              <Laptop className="w-4 h-4 text-teal-400" />
              <span>Abrir Kiosk (PC)</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            <Button
              type="button"
              variant="outline"
              onClick={handleCopyLink}
              className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs h-9 px-3 rounded-xl cursor-pointer"
              title="Copiar URL directa al portapapeles"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" />
                  <span className="text-emerald-400">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1" />
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

