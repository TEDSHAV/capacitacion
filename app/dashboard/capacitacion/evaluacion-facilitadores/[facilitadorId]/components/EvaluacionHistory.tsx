"use client";

import { useRouter } from "next/navigation";
import {
  History,
  FileDown,
  ChevronRight,
  Calendar,
} from "lucide-react";

interface HistoryRow {
  id: number;
  tipo_evaluacion: string;
  fecha_evaluacion: string;
  puntaje_total: number | null;
  porcentaje_total: number | null;
  condicion_final: string | null;
}

interface EvaluacionHistoryProps {
  facilitadorId: number;
  history: HistoryRow[];
  currentEvalId?: number;
}

const TIPO_LABELS: Record<string, string> = {
  nuevo: "Verificación Inicial",
  seguimiento: "Seguimiento",
  reevaluacion: "Reevaluación",
};

const CONDICION_COLORS: Record<string, string> = {
  aprobado: "bg-green-100 text-green-700 border-green-200",
  aprobado_supervision: "bg-amber-100 text-amber-700 border-amber-200",
  no_aprobado: "bg-red-100 text-red-700 border-red-200",
  aceptable: "bg-green-100 text-green-700 border-green-200",
  no_aceptable: "bg-red-100 text-red-700 border-red-200",
};

const CONDICION_LABELS: Record<string, string> = {
  aprobado: "Aprobado",
  aprobado_supervision: "Aprob. superv.",
  no_aprobado: "No aprobado",
  aceptable: "Aceptable",
  no_aceptable: "No aceptable",
};

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function EvaluacionHistory({
  facilitadorId,
  history,
  currentEvalId,
}: EvaluacionHistoryProps) {
  const router = useRouter();

  const handleDownloadPdf = async (evalId: number) => {
    try {
      const response = await fetch(
        `/api/generate-evaluacion-facilitador-pdf?id=${evalId}`,
        { method: "GET" },
      );
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${response.status} al generar PDF`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `evaluacion_${evalId}.pdf`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download error:", err);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            Historial de Evaluaciones
          </h3>
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto">
        {history.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">
              Sin evaluaciones previas
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {history.map((ev) => {
              const isCurrent = ev.id === currentEvalId;
              const condicion = ev.condicion_final;
              return (
                <li
                  key={ev.id}
                  className={`px-4 py-3 hover:bg-violet-50/30 transition-colors ${
                    isCurrent ? "bg-violet-50 border-l-2 border-violet-500" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() =>
                        router.push(
                          `/dashboard/capacitacion/evaluacion-facilitadores/${facilitadorId}?evalId=${ev.id}`,
                        )
                      }
                      className="flex-1 text-left min-w-0 bg-transparent border-0 cursor-pointer p-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-900">
                          {TIPO_LABELS[ev.tipo_evaluacion] || ev.tipo_evaluacion}
                        </span>
                        {condicion && (
                          <span
                            className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded-full border ${
                              CONDICION_COLORS[condicion] ||
                              "bg-gray-100 text-gray-600 border-gray-200"
                            }`}
                          >
                            {CONDICION_LABELS[condicion] || condicion}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {formatDate(ev.fecha_evaluacion)}
                      </div>
                      {ev.porcentaje_total != null && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {(ev.porcentaje_total * 100).toFixed(1)}%
                          {ev.puntaje_total != null && ` · ${ev.puntaje_total} pts`}
                        </div>
                      )}
                    </button>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleDownloadPdf(ev.id)}
                        className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors bg-transparent border-0 cursor-pointer"
                        title="Descargar PDF"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
