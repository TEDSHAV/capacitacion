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
    <div className="flex items-center gap-3">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="flex items-center gap-2 bg-white text-blue-600 border-2 border-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed font-bold"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generando PDF...
          </>
        ) : (
          <>
            <FileBarChart className="w-4 h-4" />
            Generar Reporte de Tabulación
          </>
        )}
      </button>
      {error && (
        <span className="text-sm text-red-600">{error}</span>
      )}
    </div>
  );
}
