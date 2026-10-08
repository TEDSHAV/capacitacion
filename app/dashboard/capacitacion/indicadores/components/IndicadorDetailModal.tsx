"use client";

import { useState, useMemo } from "react";
import {
  X,
  Search,
  Copy,
  Check,
  Download,
  Calendar,
  Users,
  Award,
  Layers,
  FileText,
  CalendarRange,
} from "lucide-react";
import type { IndicadorOsiItem } from "@/types";
import { OsiPreviewModal } from "@/components/osi/OsiPreviewModal";

/** "YYYY-MM-DD" → "DD/MM" */
function shortDate(d: string | null) {
  if (!d) return "";
  return `${d.slice(8, 10)}/${d.slice(5, 7)}`;
}

function isMultiMes(item: IndicadorOsiItem) {
  return (
    !!item.fechaPrimeraSesion &&
    !!item.fechaUltimaSesion &&
    item.fechaPrimeraSesion.slice(0, 7) !== item.fechaUltimaSesion.slice(0, 7)
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  periodLabel: string;
  items: IndicadorOsiItem[];
  metricKey?: string;
}

export default function IndicadorDetailModal({
  isOpen,
  onClose,
  title,
  periodLabel,
  items,
  metricKey = "",
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [copied, setCopied] = useState(false);
  const [previewOsi, setPreviewOsi] = useState<IndicadorOsiItem | null>(null);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const q = searchTerm.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.nroOsi.toLowerCase().includes(q) ||
        item.empresa.toLowerCase().includes(q) ||
        item.servicio.toLowerCase().includes(q) ||
        item.estatus.toLowerCase().includes(q)
    );
  }, [items, searchTerm]);

  // Aggregate stats from current items
  const stats = useMemo(() => {
    let totalPlanificados = 0;
    let totalCertificados = 0;
    let totalCerts = 0;
    let totalCarnets = 0;

    for (const item of items) {
      totalPlanificados += item.participantesPlanificados || 0;
      totalCertificados += item.participantesCertificados || 0;
      totalCerts += item.certificadosCount || 0;
      totalCarnets += item.carnetsCount || 0;
    }

    return {
      count: items.length,
      totalPlanificados,
      totalCertificados,
      totalCerts,
      totalCarnets,
    };
  }, [items]);

  const handleCopyOsis = async () => {
    const osiList = items.map((i) => i.nroOsi).filter(Boolean).join(", ");
    try {
      await navigator.clipboard.writeText(osiList);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "Nro OSI",
      "Empresa",
      "Curso",
      "Fecha Emisión",
      "Fecha Planificada",
      "Fecha Ejecutada",
      "Sesiones",
      "Primera Sesión",
      "Última Sesión",
      "Part. Estimados (SOLPED/OSI)",
      "Part. Certificados",
      "Certificados",
      "Carnets PVC",
      "Estatus",
    ];

    const rows = filteredItems.map((item) => [
      `"${item.nroOsi}"`,
      `"${(item.empresa || "").replace(/"/g, '""')}"`,
      `"${(item.servicio || "").replace(/"/g, '""')}"`,
      `"${item.fechaEmision || ""}"`,
      `"${item.fechaPlanificada || ""}"`,
      `"${item.fechaEjecutada || ""}"`,
      item.sesionesTotal,
      `"${item.fechaPrimeraSesion || ""}"`,
      `"${item.fechaUltimaSesion || ""}"`,
      item.participantesPlanificados,
      item.participantesCertificados,
      item.certificadosCount,
      item.carnetsCount,
      `"${item.estatus || ""}"`,
    ]);

    const csvContent =
      "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeTitle = title.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    link.download = `detalle_${safeTitle}_${periodLabel.replace(/\s+/g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const isEmitidosMetric = metricKey === "certificadosEmitidos" || metricKey === "pvcEmitidos";
  const showPvc = metricKey === "pvc" || metricKey === "pvcEmitidos";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between bg-gradient-to-r from-sky-50/50 via-white to-gray-50/50">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-sky-100 text-sky-700">
                <Layers className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">
                  {title}
                </h3>
                <p className="text-xs font-medium text-sky-700 mt-0.5">
                  Periodo: {periodLabel}
                </p>
              </div>
            </div>

            {/* Quick Stats Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                <Layers className="w-3.5 h-3.5 text-gray-500" />
                {stats.count} OSI
              </span>

              {stats.totalPlanificados > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                  {stats.totalPlanificados} estimados (SOLPED/OSI)
                </span>
              )}

              {stats.totalCertificados > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <Award className="w-3.5 h-3.5 text-emerald-500" />
                  {stats.totalCertificados} participantes certificados
                </span>
              )}

              {metricKey === "certificadosEmitidos" && stats.totalCerts > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  <Award className="w-3.5 h-3.5 text-indigo-500" />
                  {stats.totalCerts} certificados emitidos en el periodo
                </span>
              )}

              {showPvc && stats.totalCarnets > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  {stats.totalCarnets} carnets PVC{isEmitidosMetric ? " emitidos en el periodo" : ""}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyOsis}
              disabled={items.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
              title="Copiar lista de números OSI separados por coma"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Copiados</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-gray-500" />
                  <span>Copiar Nros OSI</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportCsv}
              disabled={filteredItems.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
              title="Descargar lista en CSV"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span>CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Nro OSI, Empresa, Curso o Estatus..."
              className="w-full pl-9 pr-4 py-1.5 rounded-lg text-xs border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>
          <div className="text-xs text-gray-500">
            Mostrando <span className="font-semibold text-gray-800">{filteredItems.length}</span> de{" "}
            <span className="font-semibold text-gray-800">{items.length}</span> registros
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-medium text-gray-500">
                {searchTerm
                  ? "No se encontraron OSI con el criterio de búsqueda."
                  : "No hay registros asociados a este indicador en el periodo seleccionado."}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="mt-2 text-xs text-sky-600 hover:underline font-semibold"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 font-semibold text-gray-600 uppercase tracking-wider">
                    Nro OSI
                  </th>
                  <th className="px-4 py-2.5 font-semibold text-gray-600 uppercase tracking-wider min-w-[200px]">
                    Empresa / Curso
                  </th>
                  <th className="px-4 py-2.5 font-semibold text-gray-600 uppercase tracking-wider">
                    Planificada
                  </th>
                  <th className="px-4 py-2.5 font-semibold text-gray-600 uppercase tracking-wider">
                    Ejecutada
                  </th>
                  <th className="px-4 py-2.5 font-semibold text-gray-600 uppercase tracking-wider text-center" title="Participantes estimados según SOLPED/OSI">
                    Estimados
                  </th>
                  <th className="px-4 py-2.5 font-semibold text-gray-600 uppercase tracking-wider text-center" title={isEmitidosMetric ? "Certificados emitidos en el periodo" : "Participantes con certificado activo"}>
                    {isEmitidosMetric ? "Emitidos" : "Certificados"}
                  </th>
                  {showPvc && (
                    <th className="px-4 py-2.5 font-semibold text-gray-600 uppercase tracking-wider text-center">
                      PVC
                    </th>
                  )}
                  <th className="px-4 py-2.5 font-semibold text-gray-600 uppercase tracking-wider">
                    Estatus
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map((item) => {
                  const isEjecutada = Boolean(item.fechaEjecutada);
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-sky-50/40 transition-colors group"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewOsi(item)}
                            className="inline-flex items-center gap-1.5 font-bold text-sky-600 hover:text-sky-800 hover:underline cursor-pointer"
                            title="Ver formato oficial de la OSI"
                          >
                            <FileText className="w-3.5 h-3.5 text-sky-400" />
                            <span>{item.nroOsi}</span>
                          </button>
                        </div>
                        {isMultiMes(item) && (
                          <div
                            className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60"
                            title={`Curso multi-mes: ${item.sesionesTotal} sesiones (${item.sesionesEjecutadas} ejecutadas) del ${item.fechaPrimeraSesion} al ${item.fechaUltimaSesion}`}
                          >
                            <CalendarRange className="w-3 h-3" />
                            {item.sesionesTotal} ses. · {shortDate(item.fechaPrimeraSesion)} → {shortDate(item.fechaUltimaSesion)}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 line-clamp-1">
                          {item.empresa}
                        </div>
                        <div className="text-gray-500 text-[11px] line-clamp-1 mt-0.5">
                          {item.servicio}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>{item.fechaPlanificada || "—"}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEjecutada ? (
                          <span className="text-emerald-700 font-medium">
                            {item.fechaEjecutada}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                            Pendiente
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center tabular-nums font-medium text-gray-800">
                        {item.participantesPlanificados || 0}
                      </td>

                      <td className="px-4 py-3 text-center tabular-nums font-semibold text-gray-900">
                        {metricKey === "certificadosEmitidos"
                          ? item.certificadosCount || 0
                          : item.participantesCertificados || 0}
                      </td>

                      {showPvc && (
                        <td className="px-4 py-3 text-center tabular-nums font-semibold text-amber-700">
                          {item.carnetsCount || 0}
                        </td>
                      )}

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            item.estatus === "Ejecutado"
                              ? "bg-emerald-100 text-emerald-800"
                              : item.estatus === "En proceso"
                              ? "bg-sky-100 text-sky-800"
                              : item.estatus === "No ejecutada"
                              ? "bg-rose-100 text-rose-800"
                              : item.estatus === "Reagendada" || item.estatus === "Reagendado"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.estatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <div>
            Haga clic en cualquier <span className="font-semibold text-sky-700">Nro OSI</span> para
            ver el formato oficial de la OSI aquí mismo.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-100 transition-colors shadow-sm"
          >
            Cerrar
          </button>
        </div>
      </div>

      <OsiPreviewModal
        isOpen={Boolean(previewOsi)}
        osiId={previewOsi?.id ?? null}
        osiNumber={previewOsi?.nroOsi}
        onClose={() => setPreviewOsi(null)}
      />
    </div>
  );
}
