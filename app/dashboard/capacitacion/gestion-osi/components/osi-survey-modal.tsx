"use client";

import React, { useState, useEffect } from "react";
import { OSIManagement } from "@/types";
import { X, Copy, Download, ExternalLink, QrCode, FileText } from "lucide-react";
import QRCode from "qrcode";
import Link from "next/link";

interface OSISurveyModalProps {
  osi: OSIManagement | null;
  onClose: () => void;
}

export default function OSISurveyModal({ osi, onClose }: OSISurveyModalProps) {
  const [qrUrl, setQrUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Use production domain for QR code even in localhost, or environment variable if set
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://prisma.shadevenezuela.com.ve";

  useEffect(() => {
    if (osi) {
      // The QR code ALWAYS points to production (as per requirements)
      const url = `${baseUrl}/survey/${osi.id_osi}`;
      QRCode.toDataURL(url, { width: 300, margin: 2 }, (err, url) => {
        if (err) console.error(err);
        else setQrUrl(url);
      });
    }
  }, [osi, baseUrl]);

  if (!osi) return null;

  // For the clickable link in the modal, use current origin if on localhost to allow testing
  // Check window only on client side to avoid hydration mismatch
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const clickableUrl = currentOrigin.includes("localhost") 
    ? `${currentOrigin}/survey/${osi.id_osi}` 
    : `${baseUrl}/survey/${osi.id_osi}`;
    
  const handleCopyLink = () => {
    navigator.clipboard.writeText(clickableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = `QR_Encuesta_OSI_${osi.nro_osi}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Encuesta de Satisfacción</h2>
            <p className="text-sm text-gray-500">OSI: {osi.nro_osi}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* QR Code Section */}
          <div className="flex flex-col items-center gap-6">
            <div className="p-4 bg-white border-2 border-gray-100 rounded-2xl shadow-inner relative group">
              {qrUrl ? (
                <img src={qrUrl} alt="QR Survey" className="w-48 h-48" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center bg-gray-50 rounded-xl">
                  <QrCode className="w-12 h-12 text-gray-300 animate-pulse" />
                </div>
              )}
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={handleDownloadQR}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
              >
                <Download className="w-4 h-4" />
                Descargar QR
              </button>
              <Link
                href={`/dashboard/capacitacion/gestion-osi/${osi.id_osi}/survey-view`}
                className="flex items-center gap-2 px-6 py-2.5 border-2 border-blue-600 text-blue-600 rounded-full font-bold hover:bg-blue-50 transition-all active:scale-95"
              >
                <FileText className="w-4 h-4" />
                Ver Resultados
              </Link>
            </div>
          </div>

          {/* Link Section */}
          <div className="space-y-3">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Enlace de la Encuesta</label>
            <div className="flex gap-2">
              <div className="flex-grow p-3 bg-gray-50 border rounded-xl text-sm font-mono text-gray-600 truncate">
                {clickableUrl}
              </div>
              <button
                onClick={handleCopyLink}
                className={`
                  p-3 rounded-xl transition-all border flex items-center justify-center min-w-[48px]
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
                className="p-3 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center min-w-[48px]"
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

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-100 transition-colors"
          >
            Cerrar
          </button>
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
