"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RequisicionFilters, EstatusAdmin } from "@/types/requisiciones";
import RequisicionRow from "./RequisicionRow";
import { mapGerenciaSolicitante, getRequisicionDisplayDate } from "@/lib/requisiciones-gerencia";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 30, 50];

// "Historial" tab is appended dynamically inside the component (only for non-admin
// liders/coordinadors) so regular users and admins don't see it.

const EMPTY_FILTERS: RequisicionFilters = {
  tab: "todas",
  gerencia: "",
  estatus: "",
  fechaDesde: "",
  fechaHasta: "",
  search: "",
  osi: "",
  empresa: "",
  curso: "",
};

function isInterna(record: any): boolean {
  return (
    record.tipo_solicitud === "Interno" ||
    (!record.tipo_solicitud && !record.id_osi)
  );
}

export default function RequisicionesTable({
  records,
  isAdminView,
  osiLookup,
  isCoordinador = false,
  coordinadorDepts = [],
  isLider = false,
  liderDepts = [],
  liderFallbackDepts = [],
}: {
  records: any[];
  isAdminView: boolean;
  osiLookup?: Map<number, string>;
  isCoordinador?: boolean;
  coordinadorDepts?: string[];
  isLider?: boolean;
  liderDepts?: string[];
  liderFallbackDepts?: string[];
}) {
  const [filters, setFilters] = useState<RequisicionFilters>(EMPTY_FILTERS);

  // "Historial" tab is only shown to non-admin liders/coordinadors so they can
  // see requisiciones they've already approved/rejected (tagged with
  // _isApprovalHistory by getAllRequisiciones).
  const tabs = useMemo(() => {
    const base: { key: RequisicionFilters["tab"]; label: string }[] = [
      { key: "todas", label: "Todas" },
      { key: "internas", label: "Internas" },
      { key: "externas", label: "Externas" },
    ];
    if (!isAdminView && (isLider || isCoordinador)) {
      base.push({ key: "historial", label: "Historial" });
    }
    return base;
  }, [isAdminView, isLider, isCoordinador]);

  // Normalize a department name: trim, replace underscores/hyphens with spaces,
  // collapse whitespace, and title-case. This deduplicates variants like
  // "servicios tecnicos" vs "servicios_tecnicos".
  function normalizeDept(raw: string): string {
    return raw
      .trim()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Use the departamento field (preferred), falling back to the mapped
  // gerencia_solicitante for legacy records. Normalized to deduplicate variant
  // spellings. Mapping the fallback ensures legacy "Marketing" records group
  // under "Negocios" in the filter dropdown.
  const departamentos = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) {
      const raw = r.departamento?.trim() || mapGerenciaSolicitante(r.gerencia_solicitante).trim();
      if (raw) set.add(normalizeDept(raw));
    }
    return [...set].sort();
  }, [records]);

  // Unique empresa/cliente names for the dropdown.
  const empresas = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) {
      const e = r.v_osi_formato_completo?.nombre_empresa?.trim();
      if (e) set.add(e);
    }
    return [...set].sort();
  }, [records]);

  // Unique curso/servicio names for the dropdown.
  const cursos = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) {
      const s = r.v_osi_formato_completo?.servicio?.trim();
      if (s) set.add(s);
    }
    return [...set].sort();
  }, [records]);

  const filtered = useMemo(() => {
    const result = records.filter((r) => {
      if (filters.tab === "internas" && !isInterna(r)) return false;
      if (filters.tab === "externas" && isInterna(r)) return false;
      if (filters.tab === "historial" && !r._isApprovalHistory) return false;

      if (
        filters.gerencia &&
        normalizeDept(r.departamento?.trim() || mapGerenciaSolicitante(r.gerencia_solicitante).trim() || "") !== filters.gerencia
      ) {
        return false;
      }

      if (filters.estatus) {
        const estatus = r.estatus_admin || "pendiente";
        if (estatus !== filters.estatus) return false;
      }

      // Filter on the date the user actually sees in the "Fecha" column
      // (execution date, falling back to fecha_solicitud) so the filter and
      // the display never disagree.
      const displayDate = getRequisicionDisplayDate(r);
      if (filters.fechaDesde && (!displayDate || displayDate < filters.fechaDesde)) {
        return false;
      }
      if (filters.fechaHasta && (!displayDate || displayDate > filters.fechaHasta)) {
        return false;
      }

      // Empresa/Cliente filter: exact match on the OSI's nombre_empresa.
      if (filters.empresa) {
        const empresa = r.v_osi_formato_completo?.nombre_empresa || "";
        if (empresa !== filters.empresa) return false;
      }

      // Course name filter: exact match on the OSI's servicio.
      if (filters.curso) {
        const servicio = r.v_osi_formato_completo?.servicio || "";
        if (servicio !== filters.curso) return false;
      }

      if (filters.search) {
        const q = filters.search.toLowerCase();
        const linkedOsiNumbers = (r.requisiciones_osis || [])
          .map((ro: any) => osiLookup?.get(ro.id_osi))
          .filter(Boolean);
        const haystack = [
          r.solicitante,
          mapGerenciaSolicitante(r.gerencia_solicitante),
          r.v_osi_formato_completo?.nro_osi,
          r.v_osi_formato_completo?.servicio,
          ...linkedOsiNumbers,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    // Sort: pendiente first, then procesada, then rechazada; preserve id DESC within each group
    const statusOrder: Record<string, number> = { pendiente: 0, procesada: 1, rechazada: 2 };
    result.sort((a, b) => {
      const sa = statusOrder[a.estatus_admin || "pendiente"] ?? 3;
      const sb = statusOrder[b.estatus_admin || "pendiente"] ?? 3;
      if (sa !== sb) return sa - sb;
      return (b.id || 0) - (a.id || 0);
    });

    return result;
  }, [records, filters, osiLookup]);

  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, pageSize]);

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const counts = useMemo(
    () => ({
      todas: records.length,
      internas: records.filter(isInterna).length,
      externas: records.filter((r) => !isInterna(r)).length,
      historial: records.filter((r) => r._isApprovalHistory).length,
    }),
    [records],
  );

  const hasActiveFilters =
    filters.gerencia ||
    filters.estatus ||
    filters.fechaDesde ||
    filters.fechaHasta ||
    filters.search ||
    filters.empresa ||
    filters.curso;

  return (
    <div className="space-y-4">
      {/* Internas / Externas / Historial tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilters((f) => ({ ...f, tab: tab.key }))}
            className={`px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition-colors -mb-px ${
              filters.tab === tab.key
                ? "border-blue-600 text-blue-600 bg-blue-50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            {tab.label}
            <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {counts[tab.key as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      {/* Filters bar (available to all users) */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-gray-500 uppercase">Buscar</span>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Solicitante, OSI..."
              className="h-9 pl-8 w-56"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-gray-500 uppercase">Empresa/Cliente</span>
          <Select
            value={filters.empresa || "todas"}
            onValueChange={(v: string) =>
              setFilters((f) => ({ ...f, empresa: v === "todas" ? "" : v }))
            }
          >
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {empresas.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-gray-500 uppercase">Curso</span>
          <Select
            value={filters.curso || "todas"}
            onValueChange={(v: string) =>
              setFilters((f) => ({ ...f, curso: v === "todas" ? "" : v }))
            }
          >
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos</SelectItem>
              {cursos.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isAdminView && (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-gray-500 uppercase">Departamento</span>
            <Select
              value={filters.gerencia || "todas"}
              onValueChange={(v: string) =>
                setFilters((f) => ({ ...f, gerencia: v === "todas" ? "" : v }))
              }
            >
              <SelectTrigger className="h-9 w-44">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos</SelectItem>
                {departamentos.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-gray-500 uppercase">Estatus</span>
          <Select
            value={filters.estatus || "todos"}
            onValueChange={(v: string) =>
              setFilters((f) => ({
                ...f,
                estatus: v === "todos" ? "" : (v as EstatusAdmin),
              }))
            }
          >
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="procesada">Procesada</SelectItem>
              <SelectItem value="rechazada">Rechazada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-gray-500 uppercase">Desde</span>
          <Input
            type="date"
            value={filters.fechaDesde}
            onChange={(e) => setFilters((f) => ({ ...f, fechaDesde: e.target.value }))}
            className="h-9 w-38"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-gray-500 uppercase">Hasta</span>
          <Input
            type="date"
            value={filters.fechaHasta}
            onChange={(e) => setFilters((f) => ({ ...f, fechaHasta: e.target.value }))}
            className="h-9 w-38"
          />
        </div>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 text-gray-500 flex gap-1"
            onClick={() => setFilters((f) => ({ ...EMPTY_FILTERS, tab: f.tab }))}
          >
            <X className="h-4 w-4" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Results counter — sits next to the admin summary badges so the total
          (with or without filters) is visible at a glance. */}
      <div className="flex gap-3 text-xs">
        <span
          className={`px-2 py-1 rounded-full border font-medium ${
            hasActiveFilters
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-gray-100 text-gray-700 border-gray-200"
          }`}
        >
          {hasActiveFilters
            ? `${filtered.length} de ${records.length} filtrado${filtered.length !== 1 ? "s" : ""}`
            : `${records.length} requisicion${records.length !== 1 ? "es" : ""}`}
        </span>
        {isAdminView && (
          <>
            <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              Aprobadas: {records.filter((r) => r.estatus_admin === "procesada").length}
            </span>
            <span className="px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 font-medium">
              Rechazadas: {records.filter((r) => r.estatus_admin === "rechazada").length}
            </span>
          </>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  OSI
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Solicitante
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Departamento
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estatus
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Coordinador
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progreso
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginated.length > 0 ? (
                paginated.map((record: any) => (
                  <RequisicionRow
                    key={record.id}
                    record={record}
                    isAdminView={isAdminView}
                    osiLookup={osiLookup}
                    isCoordinador={isCoordinador}
                    coordinadorDepts={coordinadorDepts}
                    isLider={isLider}
                    liderDepts={liderDepts}
                    liderFallbackDepts={liderFallbackDepts}
                  />
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-sm text-gray-500"
                  >
                    {filtered.length === 0 && records.length === 0 ? (
                      <div className="flex flex-col items-center gap-2">
                        <p>
                          {isAdminView
                            ? "No hay requisiciones registradas todavía."
                            : "No has creado ninguna requisición todavía."}
                        </p>
                        <Link href="/dashboard/capacitacion/requisiciones/create">
                          <Button variant="link" className="text-blue-600 p-0 h-auto">
                            Crear tu primera solicitud ahora
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <p>No hay resultados para los filtros aplicados.</p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
              {totalPages > 1 && ` · Página ${currentPage} de ${totalPages}`}
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(v: string) => setPageSize(Number(v))}
            >
              <SelectTrigger className="h-8 w-[90px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} por pág.
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-8"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
