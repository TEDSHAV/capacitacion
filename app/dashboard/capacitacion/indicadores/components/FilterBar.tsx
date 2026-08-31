"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Search,
  ChevronDown,
  Check,
  MapPin,
  Building2,
  UserCheck,
  Download,
  AlertTriangle,
  CalendarRange,
  CalendarDays,
} from "lucide-react";
import type {
  IndicadorOsiOption,
  IndicadoresFilterOptions,
} from "@/types";

export interface IndicadoresFilterState {
  osiIds: number[];
  /** Calendar year driving both the monthly matrix and the 72h section. */
  year: number;
  empresaId: string;
  facilitadorId: string;
  estadoId: string;
  soloIncumplimientos: boolean;
}

const MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/** Build "YYYY-MM" → "Mes" option pairs for a given year. */
function monthOptionsForYear(year: number): { value: string; label: string }[] {
  return MONTH_LABELS.map((label, i) => ({
    value: `${year}-${String(i + 1).padStart(2, "0")}`,
    label,
  }));
}

interface Props {
  options: IndicadoresFilterOptions;
  state: IndicadoresFilterState;
  onChange: (next: IndicadoresFilterState) => void;
  /** Years offered by the selector — resolved from the data, newest first. */
  years: number[];
  /** "YYYY-MM" of the selected month, drives the 72h scope and matrix highlight. */
  selectedMes: string;
  onSelectMes: (mes: string) => void;
  onExportGestionCsv: () => void;
  onExportDetalleCsv: () => void;
}

export default function FilterBar({
  options,
  state,
  onChange,
  years,
  selectedMes,
  onSelectMes,
  onExportGestionCsv,
  onExportDetalleCsv,
}: Props) {
  const [osiDropdownOpen, setOsiDropdownOpen] = useState(false);
  const [osiSearch, setOsiSearch] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const osiRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close the OSI / export dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (osiRef.current && !osiRef.current.contains(e.target as Node)) {
        setOsiDropdownOpen(false);
      }
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredOsis = useMemo(() => {
    const term = osiSearch.trim().toLowerCase();
    if (!term) return options.osis;
    return options.osis.filter(
      (o) =>
        o.nro_osi.toLowerCase().includes(term) ||
        (o.nombre_empresa ?? "").toLowerCase().includes(term) ||
        (o.servicio ?? "").toLowerCase().includes(term),
    );
  }, [options.osis, osiSearch]);

  function toggleOsi(id: number) {
    const next = state.osiIds.includes(id)
      ? state.osiIds.filter((x) => x !== id)
      : [...state.osiIds, id];
    onChange({ ...state, osiIds: next });
  }

  function clearOsis() {
    onChange({ ...state, osiIds: [] });
  }

  const osiLabel =
    state.osiIds.length === 0
      ? "Todas las OSIs"
      : state.osiIds.length === 1
        ? options.osis.find((o) => o.id === state.osiIds[0])?.nro_osi ??
          "1 OSI"
        : `${state.osiIds.length} OSIs`;

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between gap-4 flex-wrap sticky top-0 z-40">
      <div className="flex items-center gap-3 flex-wrap">
        {/* OSI multi-select */}
        <div className="relative" ref={osiRef}>
          <button
            onClick={() => setOsiDropdownOpen((v) => !v)}
            className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-sm text-gray-700 hover:border-gray-300 min-w-[180px]"
          >
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <span className="flex-1 text-left truncate">{osiLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {osiDropdownOpen && (
            <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-[360px]">
              <div className="p-3 border-b border-gray-100">
                <div className="flex items-center gap-2 bg-gray-50 rounded-md px-2.5 py-1.5">
                  <Search className="w-3.5 h-3.5 text-gray-400" />
                  <input
                    autoFocus
                    value={osiSearch}
                    onChange={(e) => setOsiSearch(e.target.value)}
                    placeholder="Buscar OSI, empresa, servicio..."
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                  {state.osiIds.length > 0 && (
                    <button
                      onClick={clearOsis}
                      className="text-xs text-gray-400 hover:text-gray-700"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  {state.osiIds.length} seleccionada(s) · {filteredOsis.length} resultado(s)
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filteredOsis.length === 0 ? (
                  <p className="text-xs text-gray-400 p-4 text-center">
                    Sin resultados
                  </p>
                ) : (
                  filteredOsis.map((o) => {
                    const selected = state.osiIds.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        onClick={() => toggleOsi(o.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                            selected
                              ? "bg-sky-600 border-sky-600"
                              : "border-gray-300"
                          }`}
                        >
                          {selected && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {o.nro_osi}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate">
                            {o.nombre_empresa ?? "—"}
                            {o.servicio ? ` · ${o.servicio}` : ""}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Year selector — drives the monthly matrix and scopes the 72h view */}
        <SelectFilter
          icon={<CalendarRange className="w-3.5 h-3.5 text-gray-400" />}
          value={String(state.year)}
          onChange={(v) => onChange({ ...state, year: parseInt(v, 10) })}
          options={years.map((y) => ({ value: String(y), label: String(y) }))}
        />

        {/* Month selector — scopes the 72h view and highlights the matrix row */}
        <SelectFilter
          icon={<CalendarDays className="w-3.5 h-3.5 text-gray-400" />}
          value={selectedMes}
          onChange={(v) => onSelectMes(v)}
          options={monthOptionsForYear(state.year)}
        />

        {/* Empresa */}
        <SelectFilter
          icon={<Building2 className="w-3.5 h-3.5 text-gray-400" />}
          value={state.empresaId}
          onChange={(v) => onChange({ ...state, empresaId: v })}
          placeholder="Todas las empresas"
          options={options.empresas.map((e) => ({
            value: e.id.toString(),
            label: e.razon_social,
          }))}
        />

        {/* Facilitador */}
        <SelectFilter
          icon={<UserCheck className="w-3.5 h-3.5 text-gray-400" />}
          value={state.facilitadorId}
          onChange={(v) => onChange({ ...state, facilitadorId: v })}
          placeholder="Todos los facilitadores"
          options={options.facilitadores.map((f) => ({
            value: f.id.toString(),
            label: f.nombre_apellido,
          }))}
        />

        {/* Estado */}
        <SelectFilter
          icon={<MapPin className="w-3.5 h-3.5 text-gray-400" />}
          value={state.estadoId}
          onChange={(v) => onChange({ ...state, estadoId: v })}
          placeholder="Todos los estados"
          options={options.estados.map((s) => ({
            value: s.id.toString(),
            label: s.nombre_estado,
          }))}
        />

        {/* Solo incumplimientos toggle */}
        <button
          onClick={() =>
            onChange({
              ...state,
              soloIncumplimientos: !state.soloIncumplimientos,
            })
          }
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            state.soloIncumplimientos
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Solo incumplimientos
        </button>
      </div>

      <div className="relative" ref={exportRef}>
        <button
          onClick={() => setExportOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Exportar CSV
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        {exportOpen && (
          <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-[220px] py-1">
            <button
              onClick={() => {
                onExportGestionCsv();
                setExportOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
            >
              Matriz mensual
            </button>
            <button
              onClick={() => {
                onExportDetalleCsv();
                setExportOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
            >
              Detalle 72 horas
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function SelectFilter({
  icon,
  value,
  onChange,
  placeholder,
  options,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  /** Omit to render a selector with no empty "all" option (e.g. the year). */
  placeholder?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-sm text-gray-600">
      {icon}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs text-gray-700 bg-transparent outline-none max-w-[140px]"
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export type { IndicadorOsiOption };
