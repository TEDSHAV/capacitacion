"use client";

import React from "react";
import { FileBarChart, Loader2 } from "lucide-react";

interface GenerateTabulacionButtonProps {
  osiId: number;
}

export default function GenerateTabulacionButton({ osiId }: GenerateTabulacionButtonProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleGenerate = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/generate-survey-tabulacion-pdf?osiId=${osiId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resultado_actividad_osi_${osiId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generating tabulation report:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start md:items-end gap-2">
      <button
        onClick={handleGenerate}
        disabled={loading}
        title="Genera el reporte de tabulación de encuestas en PDF para enviar al cliente"
        className="group flex items-center gap-3 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white border border-white/40 hover:border-white/70 px-5 py-2.5 rounded-lg transition-all shadow-sm hover:shadow disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin shrink-0" />
            <span className="flex flex-col items-start leading-tight">
              <span className="font-semibold text-sm">Generando PDF...</span>
              <span className="text-[11px] font-normal text-white/70">Esto tomará un momento</span>
            </span>
          </>
        ) : (
          <>
            <FileBarChart className="w-5 h-5 shrink-0" />
            <span className="flex flex-col items-start leading-tight">
              <span className="font-semibold text-sm">Generar Reporte de Tabulación</span>
              <span className="text-[11px] font-normal text-white/70">Reporte para el cliente</span>
            </span>
          </>
        )}
      </button>
      {error && (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-red-500/90 px-2.5 py-1 rounded-full">
          {error}
        </span>
      )}
    </div>
  );
}
