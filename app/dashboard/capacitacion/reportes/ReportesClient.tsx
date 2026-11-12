"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Building2,
  TrendingUp,
  ChevronRight,
  MapPin,
  ClipboardList,
  Calendar,
  X,
  CreditCard,
  Printer,
} from "lucide-react";
import { State } from "@/types";
import { cachePortalData } from "@/lib/offline/portal-data-cache";
import ReportesV2View, { DimensionTab } from "./components/ReportesV2View";

type ReportTab = DimensionTab;

const NAV_ITEMS: {
  id: ReportTab;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "overview",
    label: "Vista General",
    description: "KPIs y resumen ejecutivo",
    icon: LayoutDashboard,
  },
  {
    id: "cursos",
    label: "Cursos",
    description: "Rendimiento por curso",
    icon: BookOpen,
  },
  {
    id: "facilitadores",
    label: "Facilitadores",
    description: "Actividad, horas y honorarios",
    icon: Users,
  },
  {
    id: "empresas",
    label: "Empresas",
    description: "Clientes capacitados",
    icon: Building2,
  },
  {
    id: "carnets",
    label: "Carnets",
    description: "Tarjetas de identificación",
    icon: CreditCard,
  },
  {
    id: "surveys",
    label: "Satisfacción",
    description: "Encuestas de participantes",
    icon: ClipboardList,
  },
  {
    id: "tendencias",
    label: "Tendencias",
    description: "Análisis temporal de actividad",
    icon: TrendingUp,
  },
  {
    id: "ubicaciones",
    label: "Estados y Sedes",
    description: "Distribución geográfica y cobertura",
    icon: MapPin,
  },
];

const DATE_PRESETS = [
  { label: "Este mes", value: "month" },
  { label: "Mes anterior", value: "last_month" },
  { label: "3 meses", value: "3m" },
  { label: "6 meses", value: "6m" },
  { label: "Este año", value: "year" },
  { label: "Todo", value: "all" },
  { label: "Personalizado", value: "custom" },
];

function getDateRange(preset: string): { from?: string; to?: string } {
  const now = new Date();
  const to = now.toISOString().split("T")[0];
  if (preset === "month") {
    const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    return { from, to };
  }
  if (preset === "last_month") {
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const lastDay = new Date(prevYear, prevMonth, 0).getDate();
    const from = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
    const toDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return { from, to: toDate };
  }
  if (preset === "1m") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    return { from: from.toISOString().split("T")[0], to };
  }
  if (preset === "3m") {
    const from = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    return { from: from.toISOString().split("T")[0], to };
  }
  if (preset === "6m") {
    const from = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    return { from: from.toISOString().split("T")[0], to };
  }
  if (preset === "year") {
    return { from: `${now.getFullYear()}-01-01`, to };
  }
  return {};
}

interface ReportesClientProps {
  user: any;
  states: State[];
}

export default function ReportesClient({ user, states }: ReportesClientProps) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<ReportTab>("overview");
  const [datePreset, setDatePreset] = useState("all");
  const [selectedState, setSelectedState] = useState("");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const hasInitialized = useRef(false);

  // Cache states on mount
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      cachePortalData("dash_reportes", "dash_reportes", { states }).catch(() => {});
    }
  }, [states]);

  // Initialize state from URL params
  useEffect(() => {
    const tab = searchParams.get("tab") as ReportTab;
    const date = searchParams.get("date");
    const state = searchParams.get("state");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (tab && NAV_ITEMS.find((item) => item.id === tab)) {
      setActiveTab(tab);
    }
    if (date && DATE_PRESETS.find((item) => item.value === date)) {
      setDatePreset(date);
    }
    if (state && states.find((s) => s.id.toString() === state)) {
      setSelectedState(state);
    }
    if (from && to) {
      setCustomFromDate(from);
      setCustomToDate(to);
      setDatePreset("custom");
    }
  }, [searchParams, states]);

  // Update URL params when state changes
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("tab", activeTab);
    params.set("date", datePreset);
    if (selectedState) params.set("state", selectedState);
    if (datePreset === "custom" && customFromDate && customToDate) {
      params.set("from", customFromDate);
      params.set("to", customToDate);
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
  }, [activeTab, datePreset, selectedState, customFromDate, customToDate]);

  const { from: dateFrom, to: dateTo } = useMemo(() => {
    return datePreset === "custom"
      ? { from: customFromDate, to: customToDate }
      : getDateRange(datePreset);
  }, [datePreset, customFromDate, customToDate]);

  const activeNav = NAV_ITEMS.find((n) => n.id === activeTab) || NAV_ITEMS[0];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top filter bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between gap-4 flex-wrap sticky top-0 z-20 shadow-xs">
        <div>
          <h1 className="text-base font-bold text-gray-900">
            Reportes de Capacitación
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Métricas analíticas consolidadas, trazabilidad de horas y KPIs operacionales
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap relative">
          {/* Date preset pills */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  if (p.value === "custom") {
                    setShowDatePicker(!showDatePicker);
                  } else {
                    setDatePreset(p.value);
                    setShowDatePicker(false);
                  }
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  datePreset === p.value
                    ? "bg-white text-sky-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom date picker */}
          {showDatePicker && (
            <div className="absolute top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 min-w-[300px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  Rango de fechas personalizado
                </h3>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={customFromDate}
                    onChange={(e) => setCustomFromDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={customToDate}
                    onChange={(e) => setCustomToDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      if (customFromDate && customToDate) {
                        setDatePreset("custom");
                        setShowDatePicker(false);
                      }
                    }}
                    disabled={!customFromDate || !customToDate}
                    className="flex-1 px-3 py-2 bg-sky-600 text-white text-sm font-medium rounded-md hover:bg-sky-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Aplicar
                  </button>
                  <button
                    onClick={() => {
                      setCustomFromDate("");
                      setCustomToDate("");
                      setDatePreset("all");
                      setShowDatePicker(false);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* State filter */}
          <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-sm text-gray-600">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="text-xs text-gray-700 bg-transparent outline-none max-w-[140px]"
            >
              <option value="">Todos los estados</option>
              {states.map((s) => (
                <option key={s.id} value={s.id.toString()}>
                  {s.nombre_estado}
                </option>
              ))}
            </select>
          </div>

          {/* Clear filters button */}
          {(selectedState || datePreset !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSelectedState("");
                setDatePreset("all");
                setCustomFromDate("");
                setCustomToDate("");
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
              title="Restablecer fechas y estados"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
              <span>Limpiar filtros</span>
            </button>
          )}

          {/* PDF / Print Preview button */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 shadow-xs transition-colors shrink-0"
            title="Vista previa e impresión / Descargar en PDF"
          >
            <Printer className="w-3.5 h-3.5 text-sky-600" />
            <span>PDF / Imprimir</span>
          </button>
        </div>
      </header>

      {/* Report content */}
      <main className="flex-1 p-6 overflow-auto">
        <ReportesV2View
          activeTab={activeTab}
          onTabChange={setActiveTab}
          dateFrom={dateFrom}
          dateTo={dateTo}
          selectedState={selectedState}
        />
      </main>
    </div>
  );
}
