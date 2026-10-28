"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  TrendingUp,
  UserCheck,
  MapPin,
  Building2,
  Calendar,
  Search,
  Eye,
  Loader2,
  ExternalLink,
  Pencil,
  Check,
  X,
  AlertCircle,
  Sparkles,
  Award,
  Filter,
  Phone,
  Briefcase,
} from "lucide-react";
import type {
  ContratacionFacilitadoresResponse,
  FacilitadorContratadoItem,
  State,
} from "@/types";
import { updateFacilitadorIngresoQuickAction } from "@/app/actions/indicadores-contratacion";
import { useToast } from "@/lib/ui/toast-context";
import { normalizePhoneNumber, normalizeCedula } from "@/utils/string-utils";

interface Props {
  data: ContratacionFacilitadoresResponse;
  states: State[];
  selectedMes: string;
  estadoIdFilter?: string;
  onSelectMes: (mes: string) => void;
  onRefresh: () => void;
}

const FUENTE_OPTIONS = [
  { value: "recomendacion", label: "Recomendación" },
  { value: "Entrevista", label: "Entrevista" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "web", label: "Página Web" },
  { value: "rrss", label: "Redes Sociales" },
  { value: "interno", label: "Referencia Interna" },
  { value: "otro", label: "Otro" },
];

function formatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Sin registrar";
  const trimmed = dateStr.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getFuenteBadgeStyle(fuente: string | null): {
  label: string;
  className: string;
} {
  const key = (fuente || "").trim().toLowerCase();
  switch (key) {
    case "recomendacion":
      return {
        label: "Recomendación",
        className: "bg-sky-50 text-sky-700 border-sky-200",
      };
    case "entrevista":
      return {
        label: "Entrevista",
        className: "bg-purple-50 text-purple-700 border-purple-200",
      };
    case "linkedin":
      return {
        label: "LinkedIn",
        className: "bg-blue-50 text-blue-700 border-blue-200",
      };
    case "interno":
      return {
        label: "Referencia Interna",
        className: "bg-indigo-50 text-indigo-700 border-indigo-200",
      };
    case "web":
      return {
        label: "Página Web",
        className: "bg-teal-50 text-teal-700 border-teal-200",
      };
    case "rrss":
      return {
        label: "Redes Sociales",
        className: "bg-pink-50 text-pink-700 border-pink-200",
      };
    case "otro":
      return {
        label: "Otro",
        className: "bg-gray-100 text-gray-700 border-gray-200",
      };
    default:
      return {
        label: fuente ? fuente : "Sin especificar",
        className: "bg-gray-50 text-gray-500 border-gray-200",
      };
  }
}

export default function ContratacionFacilitadoresView({
  data,
  states,
  selectedMes,
  estadoIdFilter,
  onSelectMes,
  onRefresh,
}: Props) {
  const { addToast } = useToast();

  // Local filter & view states — default to selected month
  const [scopeMode, setScopeMode] = useState<
    "mes_seleccionado" | "plantilla_completa" | "sin_fecha"
  >("mes_seleccionado");
  const [ciudadFilter, setCiudadFilter] = useState<string>("");
  const [fuenteFilter, setFuenteFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isOpeningPdf, setIsOpeningPdf] = useState(false);

  // Quick edit modal state
  const [editingItem, setEditingItem] =
    useState<FacilitadorContratadoItem | null>(null);
  const [editFecha, setEditFecha] = useState<string>("");
  const [editFuente, setEditFuente] = useState<string>("");
  const [editEstadoId, setEditEstadoId] = useState<number | null>(null);
  const [editCiudadId, setEditCiudadId] = useState<number | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const selectedBucket = useMemo(() => {
    return (
      data.meses.find((m) => m.mes === selectedMes) ??
      data.meses[data.meses.length - 1] ??
      null
    );
  }, [data.meses, selectedMes]);

  // Max value for visual bar scaling in monthly chart
  const maxContratadosMes = useMemo(() => {
    const m = Math.max(...data.meses.map((b) => b.contratados), 1);
    return m;
  }, [data.meses]);

  // Filtered directory list according to scopeMode, ciudadFilter, fuenteFilter, searchTerm
  const displayedFacilitadores = useMemo(() => {
    let base: FacilitadorContratadoItem[] = [];
    if (scopeMode === "mes_seleccionado") {
      base = selectedBucket ? selectedBucket.items : [];
    } else if (scopeMode === "sin_fecha") {
      base = data.todosFacilitadores.filter((f) => !f.fechaIngreso);
    } else {
      base = data.todosFacilitadores;
    }

    return base
      .filter((item) => {
        if (ciudadFilter && String(item.idCiudad) !== ciudadFilter) {
          return false;
        }
        if (fuenteFilter) {
          const itemKey = (item.fuente || "sin_especificar")
            .trim()
            .toLowerCase();
          if (itemKey !== fuenteFilter.toLowerCase()) return false;
        }
        if (searchTerm.trim()) {
          const q = searchTerm.trim().toLowerCase();
          const matchName = item.nombreApellido.toLowerCase().includes(q);
          const matchCed = (item.cedula || "").toLowerCase().includes(q);
          const matchEst = (item.estadoNombre || "").toLowerCase().includes(q);
          const matchCiu = (item.ciudadNombre || "").toLowerCase().includes(q);
          const matchTema = item.temasCursos.some((t) =>
            t.toLowerCase().includes(q)
          );
          if (!matchName && !matchCed && !matchEst && !matchCiu && !matchTema) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (a.fechaIngreso && b.fechaIngreso) {
          return b.fechaIngreso.localeCompare(a.fechaIngreso);
        }
        if (a.fechaIngreso) return -1;
        if (b.fechaIngreso) return 1;
        return a.nombreApellido.localeCompare(b.nombreApellido, "es");
      });
  }, [
    scopeMode,
    data.totalAnio.items,
    data.todosFacilitadores,
    selectedBucket,
    ciudadFilter,
    fuenteFilter,
    searchTerm,
  ]);

  function openQuickEdit(item: FacilitadorContratadoItem) {
    setEditingItem(item);
    setEditFecha(item.fechaIngreso || "");
    setEditFuente(item.fuente || "");
    setEditEstadoId(item.idEstado);
    setEditCiudadId(item.idCiudad);
  }

  async function handleSaveQuickEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem) return;
    setSavingEdit(true);
    try {
      const res = await updateFacilitadorIngresoQuickAction({
        facilitadorId: editingItem.id,
        fechaIngreso: editFecha || null,
        fuente: editFuente || null,
        idEstado: editEstadoId,
        idCiudad: editCiudadId,
      });
      if (!res.success) {
        addToast(res.error || "Error al actualizar facilitador", "error");
      } else {
        addToast(
          `Datos de ingreso actualizados para ${editingItem.nombreApellido}`,
          "success"
        );
        setEditingItem(null);
        onRefresh();
      }
    } catch {
      addToast("Error inesperado al guardar", "error");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleOpenPdfInNewTab() {
    // Open window immediately on user gesture so popup blockers don't block it
    const pdfWindow = window.open("", "_blank");
    try {
      setIsOpeningPdf(true);
      const { pdf } = await import("@react-pdf/renderer");
      const { default: IndicadorContratacionPdfDocument } = await import(
        "@/lib/indicador-contratacion-pdf-document"
      );

      const estadoObj = estadoIdFilter
        ? states.find((s) => String(s.id) === String(estadoIdFilter))
        : null;

      const blob = await pdf(
        <IndicadorContratacionPdfDocument
          data={data}
          selectedMes={selectedBucket?.mes ?? selectedMes}
          estadoFiltroLabel={estadoObj?.nombre_estado}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      if (pdfWindow) {
        pdfWindow.location.href = url;
      } else {
        window.open(url, "_blank");
      }
    } catch (err) {
      if (pdfWindow) pdfWindow.close();
      console.error("Error generating Contratacion PDF:", err);
      addToast("Error al abrir el PDF del indicador", "error");
    } finally {
      setIsOpeningPdf(false);
    }
  }

  const citiesForEditState = useMemo(() => {
    if (!editEstadoId) return [];
    return data.ciudadesDisponibles.filter((c) => c.idEstado === editEstadoId);
  }, [data.ciudadesDisponibles, editEstadoId]);

  // Monthly breakdown of the selected month's new facilitators by State, City, and Fuente
  const selectedMonthItems = useMemo(
    () => selectedBucket?.items ?? [],
    [selectedBucket]
  );

  const distinctCitiesInMes = useMemo(() => {
    return new Set(
      selectedMonthItems.map((i) => i.ciudadNombre).filter(Boolean)
    ).size;
  }, [selectedMonthItems]);

  const distinctStatesInMes = useMemo(() => {
    return new Set(
      selectedMonthItems.map((i) => i.estadoNombre).filter(Boolean)
    ).size;
  }, [selectedMonthItems]);

  const porEstadoMes = useMemo(() => {
    const countsInMes = new Map<string, number>();
    for (const item of selectedMonthItems) {
      const key = item.estadoNombre || "Sin estado";
      countsInMes.set(key, (countsInMes.get(key) || 0) + 1);
    }
    return data.porEstado
      .map((st) => ({
        ...st,
        nuevosMes: countsInMes.get(st.nombre) || 0,
      }))
      .sort((a, b) => b.nuevosMes - a.nuevosMes || b.total - a.total);
  }, [data.porEstado, selectedMonthItems]);

  const porCiudadMes = useMemo(() => {
    const countsInMes = new Map<string, number>();
    for (const item of selectedMonthItems) {
      const key = `${item.ciudadNombre || "Sin ciudad"}_${item.estadoNombre || ""}`;
      countsInMes.set(key, (countsInMes.get(key) || 0) + 1);
    }
    return data.porCiudad
      .map((c) => ({
        ...c,
        nuevosMes: countsInMes.get(`${c.nombre}_${c.estadoNombre || ""}`) || 0,
      }))
      .sort((a, b) => b.nuevosMes - a.nuevosMes || b.total - a.total);
  }, [data.porCiudad, selectedMonthItems]);

  const porFuenteMes = useMemo(() => {
    const countsInMes = new Map<string, number>();
    for (const item of selectedMonthItems) {
      const key = (item.fuente || "sin_especificar").trim().toLowerCase();
      countsInMes.set(key, (countsInMes.get(key) || 0) + 1);
    }
    return data.porFuente
      .map((f) => ({
        ...f,
        nuevosMes: countsInMes.get(f.fuente) || 0,
      }))
      .sort((a, b) => b.nuevosMes - a.nuevosMes || b.total - a.total);
  }, [data.porFuente, selectedMonthItems]);

  return (
    <div className="space-y-6">
      {/* ── Top Header & Action Buttons ───────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white rounded-xl border border-gray-200 p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
              <UserPlus className="w-4 h-4" />
            </span>
            <h2 className="text-base font-semibold text-gray-900">
              Indicador de Crecimiento de Facilitadores ·{" "}
              {selectedBucket?.label ?? selectedMes}
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Mide las incorporaciones mensuales de facilitadores según su{" "}
            <span className="font-medium text-gray-700">fecha de ingreso</span>,
            su distribución por ciudad/estado y las entrevistas realizadas en el
            mes.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <Link
            href="/dashboard/capacitacion/entrevista-facilitadores/nueva"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Nueva Entrevista
          </Link>
          <Link
            href="/dashboard/capacitacion/entrevista-facilitadores"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5 text-purple-600" />
            Ver Entrevistas
          </Link>
          <Link
            href="/dashboard/capacitacion/gestion-de-facilitadores"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-sky-600" />
            Gestión de Facilitadores
          </Link>
          <button
            type="button"
            onClick={handleOpenPdfInNewTab}
            disabled={isOpeningPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
            title="Abrir PDF oficial del mes seleccionado en una nueva pestaña"
          >
            {isOpeningPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
            <span>
              {isOpeningPdf
                ? "Abriendo PDF..."
                : `Ver PDF (${selectedBucket?.label ?? selectedMes})`}
            </span>
          </button>
        </div>
      </div>

      {/* ── Executive KPI Cards (Strictly Monthly, no Acumulado) ──────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Ingresos en el mes seleccionado */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">
              Nuevos Facilitadores en {selectedBucket?.label ?? selectedMes}
            </span>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <UserPlus className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-2xl font-bold text-gray-900 tabular-nums">
              +{selectedBucket?.contratados ?? 0}
            </span>
            {selectedBucket?.crecimientoPct != null &&
              selectedBucket.crecimientoPct > 0 && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <TrendingUp className="w-3 h-3" />+
                  {selectedBucket.crecimientoPct}% en el mes
                </span>
              )}
          </div>
          <p className="text-[11px] text-gray-400 mt-2 truncate">
            {selectedBucket && selectedBucket.items.length > 0
              ? selectedBucket.items.map((i) => i.nombreApellido).join(", ")
              : "Sin nuevos ingresos en este mes"}
          </p>
        </div>

        {/* Card 2: Entrevistas del Mes */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">
              Entrevistas en {selectedBucket?.label ?? selectedMes}
            </span>
            <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-2xl font-bold text-gray-900 tabular-nums">
              {selectedBucket?.entrevistasRealizadas ?? 0}
            </span>
            <span className="text-xs text-gray-500">
              ({selectedBucket?.contratados ?? 0} aprobados en el mes)
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Evaluaciones de aspirantes en {selectedBucket?.label ?? selectedMes}
          </p>
        </div>

        {/* Card 3: Cobertura Geográfica del Mes */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">
              Ciudades con Ingresos ({selectedBucket?.label ?? selectedMes})
            </span>
            <span className="p-2 rounded-lg bg-sky-50 text-sky-600">
              <MapPin className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-2xl font-bold text-gray-900 tabular-nums">
              {distinctCitiesInMes}
            </span>
            <span className="text-xs font-medium text-sky-700">
              en {distinctStatesInMes}{" "}
              {distinctStatesInMes === 1 ? "estado" : "estados"}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 truncate">
            {selectedMonthItems.length > 0
              ? Array.from(
                  new Set(
                    selectedMonthItems
                      .map((i) => i.ciudadNombre || i.estadoNombre)
                      .filter(Boolean)
                  )
                ).join(", ")
              : "Ninguna localidad registrada este mes"}
          </p>
        </div>

        {/* Card 4: Plantilla Total Registrada */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">
              Plantilla de Facilitadores
            </span>
            <span className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-2xl font-bold text-gray-900 tabular-nums">
              {data.kpis.totalPlantilla}
            </span>
            <span className="text-xs font-medium text-emerald-600">
              {data.kpis.totalActivos} activos
            </span>
          </div>
          <div className="text-[11px] text-gray-400 mt-2 flex items-center justify-between">
            <span>
              Con fecha:{" "}
              {data.kpis.totalPlantilla - data.kpis.sinFechaIngreso}
            </span>
            {data.kpis.sinFechaIngreso > 0 && (
              <button
                type="button"
                onClick={() => setScopeMode("sin_fecha")}
                className="text-amber-600 hover:text-amber-700 font-medium underline"
              >
                {data.kpis.sinFechaIngreso} pendientes de fecha
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Monthly Growth Matrix Table + Visual Trend ────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Comparativa mensual · {data.year}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Selecciona una columna de mes para consultar su indicador mensual y su vista PDF
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Mes seleccionado:</span>
            <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 font-semibold">
              {selectedBucket?.label ?? selectedMes}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[230px]">
                  Indicador Mensual
                </th>
                {data.meses.map((m) => {
                  const isSel = m.mes === selectedBucket?.mes;
                  return (
                    <th
                      key={m.mes}
                      onClick={() => {
                        onSelectMes(m.mes);
                        setScopeMode("mes_seleccionado");
                      }}
                      className={`px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide cursor-pointer select-none transition-colors ${
                        isSel
                          ? "bg-sky-50 text-sky-700 border-b-2 border-sky-600"
                          : "text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {m.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Row 1: Nuevos facilitadores incorporados */}
              <tr className="hover:bg-gray-50/60">
                <th
                  scope="row"
                  className="text-left px-4 py-3 font-semibold text-gray-900 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-sky-600"></span>
                  Nuevos facilitadores incorporados
                </th>
                {data.meses.map((m) => {
                  const isSel = m.mes === selectedBucket?.mes;
                  return (
                    <td
                      key={m.mes}
                      onClick={() => {
                        onSelectMes(m.mes);
                        setScopeMode("mes_seleccionado");
                      }}
                      className={`px-3 py-3 text-right tabular-nums cursor-pointer font-semibold ${
                        isSel ? "bg-sky-50/60" : ""
                      } ${
                        m.contratados > 0
                          ? "text-sky-700"
                          : "text-gray-300 font-normal"
                      }`}
                    >
                      {m.contratados > 0 ? `+${m.contratados}` : "0"}
                    </td>
                  );
                })}
              </tr>

              {/* Row 2: Tasa de crecimiento mensual (%) */}
              <tr className="hover:bg-gray-50/60">
                <th
                  scope="row"
                  className="text-left px-4 py-2.5 font-normal text-gray-600 pl-8 text-xs"
                >
                  Crecimiento porcentual del mes (%)
                </th>
                {data.meses.map((m) => {
                  const isSel = m.mes === selectedBucket?.mes;
                  const pct = m.crecimientoPct ?? 0;
                  return (
                    <td
                      key={m.mes}
                      className={`px-3 py-2.5 text-right tabular-nums text-xs ${
                        isSel ? "bg-sky-50/40" : ""
                      } ${
                        pct > 0
                          ? "text-emerald-600 font-semibold"
                          : "text-gray-300"
                      }`}
                    >
                      {pct > 0 ? `+${pct}%` : "0%"}
                    </td>
                  );
                })}
              </tr>

              {/* Row 3: Entrevistas */}
              <tr className="border-t border-gray-200 hover:bg-gray-50/60">
                <th
                  scope="row"
                  className="text-left px-4 py-2.5 font-medium text-gray-700 text-xs"
                >
                  Entrevistas realizadas
                </th>
                {data.meses.map((m) => {
                  const isSel = m.mes === selectedBucket?.mes;
                  return (
                    <td
                      key={m.mes}
                      className={`px-3 py-2.5 text-right tabular-nums text-xs ${
                        isSel ? "bg-sky-50/40" : ""
                      } ${
                        m.entrevistasRealizadas > 0
                          ? "text-gray-800 font-medium"
                          : "text-gray-300"
                      }`}
                    >
                      {m.entrevistasRealizadas}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Visual Monthly Bar Strip + Names Preview */}
        <div className="px-5 py-4 bg-gray-50/70 border-t border-gray-100">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Incorporaciones por mes (clic para seleccionar mes)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {data.meses.map((m) => {
              const isSel = m.mes === selectedBucket?.mes;
              const widthPct = Math.round(
                (m.contratados / maxContratadosMes) * 100
              );
              return (
                <button
                  key={m.mes}
                  type="button"
                  onClick={() => {
                    onSelectMes(m.mes);
                    setScopeMode("mes_seleccionado");
                  }}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    isSel
                      ? "bg-white border-sky-400 ring-2 ring-sky-100 shadow-sm"
                      : "bg-white border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-gray-700">
                      {m.label}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        m.contratados > 0
                          ? "bg-sky-50 text-sky-700"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {m.contratados}{" "}
                      {m.contratados === 1 ? "ingreso" : "ingresos"}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-sky-500 rounded-full transition-all"
                      style={{
                        width: `${m.contratados > 0 ? Math.max(widthPct, 15) : 0}%`,
                      }}
                    />
                  </div>
                  {m.items.length > 0 ? (
                    <div className="space-y-1 mt-2">
                      {m.items.map((fac) => (
                        <div
                          key={fac.id}
                          className="text-[11px] text-gray-700 flex items-center justify-between gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-100"
                        >
                          <span className="font-medium truncate">
                            {fac.nombreApellido}
                          </span>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">
                            {fac.ciudadNombre || fac.estadoNombre || ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-400 italic">
                      Sin ingresos registrados
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Geographic & Source Breakdown Cards (Scoped to Selected Month) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Por Estado */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-600" />
              Distribución por Estado
            </h4>
            <span className="text-[11px] text-gray-400">
              {selectedBucket?.label ?? selectedMes} / Plantilla
            </span>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {porEstadoMes.map((st) => (
              <div
                key={st.nombre}
                className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100"
              >
                <span className="font-medium text-gray-800 truncate">
                  {st.nombre}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {st.nuevosMes > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      +{st.nuevosMes} en {selectedBucket?.label}
                    </span>
                  )}
                  <span className="text-gray-500 tabular-nums font-medium w-14 text-right">
                    {st.total} total
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Por Ciudad */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-purple-600" />
              Distribución por Ciudad Base
            </h4>
            {ciudadFilter && (
              <button
                type="button"
                onClick={() => setCiudadFilter("")}
                className="text-[11px] text-sky-600 hover:underline"
              >
                Ver todas
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {porCiudadMes.map((c) => {
              const isSelected =
                c.id != null && String(c.id) === ciudadFilter;
              return (
                <button
                  key={`${c.nombre}_${c.estadoNombre}`}
                  type="button"
                  onClick={() => {
                    if (c.id != null) {
                      setCiudadFilter(isSelected ? "" : String(c.id));
                    }
                  }}
                  className={`w-full flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg border transition-colors ${
                    isSelected
                      ? "bg-sky-50 border-sky-200 text-sky-900"
                      : "hover:bg-gray-50 border-transparent"
                  }`}
                >
                  <div className="text-left truncate">
                    <span className="font-medium text-gray-800">
                      {c.nombre}
                    </span>
                    {c.estadoNombre && (
                      <span className="text-[11px] text-gray-400 ml-1">
                        · {c.estadoNombre}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {c.nuevosMes > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                        +{c.nuevosMes} en {selectedBucket?.label}
                      </span>
                    )}
                    <span className="text-gray-500 tabular-nums font-medium w-14 text-right">
                      {c.total} total
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Por Fuente de Captación */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Fuente de Captación
            </h4>
            {fuenteFilter && (
              <button
                type="button"
                onClick={() => setFuenteFilter("")}
                className="text-[11px] text-sky-600 hover:underline"
              >
                Limpiar
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {porFuenteMes.map((f) => {
              const isSelected = fuenteFilter === f.fuente;
              const badge = getFuenteBadgeStyle(
                f.fuente === "sin_especificar" ? null : f.fuente
              );
              return (
                <button
                  key={f.fuente}
                  type="button"
                  onClick={() =>
                    setFuenteFilter(isSelected ? "" : f.fuente)
                  }
                  className={`w-full flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg border transition-colors ${
                    isSelected
                      ? "bg-sky-50 border-sky-200"
                      : "hover:bg-gray-50 border-transparent"
                  }`}
                >
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${badge.className}`}
                  >
                    {f.label}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {f.nuevosMes > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        +{f.nuevosMes} en {selectedBucket?.label}
                      </span>
                    )}
                    <span className="text-gray-500 tabular-nums font-medium w-14 text-right">
                      {f.total} total
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Facilitator Hiring Directory & Inline Date Management ─────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Registro de Facilitadores e Ingresos ({displayedFacilitadores.length})
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Puedes editar directamente la fecha de ingreso, ciudad o fuente de
              cualquier facilitador.
            </p>
          </div>
        </div>

        {/* Clean Single-Row Tab Bar + Search & Dropdowns */}
        <div className="px-5 py-3 bg-gray-50/70 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Clean Horizontal Filter Tabs (Month-first, no multi-month Ago-Dic pill) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              {
                id: "mes_seleccionado" as const,
                label: `Ingresos de ${selectedBucket?.label ?? selectedMes}`,
                count: selectedBucket?.contratados ?? 0,
                badgeCls: "bg-emerald-100 text-emerald-800",
              },
              {
                id: "plantilla_completa" as const,
                label: "Plantilla Completa",
                count: data.todosFacilitadores.length,
                badgeCls: "bg-gray-200 text-gray-700",
              },
              ...(data.kpis.sinFechaIngreso > 0
                ? [
                    {
                      id: "sin_fecha" as const,
                      label: "Pendientes de Fecha",
                      count: data.kpis.sinFechaIngreso,
                      badgeCls: "bg-amber-100 text-amber-800",
                    },
                  ]
                : []),
            ].map((tab) => {
              const active = scopeMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setScopeMode(tab.id)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all ${
                    active
                      ? "bg-white border-sky-300 text-sky-800 font-semibold shadow-2xs"
                      : "bg-transparent border-transparent text-gray-600 hover:bg-white/70 hover:text-gray-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      active ? tab.badgeCls : "bg-gray-200/70 text-gray-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search + City + Fuente */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar facilitador, cédula, ciudad..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5">
              <Building2 className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={ciudadFilter}
                onChange={(e) => setCiudadFilter(e.target.value)}
                className="text-xs text-gray-700 bg-transparent outline-none"
              >
                <option value="">Todas las ciudades</option>
                {data.porCiudad
                  .filter((c) => c.id != null)
                  .map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.nombre} ({c.total})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={fuenteFilter}
                onChange={(e) => setFuenteFilter(e.target.value)}
                className="text-xs text-gray-700 bg-transparent outline-none"
              >
                <option value="">Todas las fuentes</option>
                {data.porFuente.map((f) => (
                  <option key={f.fuente} value={f.fuente}>
                    {f.label} ({f.total})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Facilitators Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse table-fixed min-w-[980px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="pl-6 pr-3 py-3 w-[24%]">Facilitador</th>
                <th className="px-3 py-3 w-[14%]">Fecha de Ingreso</th>
                <th className="px-3 py-3 w-[18%]">Ubicación</th>
                <th className="px-3 py-3 w-[13%]">Fuente</th>
                <th className="px-2 py-3 w-[11%] text-center">Entrevista</th>
                <th className="px-2 py-3 w-[6%] text-center">OSIs</th>
                <th className="pl-3 pr-6 py-3 w-[14%] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayedFacilitadores.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-gray-400 text-sm"
                  >
                    No hay facilitadores que coincidan con los filtros
                    seleccionados.
                  </td>
                </tr>
              ) : (
                displayedFacilitadores.map((item) => {
                  const fuenteBadge = getFuenteBadgeStyle(item.fuente);
                  const formattedPhone = normalizePhoneNumber(item.telefono);
                  const formattedCedula = normalizeCedula(item.cedula);
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/70 transition-colors"
                    >
                      {/* Facilitador + single-line Cédula & Teléfono */}
                      <td className="pl-6 pr-3 py-3 align-middle">
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 truncate">
                              {item.nombreApellido}
                            </span>
                            {!item.isActive && (
                              <span className="px-1.5 py-0.5 text-[10px] rounded bg-gray-100 text-gray-500 font-medium shrink-0">
                                Inactivo
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 whitespace-nowrap">
                            {formattedCedula && (
                              <span className="font-mono text-[11px] text-gray-500">
                                {formattedCedula}
                              </span>
                            )}
                            {formattedPhone && (
                              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-gray-500">
                                <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                                {formattedPhone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Fecha de Ingreso */}
                      <td className="px-3 py-3 whitespace-nowrap align-middle">
                        {item.fechaIngreso ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 tabular-nums">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            {formatShortDate(item.fechaIngreso)}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openQuickEdit(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                          >
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            Asignar fecha
                          </button>
                        )}
                      </td>

                      {/* Ubicación */}
                      <td className="px-3 py-3 align-middle">
                        {item.ciudadNombre || item.estadoNombre ? (
                          <div className="flex items-center gap-1.5 text-xs text-gray-700 truncate">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">
                              <strong className="font-medium text-gray-900">
                                {item.ciudadNombre || "—"}
                              </strong>
                              {item.estadoNombre
                                ? `, ${item.estadoNombre}`
                                : ""}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Sin ubicación
                          </span>
                        )}
                      </td>

                      {/* Fuente */}
                      <td className="px-3 py-3 whitespace-nowrap align-middle">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${fuenteBadge.className}`}
                        >
                          {fuenteBadge.label}
                        </span>
                      </td>

                      {/* Entrevista (sin mostrar #ID) */}
                      <td className="px-2 py-3 text-center whitespace-nowrap align-middle">
                        {item.entrevistaId ? (
                          <Link
                            href={`/dashboard/capacitacion/entrevista-facilitadores/${item.entrevistaId}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors"
                            title="Ver formato de entrevista"
                          >
                            <UserCheck className="w-3 h-3 shrink-0" />
                            {item.fechaEntrevista
                              ? formatShortDate(item.fechaEntrevista)
                              : "Ver entrevista"}
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>

                      {/* OSIs */}
                      <td className="px-2 py-3 text-center tabular-nums align-middle">
                        {item.osisAsignadasCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700">
                            <Briefcase className="w-3 h-3" />
                            {item.osisAsignadasCount}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">0</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="pl-3 pr-6 py-3 text-right whitespace-nowrap align-middle">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openQuickEdit(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-2xs"
                            title="Editar fecha de ingreso, ubicación o fuente"
                          >
                            <Pencil className="w-3.5 h-3.5 text-sky-600" />
                            Editar
                          </button>
                          <Link
                            href={`/dashboard/capacitacion/gestion-de-facilitadores?edit=${item.id}`}
                            className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-sky-600 hover:border-sky-200 hover:bg-sky-50 transition-colors shadow-2xs"
                            title="Abrir ficha completa del facilitador"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Quick Edit Modal for Fecha de Ingreso / Ubicación / Fuente ── */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Datos de Ingreso del Facilitador
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editingItem.nombreApellido}{" "}
                  {editingItem.cedula ? `· ${editingItem.cedula}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickEdit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Fecha de Ingreso
                </label>
                <input
                  type="date"
                  value={editFecha}
                  onChange={(e) => setEditFecha(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Determina el mes y año en que el facilitador se contabiliza en
                  el indicador de crecimiento.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Fuente de Captación
                </label>
                <select
                  value={editFuente}
                  onChange={(e) => setEditFuente(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">Sin especificar...</option>
                  {FUENTE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={editEstadoId ?? ""}
                    onChange={(e) => {
                      const val = e.target.value
                        ? parseInt(e.target.value, 10)
                        : null;
                      setEditEstadoId(val);
                      setEditCiudadId(null);
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">Seleccionar...</option>
                    {states.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.nombre_estado}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Ciudad
                  </label>
                  <select
                    value={editCiudadId ?? ""}
                    onChange={(e) =>
                      setEditCiudadId(
                        e.target.value ? parseInt(e.target.value, 10) : null
                      )
                    }
                    disabled={!editEstadoId}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-gray-100"
                  >
                    <option value="">Seleccionar...</option>
                    {citiesForEditState.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  {savingEdit ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
