"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { History, X, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { getFacilitadorHistory } from "@/app/actions/osi-facilitador-assignments";
import type { FacilitadorHistoryEntry } from "@/types";

interface FacilitadorHistoryModalProps {
  facilitadorId: number;
  facilitadorName: string;
  onClose: () => void;
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d + (d.length === 10 ? "T12:00:00" : ""));
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Best-effort session count from the loose `sesiones_ejecucion`/`sesiones_programadas` shapes. */
function sessionCount(value: unknown): number | null {
  if (Array.isArray(value)) return value.length;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

export const FacilitadorHistoryModal = ({
  facilitadorId,
  facilitadorName,
  onClose,
}: FacilitadorHistoryModalProps) => {
  const [rows, setRows] = useState<FacilitadorHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    // Initial state already covers the mount case (loading=true, error=null,
    // rows=[]). We only setState from inside the async callbacks below, which
    // keeps this effect free of synchronous setState calls.
    getFacilitadorHistory(facilitadorId)
      .then((res) => {
        if (cancelled) return;
        if (res.error) setError(res.error);
        else setRows(res.data ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Error inesperado");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [facilitadorId]);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in duration-200 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-4xl w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto shadow-2xl ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-white px-6 pt-6 pb-5 border-b border-gray-100 flex justify-between items-start gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <History className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                Historial de Cursos
              </h3>
              <p className="text-sm text-gray-500 mt-0.5 truncate">
                {facilitadorName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg p-1.5 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm text-gray-500 mt-3">
                Cargando historial...
              </p>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-500">
              Este facilitador no tiene cursos asignados.
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500">
                {rows.length} curso{rows.length === 1 ? "" : "s"} · ordenado por
                fecha de ejecución (más reciente primero)
              </p>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Nro OSI
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Curso
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Empresa
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Fecha ejecución
                      </th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Sesiones
                      </th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {rows.map((row) => {
                      const ejecutadas = sessionCount(row.sesiones_ejecucion);
                      const programadas = sessionCount(row.sesiones_programadas);
                      const ejecutada = !!row.fecha_inicio_real;
                      return (
                        <tr
                          key={row.osi_id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-3 py-2.5 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/dashboard/capacitacion/gestion-osi?id=${row.osi_id}`}
                                onClick={onClose}
                                className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-medium"
                                title="Abrir OSI"
                              >
                                {row.nro_osi || `OSI #${row.osi_id}`}
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                              {row.source === "requisicion" && (
                                <span
                                  className="inline-flex items-center text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full"
                                  title="OSI encontrada solo en requisiciones procesadas, no en asignaciones — verificar si el facilitador dictó este curso"
                                >
                                  Solo en req.
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-sm text-gray-700">
                            {row.servicio || "—"}
                          </td>
                          <td className="px-3 py-2.5 text-sm text-gray-700">
                            {row.nombre_empresa || "—"}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(row.fecha_inicio_real)}
                          </td>
                          <td className="px-3 py-2.5 text-center text-xs text-gray-600">
                            {ejecutadas != null && programadas != null
                              ? `${ejecutadas} / ${programadas}`
                              : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {ejecutada ? (
                              <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                Ejecutada
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                Pendiente
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
