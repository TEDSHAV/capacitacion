/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import {
  X,
  Copy,
  Check,
  Download,
  ExternalLink,
  QrCode,
  Laptop,
  MapPin,
  Sparkles,
} from "lucide-react";
import { SALONES, type SalonId } from "@/types/evaluacion";

interface OSIExamQRModalProps {
  osi: {
    id_osi: number;
    nro_osi: string;
    servicio: string;
    nombre_empresa: string;
  };
  onClose: () => void;
}

type TabKey = "direct" | SalonId;

export default function OSIExamQRModal({ osi, onClose }: OSIExamQRModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("direct");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedMobile, setCopiedMobile] = useState(false);
  const [copiedKiosk, setCopiedKiosk] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://prisma.shadevenezuela.com.ve";
  const cleanNro = osi.nro_osi || String(osi.id_osi);

  // Compute active URLs and metadata based on selected tab
  let activeMobileUrl = `${baseUrl}/evaluacion/${cleanNro}`;
  let activeKioskUrl = `${baseUrl}/evaluacion/${cleanNro}/kiosk`;
  let activeTitle = `OSI ${osi.nro_osi}`;
  let activeSubtitle = osi.servicio;
  let downloadFileName = `QR_Evaluacion_${osi.nro_osi}.png`;
  let isSalonTab = false;

  const currentSalon = SALONES.find((s) => s.id === activeTab);
  if (currentSalon) {
    activeMobileUrl = `${baseUrl}/evaluacion/${currentSalon.id}`;
    activeKioskUrl = `${baseUrl}/evaluacion/${currentSalon.id}/kiosk`;
    activeTitle = currentSalon.nombre;
    activeSubtitle = "Código QR Estático de Pared";
    downloadFileName = `QR_${currentSalon.id.replace(/-/g, "_").toUpperCase()}.png`;
    isSalonTab = true;
  }

  useEffect(() => {
    QRCode.toDataURL(activeMobileUrl, {
      width: 450,
      margin: 2,
      color: {
        dark: isSalonTab ? "#047857" : "#0c3f69", // Emerald for room QR, Navy for OSI
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Error generating QR:", err));
  }, [activeMobileUrl, isSalonTab]);

  const handleCopy = async (url: string, type: "mobile" | "kiosk") => {
    try {
      await navigator.clipboard.writeText(url);
      if (type === "mobile") {
        setCopiedMobile(true);
        setTimeout(() => setCopiedMobile(false), 2000);
      } else {
        setCopiedKiosk(true);
        setTimeout(() => setCopiedKiosk(false), 2000);
      }
    } catch (err) {
      console.error("Error copying text:", err);
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = downloadFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white ${
              isSalonTab ? "bg-emerald-600" : "bg-teal-600"
            }`}>
              {isSalonTab ? <MapPin className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">{activeTitle}</h3>
              <p className="text-xs text-gray-500 truncate max-w-xs">{activeSubtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Classroom Tabs */}
        <div className="bg-slate-100/90 border-b border-gray-200 p-1.5 flex items-center gap-1 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("direct")}
            className={`px-3 py-1.5 rounded-md font-semibold shrink-0 transition-colors ${
              activeTab === "direct"
                ? "bg-white text-teal-800 shadow-xs border border-gray-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            Directo OSI
          </button>
          {SALONES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveTab(s.id)}
              className={`px-3 py-1.5 rounded-md font-semibold shrink-0 transition-colors flex items-center gap-1 ${
                activeTab === s.id
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
              }`}
            >
              <MapPin className="w-3 h-3" />
              {s.nombre}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col items-center space-y-4">
          <div className={`p-3 rounded-xl border shadow-sm ${
            isSalonTab ? "bg-emerald-50/40 border-emerald-200" : "bg-white border-gray-200"
          }`}>
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR ${activeTitle}`}
                className="w-56 h-56 object-contain"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-xs text-gray-400">
                Generando QR...
              </div>
            )}
          </div>

          {isSalonTab ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-center text-xs text-emerald-900 leading-snug w-full">
              <span className="font-bold flex items-center justify-center gap-1 text-emerald-800 mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Código QR Estático para Pared de Aula
              </span>
              Imprime y lamina este código en la pared de <strong>{activeTitle}</strong>. Los alumnos accederán automáticamente a cualquier curso asignado a este salón según la fecha.
            </div>
          ) : (
            <p className="text-xs text-center text-gray-500">
              Escanea con la cámara de un teléfono para iniciar la evaluación digital de esta OSI.
            </p>
          )}

          {/* Links Box */}
          <div className="w-full space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate">
                <span className="font-semibold text-slate-700 block">Enlace Móvil (Participante):</span>
                <span className="text-[11px] text-slate-500 font-mono truncate block">{activeMobileUrl}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCopy(activeMobileUrl, "mobile")}
                className="h-8 px-2.5 text-xs shrink-0 cursor-pointer"
              >
                {copiedMobile ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    Copiar
                  </>
                )}
              </Button>
            </div>

            <div className="border-t border-slate-200 pt-2 flex items-center justify-between gap-2">
              <div className="truncate">
                <span className="font-semibold text-slate-700 block">Enlace Estación Kiosk (PC Aula):</span>
                <span className="text-[11px] text-slate-500 font-mono truncate block">{activeKioskUrl}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCopy(activeKioskUrl, "kiosk")}
                className="h-8 px-2.5 text-xs shrink-0 cursor-pointer"
              >
                {copiedKiosk ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="w-full flex flex-col sm:flex-row gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadQR}
              className="flex-1 text-xs flex items-center justify-center gap-1.5 text-slate-800 border-slate-300 hover:bg-slate-50 h-9 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              Descargar PNG ({isSalonTab ? "Pared" : "OSI"})
            </Button>

            <a
              href={activeKioskUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Laptop className="w-3.5 h-3.5" />
              Abrir Kiosk (PC)
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
