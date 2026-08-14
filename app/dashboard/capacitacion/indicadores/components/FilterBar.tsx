"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Search,
  X,
  ChevronDown,
  Check,
  MapPin,
  Building2,
  UserCheck,
  Download,
  AlertTriangle,
} from "lucide-react";
import type {
  IndicadorOsiOption,
  IndicadoresFilterOptions,
} from "@/types";

const DATE_PRESETS = [
  { label: "1 mes", value: "1m" },
  { label: "3 meses", value: "3m" },
  { label: "6 meses", value: "6m" },
  { label: "Este año", value: "year" },
  { label: "Personalizado", value: "custom" },
  { label: "Todo", value: "all" },
];

// Format a Date as "YYYY-MM-DD" in local time (avoids UTC offset issues
// that occur with toISOString(), which can shift the date by 1 day in UTC-4).
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDateRange(preset: string): { from?: string; to?: string } {
  const now = new Date();
  const to = toLocalDateStr(now);
  if (preset === "1m") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    return { from: toLocalDateStr(from), to };
  }
  if (preset === "3m") {
    const from = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    return { from: toLocalDateStr(from), to };
  }
  if (preset === "6m") {
    const from = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    return { from: toLocalDateStr(from), to };
  }
  if (preset === "year") {
    return { from: `${now.getFullYear()}-01-01`, to };
  }
  return {};
}

export interface IndicadoresFilterState {
  osiIds: number[];
  datePreset: string;
  customFrom: string;
  customTo: string;
  empresaId: string;
  facilitadorId: string;
  estadoId: string;
  soloIncumplimientos: boolean;
}

interface Props {
  options: IndicadoresFilterOptions;
  state: IndicadoresFilterState;
  onChange: (next: IndicadoresFilterState) => void;
  onExportCsv: () => void;
}

export default function FilterBar({
  options,
  state,
  onChange,
  onExportCsv,
}: Props) {
  const [osiDropdownOpen, setOsiDropdownOpen] = useState(false);
  const [osiSearch, setOsiSearch] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  // Local draft state for custom date inputs — only propagated to the parent
  // (which triggers a fetch) when the user clicks "Aplicar". This prevents
  // intermediate fetches while the user is still selecting the date range.
  const [draftFrom, setDraftFrom] = useState(state.customFrom);
  const [draftTo, setDraftTo] = useState(state.customTo);
  const osiRef = useRef<HTMLDivElement>(null);

  // Close OSI dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (osiRef.current && !osiRef.current.contains(e.target as Node)) {
        setOsiDropdownOpen(false);
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

  function applyDatePreset(value: string) {
    if (value === "custom") {
      // Sync draft state from the parent when opening the picker
      if (!showDatePicker) {
        setDraftFrom(state.customFrom);
        setDraftTo(state.customTo);
      }
      setShowDatePicker(!showDatePicker);
      return;
    }
    setShowDatePicker(false);
    onChange({ ...state, datePreset: value });
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

        {/* Date preset pills */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 relative">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => applyDatePreset(p.value)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                state.datePreset === p.value
                  ? "bg-white text-sky-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date picker popover */}
        {showDatePicker && (
          <div className="absolute top-full mt-2 right-40 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 min-w-[300px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Rango personalizado
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
                  value={draftFrom}
                  onChange={(e) => setDraftFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Hasta
                </label>
                <input
                  type="date"
                  value={draftTo}
                  onChange={(e) => setDraftTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                />
              </div>
              <button
                onClick={() => {
                  if (draftFrom && draftTo) {
                    onChange({
                      ...state,
                      customFrom: draftFrom,
                      customTo: draftTo,
                      datePreset: "custom",
                    });
                    setShowDatePicker(false);
                  }
                }}
                disabled={!draftFrom || !draftTo}
                className="w-full px-3 py-2 bg-sky-600 text-white text-sm font-medium rounded-md hover:bg-sky-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Aplicar
              </button>
            </div>
          </div>
        )}

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

      <button
        onClick={onExportCsv}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Exportar CSV
      </button>
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
  placeholder: string;
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
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export { getDateRange, DATE_PRESETS };
export type { IndicadorOsiOption };
