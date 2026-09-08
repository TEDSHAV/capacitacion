"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Inbox,
  ArrowRightCircle,
  History,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import type { OsiCarryRow, OsiNota } from "@/types";
import { getOsiNotas } from "@/app/actions/capacitacion-osi-notas";
import OsiNotasModal from "./OsiNotasModal";

interface Props {
  /** All OSIs for the year (from the gestion response). */
  osisList: OsiCarryRow[];
  /** "YYYY-MM" of the selected month. */
  selectedMes: string;
  /** Display label for the selected month, e.g. "Ago 26". */
  selectedMesLabel: string;
  /** URL of the shell app for linking to consulta-osi. */
  shellUrl: string;
}

type Population = "arrastradas" | "pasaran" | "rezagadas";

const POPULATION_DEFS: Record<
  Population,
  { label: string; icon: typeof Inbox; description: string }
> = {
  arrastradas: {
    label: "Arrastradas de meses anteriores",
    icon: Inbox,
    description: "Planificadas antes de este mes, aún pendientes o ejecutadas después",
  },
  pasaran: {
    label: "Pasarán al próximo mes",
    icon: ArrowRightCircle,
    description: "Planificadas para este mes, aún pendientes o ejecutadas después",
  },
  rezagadas: {
    label: "Rezagadas ejecutadas este mes",
    icon: History,
    description: "Planificadas antes y ejecutadas durante este mes",
  },
};

// Helper: compute days overdue relative to a reference month-end date
function computeDiasAtraso(
  ultimaFechaPlanificada: string | null,
  selectedMes: string,
): number | null {
  if (!ultimaFechaPlanificada) return null;

  // Parse selectedMes "YYYY-MM" to get the last day of that month
  const [year, month] = selectedMes.split("-").map(Number);
  if (!year || !month) return null;

  // Last day of the month: first day of next month minus 1 day
  const lastDayOfMonth = new Date(year, month, 0); // month is 1-indexed, so month-1 gives us the last day of the previous month
  const refDate = new Date(year, month, 0); // This gives us the last day of the selected month

  const planDate = new Date(ultimaFechaPlanificada);
  if (isNaN(planDate.getTime())) return null;

  // If the planned date is after the reference month, no delay yet
  if (planDate > refDate) return null;

  // Days between planned date and end of month
  const dias = Math.floor((refDate.getTime() - planDate.getTime()) / 86_400_000);
  return dias >= 0 ? dias : null;
}

export default function CarryPanel({
  osisList,
  selectedMes,
  selectedMesLabel,
  shellUrl,
}: Props) {
  const [open, setOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<Population>("arrastradas");
  const [notasByOsi, setNotasByOsi] = useState<Record<number, OsiNota[]>>({});
  const [selectedOsiForNotes, setSelectedOsiForNotes] = useState<number | null>(null);

  // Fetch notes for all OSIs on mount
  useEffect(() => {
    const osiIds = osisList.map((o) => o.id);
    if (osiIds.length === 0) return;

    getOsiNotas(osiIds).then((result) => {
      if (result.success && result.data) {
        setNotasByOsi(result.data);
      }
    });
  }, [osisList]);

  const groups = useMemo(() => {
    const arrastradas: OsiCarryRow[] = [];
    const pasaran: OsiCarryRow[] = [];
    const rezagadas: OsiCarryRow[] = [];

    for (const o of osisList) {
      // Arrastradas: planned before selectedMes AND (not executed OR executed after selectedMes)
      if (
        o.mesPlanificado < selectedMes &&
        (o.mesEjecucion == null || o.mesEjecucion > selectedMes)
      ) {
        arrastradas.push(o);
      }
      // Pasarán: planned for selectedMes AND (not executed OR executed after selectedMes)
      else if (
        o.mesPlanificado === selectedMes &&
        (o.mesEjecucion == null || o.mesEjecucion > selectedMes)
      ) {
        pasaran.push(o);
      }
      // Rezagadas: planned before selectedMes AND executed during selectedMes
      else if (
        o.mesPlanificado < selectedMes &&
        o.mesEjecucion === selectedMes
      ) {
        rezagadas.push(o);
      }
    }

    // Sort: by dias atraso (computed locally), most overdue first
    const byAtraso = (a: OsiCarryRow, b: OsiCarryRow) => {
      const diasA = computeDiasAtraso(a.ultimaFechaPlanificada, selectedMes) ?? -1;
      const diasB = computeDiasAtraso(b.ultimaFechaPlanificada, selectedMes) ?? -1;
      return diasB - diasA;
    };
    arrastradas.sort(byAtraso);
    pasaran.sort(byAtraso);
    rezagadas.sort((a, b) =>
      (b.ultimaFechaPlanificada ?? "").localeCompare(
        a.ultimaFechaPlanificada ?? "",
      ),
    );

    return { arrastradas, pasaran, rezagadas };
  }, [osisList, selectedMes]);

  const counts = {
    arrastradas: groups.arrastradas.length,
    pasaran: groups.pasaran.length,
    rezagadas: groups.rezagadas.length,
  };

  const totalCarry = counts.arrastradas + counts.pasaran + counts.rezagadas;
  const activeList = groups[activeTab];

  return (
    <>
      <div className="rounded-xl">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-1 py-2 bg-transparent"
        >
          <div className="flex items-center gap-2">
            {open ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
            <h3 className="text-sm font-semibold text-gray-900">
              Arrastre de OSIs · {selectedMesLabel}
            </h3>
            {totalCarry > 0 && (
              <span className="ml-1 text-[11px] font-semibold text-gray-600">
                {totalCarry} OSI{totalCarry === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-gray-500">
            {counts.arrastradas > 0 && (
              <span>{counts.arrastradas} arrastradas</span>
            )}
            {counts.pasaran > 0 && (
              <span>{counts.pasaran} pendientes</span>
            )}
            {counts.rezagadas > 0 && (
              <span>{counts.rezagadas} rezagadas</span>
            )}
          </div>
        </button>

        {open && (
          <div className="border-t border-gray-100 mt-1">
            {totalCarry === 0 ? (
              <div className="px-1 py-6 text-center text-sm text-gray-400">
                No hay OSIs en arrastre para {selectedMesLabel}.
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="flex items-center gap-1 px-1 pt-2 border-b border-gray-100">
                  {(Object.keys(POPULATION_DEFS) as Population[]).map((key) => {
                    const def = POPULATION_DEFS[key];
                    const count = counts[key];
                    if (count === 0) return null;
                    const Icon = def.icon;
                    const active = activeTab === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors bg-transparent ${
                          active
                            ? "border-gray-800 text-gray-900"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {def.label}
                        <span className="ml-0.5 text-[10px] text-gray-500">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Description */}
                <div className="px-1 pt-2">
                  <p className="text-[11px] text-gray-500">
                    {POPULATION_DEFS[activeTab].description}
                  </p>
                </div>

                {/* Table */}
                <div className="overflow-x-auto px-1 py-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                        <th className="py-2 pr-3">OSI</th>
                        <th className="py-2 pr-3">Empresa</th>
                        <th className="py-2 pr-3">Planificada</th>
                        <th className="py-2 pr-3">Ejecutada</th>
                        <th className="py-2 pr-3">Estatus</th>
                        <th className="py-2 pr-3 text-right">Días atraso</th>
                        <th className="py-2 pr-3">Notas</th>
                        <th className="py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeList.map((o) => {
                        const diasAtraso = computeDiasAtraso(
                          o.ultimaFechaPlanificada,
                          selectedMes,
                        );
                        const notasCount = notasByOsi[o.id]?.length ?? 0;
                        return (
                          <tr
                            key={o.id}
                            className="border-t border-gray-50"
                          >
                            <td className="py-2 pr-3 font-medium text-gray-900">
                              {o.nroOsi}
                            </td>
                            <td className="py-2 pr-3 text-gray-600 truncate max-w-[200px]">
                              {o.empresa ?? "—"}
                            </td>
                            <td className="py-2 pr-3 text-gray-600 tabular-nums">
                              {o.ultimaFechaPlanificada ?? "—"}
                            </td>
                            <td className="py-2 pr-3 text-gray-600 tabular-nums">
                              {o.mesEjecucion ?? "—"}
                            </td>
                            <td className="py-2 pr-3">
                              <span className="text-[11px] text-gray-600">
                                {o.estatus}
                              </span>
                            </td>
                            <td className="py-2 pr-3 text-right tabular-nums">
                              {diasAtraso != null ? (
                                <span
                                  className={
                                    diasAtraso > 30
                                      ? "text-red-600 font-semibold"
                                      : diasAtraso > 7
                                        ? "text-amber-600 font-medium"
                                        : "text-gray-700"
                                  }
                                >
                                  {diasAtraso}d
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="py-2 pr-3">
                              <button
                                onClick={() => setSelectedOsiForNotes(o.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                                title={
                                  notasCount > 0
                                    ? `${notasCount} nota${notasCount === 1 ? "" : "s"}`
                                    : "Agregar nota"
                                }
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                {notasCount > 0 && (
                                  <span className="text-[10px] font-semibold text-gray-500">
                                    {notasCount}
                                  </span>
                                )}
                              </button>
                            </td>
                            <td className="py-2">
                              <a
                                href={`${shellUrl}/consulta-osi?nro_osi=${encodeURIComponent(o.nroOsi)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700"
                              >
                                Ver
                                <ExternalLink className="w-3 h-3" />
                              </a>
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
        )}
      </div>

      {/* Notes modal */}
      {selectedOsiForNotes != null && (
        <OsiNotasModal
          osiId={selectedOsiForNotes}
          osiNumber={
            osisList.find((o) => o.id === selectedOsiForNotes)?.nroOsi ?? "—"
          }
          initialNotas={notasByOsi[selectedOsiForNotes] ?? []}
          onClose={() => setSelectedOsiForNotes(null)}
          onNotasUpdated={(updatedNotas) => {
            setNotasByOsi((prev) => ({
              ...prev,
              [selectedOsiForNotes]: updatedNotas,
            }));
          }}
        />
      )}
    </>
  );
}
