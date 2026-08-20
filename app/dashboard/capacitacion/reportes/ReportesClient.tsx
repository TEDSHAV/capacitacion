"use client";

import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { State } from "@/types";
import { cachePortalData } from "@/lib/offline/portal-data-cache";
import OverviewReport from "./components/OverviewReport";
import CursosReport from "./components/CursosReport";
import FacilitadoresReport from "./components/FacilitadoresReport";
import EmpresasReport from "./components/EmpresasReport";
import CarnetsReport from "./components/CarnetsReport";
import TendenciasReport from "./components/TendenciasReport";
import SurveysReport from "./components/SurveysReport";

type ReportTab =
  | "overview"
  | "cursos"
  | "facilitadores"
  | "empresas"
  | "carnets"
  | "tendencias"
  | "surveys";

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
    description: "Actividad y horas dictadas",
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
    description: "Análisis temporal 24 meses",
    icon: TrendingUp,
  },
];

const DATE_PRESETS = [
  { label: "1 mes", value: "1m" },
  { label: "3 meses", value: "3m" },
  { label: "6 meses", value: "6m" },
  { label: "Este año", value: "year" },
  { label: "Personalizado", value: "custom" },
  { label: "Todo", value: "all" },
];

function getDateRange(preset: string): { from?: string; to?: string } {
  const now = new Date();
  const to = now.toISOString().split("T")[0];
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

    if (tab && NAV_ITEMS.find(item => item.id === tab)) {
      setActiveTab(tab);
    }
    if (date && DATE_PRESETS.find(item => item.value === date)) {
      setDatePreset(date);
    }
    if (state && states.find(s => s.id.toString() === state)) {
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

  const { from: dateFrom, to: dateTo } = datePreset === "custom" 
    ? { from: customFromDate, to: customToDate }
    : getDateRange(datePreset);
  const activeNav = NAV_ITEMS.find((n) => n.id === activeTab)!;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Módulo
          </p>
          <h1 className="text-lg font-bold text-gray-900 mt-0.5">Reportes</h1>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${
                  isActive
                    ? "bg-sky-600 text-white"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon
                  className={`w-4.5 h-4.5 flex-shrink-0 ${
                    isActive
                      ? "text-white"
                      : "text-gray-400 group-hover:text-gray-600"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium leading-tight ${
                      isActive ? "text-white" : ""
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className="text-[11px] text-gray-400 leading-tight truncate mt-0.5">
                    {item.description}
                  </p>
                </div>
                {isActive && (
                  <ChevronRight className="w-3.5 h-3.5 text-sky-200 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <p className="text-[11px] text-gray-400 leading-snug">
            Los datos se calculan en tiempo real desde la base de datos.
          </p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top filter bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {activeNav.label}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {activeNav.description}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap relative">
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
                  <h3 className="text-sm font-semibold text-gray-900">Rango de fechas personalizado</h3>
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Desde</label>
                    <input
                      type="date"
                      value={customFromDate}
                      onChange={(e) => setCustomFromDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Hasta</label>
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
          </div>
        </header>

        {/* Report content */}
        <main className="flex-1 p-6 overflow-auto">
          {activeTab === "overview" && (
            <OverviewReport
              dateFrom={dateFrom}
              dateTo={dateTo}
              selectedState={selectedState}
            />
          )}
          {activeTab === "cursos" && (
            <CursosReport
              dateFrom={dateFrom}
              dateTo={dateTo}
              selectedState={selectedState}
            />
          )}
          {activeTab === "facilitadores" && (
            <FacilitadoresReport
              dateFrom={dateFrom}
              dateTo={dateTo}
              selectedState={selectedState}
            />
          )}
          {activeTab === "empresas" && (
            <EmpresasReport
              dateFrom={dateFrom}
              dateTo={dateTo}
              selectedState={selectedState}
            />
          )}
          {activeTab === "carnets" && (
            <CarnetsReport
              dateFrom={dateFrom}
              dateTo={dateTo}
              selectedState={selectedState}
            />
          )}
          {activeTab === "tendencias" && (
            <TendenciasReport selectedState={selectedState} />
          )}
          {activeTab === "surveys" && (
            <SurveysReport
              dateFrom={dateFrom}
              dateTo={dateTo}
              selectedState={selectedState}
            />
          )}
        </main>
      </div>
    </div>
  );
}
