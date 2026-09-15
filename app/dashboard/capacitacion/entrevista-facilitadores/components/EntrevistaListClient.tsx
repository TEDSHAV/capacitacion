"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Search,
  Filter,
  Calendar,
  ChevronRight,
  Printer,
  Trash2,
  Edit,
  Eye,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  LayoutGrid,
  List,
  Car,
  Laptop,
  Plane,
  FileCheck2,
  ExternalLink,
  Phone,
  Mail,
  GraduationCap,
} from "lucide-react";
import type {
  FacilitadorEntrevista,
  EntrevistaMetrics,
  EntrevistaMonthOption,
  EntrevistaEstatus,
} from "@/types/entrevistas-facilitadores";
import { ESTATUS_CONFIG } from "@/types/entrevistas-facilitadores";
import {
  getEntrevistasList,
  deleteEntrevista,
  promoverAFacilitador,
} from "@/app/actions/entrevistas-facilitadores";
import { EntrevistaDrawer } from "./EntrevistaDrawer";
import { EntrevistaPrintModal } from "./EntrevistaPrintModal";
import { CachedDataBanner } from "@/components/CachedDataBanner";
import {
  cachePortalData,
  getCachedPortalData,
} from "@/lib/offline/portal-data-cache";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { useToast } from "@/lib/ui/toast-context";
import { toTitleCase } from "@/utils/string-utils";

type FilterTab = "todas" | EntrevistaEstatus;

export function EntrevistaListClient() {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [entrevistas, setEntrevistas] = useState<FacilitadorEntrevista[]>([]);
  const [metrics, setMetrics] = useState<EntrevistaMetrics>({
    total: 0,
    pendientes: 0,
    aprobados: 0,
    rechazados: 0,
    promovidos: 0,
  });
  const [months, setMonths] = useState<EntrevistaMonthOption[]>([]);

  // Filter States
  const [activeTab, setActiveTab] = useState<FilterTab>("todas");
  const [selectedMonth, setSelectedMonth] = useState<string>("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"recientes" | "antiguos" | "nombre">("recientes");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Drawer & Print States
  const [selectedEntrevista, setSelectedEntrevista] = useState<FacilitadorEntrevista | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [printEntrevista, setPrintEntrevista] = useState<FacilitadorEntrevista | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // Deletion States
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Offline cache indicators
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEntrevistasList({
        mes: selectedMonth,
        estatus: activeTab,
        busqueda: searchTerm,
        sortBy,
      });

      if (res.error) {
        addToast(res.error, "error");
      } else {
        setEntrevistas(res.entrevistas);
        setMetrics(res.metrics);
        setMonths(res.months);

        // Cache for offline
        if (isOnline) {
          cachePortalData(
            "dash_entrevista_facilitadores",
            "dash_entrevista_facilitadores",
            {
              entrevistas: res.entrevistas,
              metrics: res.metrics,
              months: res.months,
            }
          ).catch(() => {});
        }
      }
    } catch {
      addToast("Error al cargar entrevistas", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, activeTab, searchTerm, sortBy, isOnline, addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Offline fallback
  useEffect(() => {
    if (!isOnline && loading && entrevistas.length === 0) {
      getCachedPortalData<{
        entrevistas: FacilitadorEntrevista[];
        metrics: EntrevistaMetrics;
        months: EntrevistaMonthOption[];
      }>("dash_entrevista_facilitadores")
        .then((cached) => {
          if (cached) {
            setEntrevistas(cached.data.entrevistas || []);
            setMetrics(cached.data.metrics || metrics);
            setMonths(cached.data.months || []);
            setFromCache(true);
            setCachedAt(cached.cachedAt);
            setLoading(false);
          }
        })
        .catch(() => {});
    }
  }, [isOnline, loading, entrevistas.length, metrics]);

  // Quick Promotion
  const handlePromote = async (e: React.MouseEvent, item: FacilitadorEntrevista) => {
    e.stopPropagation();
    if (
      !confirm(
        `¿Deseas promover a ${toTitleCase(
          item.nombre_apellido
        )} como facilitador activo?`
      )
    ) {
      return;
    }

    try {
      const res = await promoverAFacilitador(item.id);
      if (!res.success) {
        addToast(res.error || "Error al promover", "error");
        return;
      }

      addToast("Aspirante promovido exitosamente a Facilitador", "success");
      loadData();
    } catch {
      addToast("Error de conexión al promover", "error");
    }
  };

  // Delete
  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm("¿Estás seguro de eliminar este registro de entrevista?")) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await deleteEntrevista(id);
      if (!res.success) {
        addToast(res.error || "Error al eliminar", "error");
        return;
      }

      addToast("Entrevista eliminada", "success");
      setEntrevistas((prev) => prev.filter((it) => it.id !== id));
      if (selectedEntrevista?.id === id) {
        setIsDrawerOpen(false);
      }
    } catch {
      addToast("Error al eliminar entrevista", "error");
    } finally {
      setDeletingId(null);
    }
  };

  // Drawer updated callback
  const handleItemUpdated = (updated: FacilitadorEntrevista) => {
    setEntrevistas((prev) =>
      prev.map((it) => (it.id === updated.id ? updated : it))
    );
    setSelectedEntrevista(updated);
  };

  const handleOpenPrint = (item: FacilitadorEntrevista) => {
    setPrintEntrevista(item);
    setIsPrintOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-8 h-8 text-violet-600" />
            Entrevista de Facilitadores
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Registro, evaluación y seguimiento de prospectos y aspirantes a
            facilitadores
          </p>
        </div>

        <Link
          href="/dashboard/capacitacion/entrevista-facilitadores/nueva"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nueva Entrevista
        </Link>
      </div>

      {fromCache && (
        <CachedDataBanner cachedAt={cachedAt} isOnline={isOnline} />
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase">Total Entrevistas</span>
            <Users className="w-4 h-4 text-violet-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{metrics.total}</p>
          <span className="text-xs text-gray-400 mt-1">Aspirantes evaluados</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-semibold uppercase">Pendientes</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">
            {metrics.pendientes}
          </p>
          <span className="text-xs text-gray-400 mt-1">En evaluación</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-semibold uppercase">Aprobados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            {metrics.aprobados}
          </p>
          <span className="text-xs text-gray-400 mt-1">Perfil apto</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-xs font-semibold uppercase">Rechazados</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2">
            {metrics.rechazados}
          </p>
          <span className="text-xs text-gray-400 mt-1">No seleccionados</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-xs font-semibold uppercase">Promovidos</span>
            <UserCheck className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            {metrics.promovidos}
          </p>
          <span className="text-xs text-gray-400 mt-1">Facilitadores activos</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        {/* Status Filter Tabs (matching RRHH pattern) */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 overflow-x-auto">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            {[
              { key: "todas", label: "Todas", count: metrics.total },
              { key: "pendiente", label: "Pendientes", count: metrics.pendientes },
              { key: "aprobado", label: "Aprobados", count: metrics.aprobados },
              { key: "rechazado", label: "Rechazados", count: metrics.rechazados },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as FilterTab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-violet-100 text-violet-800"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.label}
                <span className="ml-1.5 text-xs opacity-70">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* Table / Cards toggle */}
          <div className="flex items-center border border-gray-200 rounded-lg p-0.5 bg-gray-50">
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "table"
                  ? "bg-white text-violet-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              title="Vista de tabla"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "cards"
                  ? "bg-white text-violet-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              title="Vista de tarjetas"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search, Month & Sorting Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search bar */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por aspirante, cédula, entrevistador u observaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Month selector */}
          <div className="sm:col-span-3">
            <div className="relative">
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="todos">Todos los meses</option>
                {months.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label} ({m.count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sort selector */}
          <div className="sm:col-span-3">
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "recientes" | "antiguos" | "nombre")
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="recientes">Más recientes primero</option>
              <option value="antiguos">Más antiguos primero</option>
              <option value="nombre">Nombre (A - Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-violet-600 animate-spin mb-3" />
          <p className="text-sm text-gray-500">Cargando entrevistas...</p>
        </div>
      ) : entrevistas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-800">
            No se encontraron entrevistas
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {searchTerm || selectedMonth !== "todos" || activeTab !== "todas"
              ? "No hay resultados para los filtros seleccionados. Intenta cambiar los criterios de búsqueda."
              : "Aún no se han registrado entrevistas de facilitadores. Haz clic en 'Nueva Entrevista' para crear la primera."}
          </p>
          <Link
            href="/dashboard/capacitacion/entrevista-facilitadores/nueva"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva Entrevista
          </Link>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50 font-semibold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Aspirante</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Educación</th>
                  <th className="px-4 py-3 text-center">Docs</th>
                  <th className="px-4 py-3">Estatus</th>
                  <th className="px-4 py-3">Promovido</th>
                  <th className="px-4 py-3">Observaciones</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {entrevistas.map((item) => {
                  const estatusConf =
                    ESTATUS_CONFIG[item.estatus] || ESTATUS_CONFIG.pendiente;
                  const docsChecked = [
                    item.doc_resumen_curricular,
                    item.doc_cedula_identidad,
                    item.doc_soportes_resumen_curricular,
                    item.doc_rif_actualizado,
                    item.doc_registro_inpsasel,
                    item.doc_factura_fiscal,
                    item.doc_titulo_universitario,
                    item.doc_declaracion_islr,
                    item.doc_formacion_docente,
                    item.doc_posee_laptop,
                  ].filter(Boolean).length;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setSelectedEntrevista(item);
                        setIsDrawerOpen(true);
                      }}
                      className="hover:bg-violet-50/40 cursor-pointer transition-colors"
                    >
                      {/* Fecha */}
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        <span className="font-medium text-gray-900">
                          {item.fecha_entrevista}
                        </span>
                        {item.entrevistado_por && (
                          <span className="block text-[11px] text-gray-400 truncate max-w-[120px]">
                            Por: {item.entrevistado_por}
                          </span>
                        )}
                      </td>

                      {/* Aspirante */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {(item.nombre_apellido || "A")[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900 capitalize block">
                              {item.nombre_apellido}
                            </span>
                            <span className="text-[11px] text-gray-500">
                              C.I. {item.cedula || "—"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contacto */}
                      <td className="px-4 py-3 text-gray-600">
                        <div className="flex flex-col gap-0.5">
                          <span className="truncate max-w-[130px]">
                            {item.telefono || "—"}
                          </span>
                          <span className="text-[11px] text-gray-400 truncate max-w-[130px]">
                            {item.email || "—"}
                          </span>
                        </div>
                      </td>

                      {/* Educación */}
                      <td className="px-4 py-3 text-gray-700">
                        <span className="font-medium truncate block max-w-[150px]">
                          {item.universitario || item.nivel_tecnico || "—"}
                        </span>
                        {item.posee_especializacion && (
                          <span className="text-[11px] text-violet-700 truncate block max-w-[150px]">
                            {item.posee_especializacion}
                          </span>
                        )}
                      </td>

                      {/* Docs */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full font-semibold text-[11px] ${
                            docsChecked >= 8
                              ? "bg-emerald-100 text-emerald-800"
                              : docsChecked >= 5
                              ? "bg-amber-100 text-amber-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {docsChecked}/10
                        </span>
                      </td>

                      {/* Estatus */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider text-[11px] border ${estatusConf.badgeCls}`}
                        >
                          {estatusConf.label}
                        </span>
                      </td>

                      {/* Promovido */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.facilitador_id ? (
                          <Link
                            href={`/dashboard/capacitacion/gestion-de-facilitadores?edit=${item.facilitador_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200"
                          >
                            <UserCheck className="w-3 h-3" />
                            Facilitador #{item.facilitador_id}
                          </Link>
                        ) : item.estatus === "aprobado" ? (
                          <button
                            type="button"
                            onClick={(e) => handlePromote(e, item)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 hover:bg-emerald-100 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            Promover
                          </button>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Observaciones */}
                      <td className="px-4 py-3 text-gray-500 max-w-[180px]">
                        <p className="truncate" title={item.observaciones || ""}>
                          {item.observaciones || "—"}
                        </p>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEntrevista(item);
                              setIsDrawerOpen(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <Link
                            href={`/dashboard/capacitacion/entrevista-facilitadores/${item.id}`}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar formulario"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleOpenPrint(item)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Imprimir formato"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === item.id}
                            onClick={(e) => handleDelete(e, item.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Eliminar"
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARDS GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entrevistas.map((item) => {
            const estatusConf =
              ESTATUS_CONFIG[item.estatus] || ESTATUS_CONFIG.pendiente;
            const docsChecked = [
              item.doc_resumen_curricular,
              item.doc_cedula_identidad,
              item.doc_soportes_resumen_curricular,
              item.doc_rif_actualizado,
              item.doc_registro_inpsasel,
              item.doc_factura_fiscal,
              item.doc_titulo_universitario,
              item.doc_declaracion_islr,
              item.doc_formacion_docente,
              item.doc_posee_laptop,
            ].filter(Boolean).length;

            return (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedEntrevista(item);
                  setIsDrawerOpen(true);
                }}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-violet-300 cursor-pointer transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {(item.nombre_apellido || "A")[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 capitalize text-sm leading-tight">
                          {item.nombre_apellido}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          C.I. {item.cedula || "No registrada"}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border ${estatusConf.badgeCls}`}
                    >
                      {estatusConf.label}
                    </span>
                  </div>

                  {/* Mobility tags */}
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100 text-[11px] text-gray-600">
                    <span
                      className={`inline-flex items-center gap-1 ${
                        item.posee_vehiculo ? "text-emerald-700 font-medium" : "text-gray-400"
                      }`}
                    >
                      <Car className="w-3.5 h-3.5" /> Vehículo
                    </span>
                    <span>•</span>
                    <span
                      className={`inline-flex items-center gap-1 ${
                        item.posee_laptop ? "text-emerald-700 font-medium" : "text-gray-400"
                      }`}
                    >
                      <Laptop className="w-3.5 h-3.5" /> Laptop
                    </span>
                    <span>•</span>
                    <span
                      className={`inline-flex items-center gap-1 ${
                        item.disponibilidad_viajar ? "text-emerald-700 font-medium" : "text-gray-400"
                      }`}
                    >
                      <Plane className="w-3.5 h-3.5" /> Viajar
                    </span>
                  </div>

                  {/* Contact & Education details */}
                  <div className="mt-3 space-y-1 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">
                        {item.universitario || item.nivel_tecnico || "Educación no registrada"}
                      </span>
                    </div>
                    {item.telefono && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{item.telefono}</span>
                      </div>
                    )}
                  </div>

                  {/* Document progress */}
                  <div className="mt-3 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <div className="flex justify-between text-[11px] text-gray-600 mb-1">
                      <span className="font-medium">Documentos Consignados:</span>
                      <span className="font-bold text-violet-700">{docsChecked}/10</span>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-violet-600 h-full rounded-full transition-all"
                        style={{ width: `${(docsChecked / 10) * 100}%` }}
                      />
                    </div>
                  </div>

                  {item.observaciones && (
                    <p className="mt-3 text-xs text-gray-500 line-clamp-2 italic">
                      &ldquo;{item.observaciones}&rdquo;
                    </p>
                  )}
                </div>

                {/* Card Footer */}
                <div
                  className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-gray-400 text-[11px]">
                    {item.fecha_entrevista}
                  </span>

                  <div className="flex items-center gap-1">
                    {item.facilitador_id ? (
                      <Link
                        href={`/dashboard/capacitacion/gestion-de-facilitadores?edit=${item.facilitador_id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-200"
                      >
                        <UserCheck className="w-3 h-3" />
                        Facilitador #{item.facilitador_id}
                      </Link>
                    ) : item.estatus === "aprobado" ? (
                      <button
                        type="button"
                        onClick={(e) => handlePromote(e, item)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 hover:bg-emerald-100"
                      >
                        <UserCheck className="w-3 h-3" />
                        Promover
                      </button>
                    ) : null}

                    <Link
                      href={`/dashboard/capacitacion/entrevista-facilitadores/${item.id}`}
                      className="p-1.5 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-md transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleOpenPrint(item)}
                      className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                      title="Imprimir"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-out Drawer */}
      <EntrevistaDrawer
        entrevista={selectedEntrevista}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdated={handleItemUpdated}
        onPrint={handleOpenPrint}
      />

      {/* Print Modal */}
      <EntrevistaPrintModal
        entrevista={printEntrevista}
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
      />
    </div>
  );
}
