"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Search,
  Filter,
  Calendar,
  Trash2,
  Edit,
  Eye,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  LayoutGrid,
  List,
  Car,
  Laptop,
  Plane,
  Phone,
  GraduationCap,
  Share2,
  Globe,
  X,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
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
  updateEntrevistaEstatus,
} from "@/app/actions/entrevistas-facilitadores";
import { EntrevistaLinkModal } from "./EntrevistaLinkModal";
import { CachedDataBanner } from "@/components/CachedDataBanner";
import {
  cachePortalData,
  getCachedPortalData,
} from "@/lib/offline/portal-data-cache";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { useToast } from "@/lib/ui/toast-context";
import {
  toTitleCase,
  normalizePhoneNumber,
  normalizeCedula,
  formatAcademicTitle,
  formatSentenceCase,
} from "@/utils/string-utils";

type FilterTab = "todas" | "pendiente" | "aprobado" | "rechazado";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<"recientes" | "antiguos" | "nombre">(
    "recientes"
  );
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [groupByStage, setGroupByStage] = useState<boolean>(true);

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedMonth, debouncedSearch, sortBy, pageSize]);

  // Link Modal State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

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
        busqueda: debouncedSearch,
        sortBy,
      });

      if (res.error) {
        addToast(res.error, "error");
      } else {
        setEntrevistas(res.entrevistas);
        setMetrics(res.metrics);
        setMonths(res.months);

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
  }, [selectedMonth, activeTab, debouncedSearch, sortBy, isOnline, addToast]);

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
    } catch {
      addToast("Error al eliminar entrevista", "error");
    } finally {
      setDeletingId(null);
    }
  };

  // Quick Status Update (Approve / Disregard)
  const handleQuickStatusUpdate = async (
    e: React.MouseEvent,
    id: number,
    newEstatus: EntrevistaEstatus
  ) => {
    e.stopPropagation();
    try {
      const res = await updateEntrevistaEstatus(id, newEstatus);
      if (res.error) {
        addToast(res.error, "error");
        return;
      }

      addToast(
        newEstatus === "aprobado"
          ? "Aspirante marcado como Aprobado"
          : newEstatus === "rechazado"
          ? "Aspirante marcado como Descartado / Rechazado"
          : "Estatus actualizado a Pendiente",
        "success"
      );

      setEntrevistas((prev) =>
        prev.map((it) => (it.id === id ? { ...it, estatus: newEstatus } : it))
      );
      loadData();
    } catch {
      addToast("Error al actualizar estatus", "error");
    }
  };

  // Pagination slicing
  const totalItems = entrevistas.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedItems = useMemo(
    () => entrevistas.slice(startIndex, endIndex),
    [entrevistas, startIndex, endIndex]
  );

  // Split paginated items into clear groups when viewing "todas" with groupByStage enabled:
  // 1. Prospectos Pendientes de Evaluación
  // 2. Facilitadores Aprobados
  // 3. Prospectos Descartados / Rechazados
  const groupedSections = useMemo(() => {
    if (activeTab !== "todas" || !groupByStage) {
      return [
        {
          id: "all",
          title:
            activeTab === "pendiente"
              ? "Prospectos Pendientes de Evaluación"
              : activeTab === "aprobado"
              ? "Facilitadores Aprobados"
              : activeTab === "rechazado"
              ? "Prospectos Descartados / Rechazados"
              : "Listado de Entrevistas",
          badgeCls: "bg-violet-50 text-violet-700 border-violet-200",
          items: paginatedItems,
        },
      ];
    }

    const pendientes = paginatedItems.filter((i) => i.estatus === "pendiente");
    const aprobados = paginatedItems.filter(
      (i) => i.estatus === "aprobado" || i.facilitador_id !== null
    );
    const rechazados = paginatedItems.filter(
      (i) => i.estatus === "rechazado" && i.facilitador_id === null
    );

    const sections: {
      id: string;
      title: string;
      subtitle: string;
      badgeCls: string;
      headerBg: string;
      items: FacilitadorEntrevista[];
    }[] = [];

    if (pendientes.length > 0) {
      sections.push({
        id: "pendientes",
        title: "Prospectos Pendientes de Evaluación",
        subtitle: "Aspirantes en proceso de entrevista o revisión documental",
        badgeCls: "bg-amber-100 text-amber-800 border-amber-300",
        headerBg: "bg-amber-50/70 border-amber-200",
        items: pendientes,
      });
    }

    if (aprobados.length > 0) {
      sections.push({
        id: "aprobados",
        title: "Facilitadores Aprobados",
        subtitle:
          "Candidatos que aprobaron la entrevista para formar parte de la plantilla de facilitadores",
        badgeCls: "bg-emerald-100 text-emerald-800 border-emerald-300",
        headerBg: "bg-emerald-50/70 border-emerald-200",
        items: aprobados,
      });
    }

    if (rechazados.length > 0) {
      sections.push({
        id: "rechazados",
        title: "Prospectos No Seleccionados / Descartados",
        subtitle: "Perfiles descartados durante el proceso de selección",
        badgeCls: "bg-rose-100 text-rose-800 border-rose-300",
        headerBg: "bg-rose-50/60 border-rose-200",
        items: rechazados,
      });
    }

    return sections;
  }, [activeTab, groupByStage, paginatedItems]);

  const renderTableRows = (items: FacilitadorEntrevista[]) =>
    items.map((item) => {
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

      const phoneFormatted = normalizePhoneNumber(item.telefono);
      const cedulaFormatted = normalizeCedula(item.cedula);
      const academicFormatted = formatAcademicTitle(
        item.universitario || item.nivel_tecnico
      );
      const specFormatted = formatAcademicTitle(item.posee_especializacion);
      const obsFormatted = formatSentenceCase(item.observaciones);

      return (
        <tr
          key={item.id}
          onClick={() =>
            router.push(
              `/dashboard/capacitacion/entrevista-facilitadores/${item.id}`
            )
          }
          className="hover:bg-violet-50/40 cursor-pointer transition-colors"
          title="Haz clic para abrir el formulario completo"
        >
          {/* Fecha (sin mostrar ID) */}
          <td className="px-4 py-3 text-gray-600 align-middle whitespace-nowrap">
            <span className="font-medium text-gray-900">
              {item.fecha_entrevista}
            </span>
            {item.entrevistado_por && (
              <span className="block text-[11px] text-gray-400 truncate max-w-[130px] mt-0.5">
                Por: {toTitleCase(item.entrevistado_por)}
              </span>
            )}
          </td>

          {/* Aspirante y Contacto (Cédula V-/E- + Teléfono en una sola línea uniforme) */}
          <td className="px-4 py-3 align-middle">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs shrink-0">
                {(item.nombre_apellido || "A")[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-gray-900 leading-snug truncate">
                    {toTitleCase(item.nombre_apellido)}
                  </span>
                  {item.origen === "web" && (
                    <span
                      title="Postulación recibida en línea"
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200"
                    >
                      <Globe className="w-2.5 h-2.5" />
                      Web
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500 flex items-center gap-3 mt-0.5 whitespace-nowrap">
                  <span className="font-mono">
                    {cedulaFormatted || "Sin cédula"}
                  </span>
                  {phoneFormatted && (
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                      {phoneFormatted}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </td>

          {/* Perfil / Observaciones (con capitalización estandarizada) */}
          <td className="px-4 py-3 text-gray-700 align-middle">
            <span className="font-medium block truncate max-w-[230px]">
              {academicFormatted || "—"}
            </span>
            {specFormatted && (
              <span className="text-[11px] text-violet-700 block truncate max-w-[230px]">
                {specFormatted}
              </span>
            )}
            {obsFormatted && (
              <span
                className="text-[11px] text-gray-400 italic block truncate max-w-[230px] mt-0.5"
                title={obsFormatted}
              >
                &ldquo;{obsFormatted}&rdquo;
              </span>
            )}
          </td>

          {/* Docs */}
          <td className="px-3 py-3 text-center align-middle">
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

          {/* Estatus Limpio (Badge de Estatus + Botones rápidos en una sola fila) */}
          <td className="px-4 py-3 align-middle whitespace-nowrap">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider text-[10px] border ${estatusConf.badgeCls}`}
              >
                {estatusConf.label}
              </span>

              <div
                className="flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {item.estatus !== "aprobado" && (
                  <button
                    type="button"
                    onClick={(e) =>
                      handleQuickStatusUpdate(e, item.id, "aprobado")
                    }
                    className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded border border-emerald-200 transition-colors"
                    title="Aprobar aspirante"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {item.estatus !== "rechazado" && (
                  <button
                    type="button"
                    onClick={(e) =>
                      handleQuickStatusUpdate(e, item.id, "rechazado")
                    }
                    className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded border border-rose-200 transition-colors"
                    title="Descartar / Rechazar aspirante"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                )}
                {item.estatus !== "pendiente" && (
                  <button
                    type="button"
                    onClick={(e) =>
                      handleQuickStatusUpdate(e, item.id, "pendiente")
                    }
                    className="p-1 text-gray-400 hover:text-amber-700 hover:bg-amber-50 rounded border border-gray-200 transition-colors"
                    title="Revertir a Pendiente"
                  >
                    <Clock className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </td>

          {/* Acciones */}
          <td className="px-4 py-3 text-right align-middle whitespace-nowrap">
            <div
              className="inline-flex items-center justify-end gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Link
                href={`/dashboard/capacitacion/entrevista-facilitadores/${item.id}`}
                className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                title="Abrir formulario completo"
              >
                <Edit className="w-4 h-4" />
              </Link>
              <a
                href={`/api/entrevistas/${item.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Ver PDF oficial de entrevista en nueva pestaña"
              >
                <Eye className="w-4 h-4" />
              </a>
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
    });

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-violet-600 shrink-0" />
            Entrevista de Facilitadores
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Registro, evaluación y seguimiento de prospectos y aspirantes a
            facilitadores
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <Link
            href="/dashboard/capacitacion/indicadores?tab=contratacion"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
          >
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Indicador de Crecimiento
          </Link>

          <button
            type="button"
            onClick={() => setIsLinkModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
          >
            <Share2 className="w-4 h-4 text-violet-600" />
            Enlace de Postulación
          </button>

          <Link
            href="/dashboard/capacitacion/entrevista-facilitadores/nueva"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva Entrevista
          </Link>
        </div>
      </div>

      {fromCache && (
        <CachedDataBanner cachedAt={cachedAt} isOnline={isOnline} />
      )}

      {/* KPI Stats Cards (Clickable to filter directly) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("todas")}
          className={`text-left bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between transition-all ${
            activeTab === "todas"
              ? "border-violet-400 ring-2 ring-violet-100"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center justify-between text-gray-500 w-full">
            <span className="text-xs font-semibold uppercase">
              Total Entrevistas
            </span>
            <Users className="w-4 h-4 text-violet-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {metrics.total}
          </p>
          <span className="text-xs text-gray-400 mt-1">
            Aspirantes evaluados
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pendiente")}
          className={`text-left bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between transition-all ${
            activeTab === "pendiente"
              ? "border-amber-400 ring-2 ring-amber-100"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 w-full">
            <span className="text-xs font-semibold uppercase">Pendientes</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">
            {metrics.pendientes}
          </p>
          <span className="text-xs text-gray-400 mt-1">
            Prospectos en evaluación
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("aprobado")}
          className={`text-left bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between transition-all ${
            activeTab === "aprobado"
              ? "border-emerald-400 ring-2 ring-emerald-100"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 w-full">
            <span className="text-xs font-semibold uppercase">Aprobados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            {metrics.aprobados}
          </p>
          <span className="text-xs text-gray-400 mt-1">
            Facilitadores aprobados
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("rechazado")}
          className={`text-left bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between transition-all ${
            activeTab === "rechazado"
              ? "border-rose-400 ring-2 ring-rose-100"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 w-full">
            <span className="text-xs font-semibold uppercase">Rechazados</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2">
            {metrics.rechazados}
          </p>
          <span className="text-xs text-gray-400 mt-1">No seleccionados</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400 shrink-0 mr-1" />
            {[
              { key: "todas", label: "Todas", count: metrics.total },
              {
                key: "pendiente",
                label: "Prospectos Pendientes",
                count: metrics.pendientes,
              },
              {
                key: "aprobado",
                label: "Aprobados",
                count: metrics.aprobados,
              },
              {
                key: "rechazado",
                label: "Rechazados",
                count: metrics.rechazados,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as FilterTab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
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

          <div className="flex items-center gap-2">
            {activeTab === "todas" && (
              <button
                type="button"
                onClick={() => setGroupByStage((v) => !v)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  groupByStage
                    ? "bg-violet-50 border-violet-200 text-violet-700"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
                title="Agrupar visualmente prospectos pendientes y facilitadores aprobados"
              >
                Separar por etapa
              </button>
            )}

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
        </div>

        {/* Search, Month & Sorting Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search bar */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por aspirante, cédula, teléfono o temas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
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
              ? "No hay resultados para los criterios seleccionados."
              : "Aún no se han registrado entrevistas de facilitadores. Haz clic en 'Nueva Entrevista' para crear la primera."}
          </p>
          {(searchTerm ||
            selectedMonth !== "todos" ||
            activeTab !== "todas") && (
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  Limpiar búsqueda (&quot;{searchTerm}&quot;)
                </button>
              )}
              {(selectedMonth !== "todos" || activeTab !== "todas") && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonth("todos");
                    setActiveTab("todas");
                  }}
                  className="px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded-lg text-xs font-semibold transition-colors"
                >
                  Ver en todos los meses y estatus
                </button>
              )}
            </div>
          )}
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW (6 clean columns, zero horizontal scroll) */
        <div className="space-y-5">
          {groupedSections.map((sec) => (
            <div
              key={sec.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              {activeTab === "todas" && groupByStage && (
                <div
                  className={`px-4 py-3 border-b flex items-center justify-between flex-wrap gap-2 ${
                    "headerBg" in sec
                      ? sec.headerBg
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                      {sec.title}
                    </h3>
                    {"subtitle" in sec && sec.subtitle && (
                      <p className="text-[11px] text-gray-600 mt-0.5">
                        {sec.subtitle}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${sec.badgeCls}`}
                  >
                    {sec.items.length}{" "}
                    {sec.items.length === 1 ? "registro" : "registros"}
                  </span>
                </div>
              )}

              <table className="w-full text-left divide-y divide-gray-200 text-xs table-fixed">
                <thead className="bg-gray-50 font-semibold text-gray-600 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 w-[14%]">Fecha</th>
                    <th className="px-4 py-3 w-[28%]">Aspirante y Contacto</th>
                    <th className="px-4 py-3 w-[24%]">Perfil / Observaciones</th>
                    <th className="px-3 py-3 w-[8%] text-center">Docs</th>
                    <th className="px-4 py-3 w-[17%]">Estatus</th>
                    <th className="px-4 py-3 w-[95px] text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {renderTableRows(sec.items)}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : (
        /* CARDS GRID VIEW */
        <div className="space-y-6">
          {groupedSections.map((sec) => (
            <div key={sec.id} className="space-y-3">
              {activeTab === "todas" && groupByStage && (
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      {sec.title}
                    </h3>
                    {"subtitle" in sec && sec.subtitle && (
                      <p className="text-xs text-gray-500">{sec.subtitle}</p>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${sec.badgeCls}`}
                  >
                    {sec.items.length}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sec.items.map((item) => {
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

                  const phoneFormatted = normalizePhoneNumber(item.telefono);
                  const cedulaFormatted = normalizeCedula(item.cedula);
                  const academicFormatted = formatAcademicTitle(
                    item.universitario || item.nivel_tecnico
                  );
                  const obsFormatted = formatSentenceCase(item.observaciones);

                  return (
                    <div
                      key={item.id}
                      onClick={() =>
                        router.push(
                          `/dashboard/capacitacion/entrevista-facilitadores/${item.id}`
                        )
                      }
                      className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-violet-300 cursor-pointer transition-all flex flex-col justify-between space-y-4"
                      title="Haz clic para abrir el formulario completo"
                    >
                      <div>
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-sm shrink-0">
                              {(item.nombre_apellido || "A")[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">
                                  {toTitleCase(item.nombre_apellido)}
                                </h3>
                                {item.origen === "web" && (
                                  <span
                                    title="Postulación recibida en línea"
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200"
                                  >
                                    <Globe className="w-2.5 h-2.5" />
                                    Web
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs font-mono text-gray-500 truncate">
                                  {cedulaFormatted || "Sin cédula"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border ${estatusConf.badgeCls}`}
                            >
                              {estatusConf.label}
                            </span>

                            <div
                              className="flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {item.estatus !== "aprobado" && (
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleQuickStatusUpdate(
                                      e,
                                      item.id,
                                      "aprobado"
                                    )
                                  }
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                  title="Aprobar aspirante"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Aprobar
                                </button>
                              )}
                              {item.estatus !== "rechazado" && (
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleQuickStatusUpdate(
                                      e,
                                      item.id,
                                      "rechazado"
                                    )
                                  }
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
                                  title="Descartar aspirante"
                                >
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  Descartar
                                </button>
                              )}
                              {item.estatus !== "pendiente" && (
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleQuickStatusUpdate(
                                      e,
                                      item.id,
                                      "pendiente"
                                    )
                                  }
                                  className="p-1 text-gray-400 hover:text-amber-700 hover:bg-amber-50 rounded border border-gray-200 transition-colors"
                                  title="Revertir a Pendiente"
                                >
                                  <Clock className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Mobility tags */}
                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100 text-[11px] text-gray-600">
                          <span
                            className={`inline-flex items-center gap-1 ${
                              item.posee_vehiculo
                                ? "text-emerald-700 font-medium"
                                : "text-gray-400"
                            }`}
                          >
                            <Car className="w-3.5 h-3.5" /> Vehículo
                          </span>
                          <span>•</span>
                          <span
                            className={`inline-flex items-center gap-1 ${
                              item.posee_laptop
                                ? "text-emerald-700 font-medium"
                                : "text-gray-400"
                            }`}
                          >
                            <Laptop className="w-3.5 h-3.5" /> Laptop
                          </span>
                          <span>•</span>
                          <span
                            className={`inline-flex items-center gap-1 ${
                              item.disponibilidad_viajar
                                ? "text-emerald-700 font-medium"
                                : "text-gray-400"
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
                              {academicFormatted || "Educación no registrada"}
                            </span>
                          </div>
                          {phoneFormatted && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="font-mono">{phoneFormatted}</span>
                            </div>
                          )}
                        </div>

                        {/* Document progress */}
                        <div className="mt-3 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                          <div className="flex justify-between text-[11px] text-gray-600 mb-1">
                            <span className="font-medium">
                              Documentos Consignados:
                            </span>
                            <span className="font-bold text-violet-700">
                              {docsChecked}/10
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-violet-600 h-full rounded-full transition-all"
                              style={{ width: `${(docsChecked / 10) * 100}%` }}
                            />
                          </div>
                        </div>

                        {obsFormatted && (
                          <p className="mt-3 text-xs text-gray-500 line-clamp-2 italic">
                            &ldquo;{obsFormatted}&rdquo;
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
                          <Link
                            href={`/dashboard/capacitacion/entrevista-facilitadores/${item.id}`}
                            className="p-1.5 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-md transition-colors"
                            title="Abrir formulario completo"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>

                          <a
                            href={`/api/entrevistas/${item.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Ver PDF oficial en nueva pestaña"
                          >
                            <Eye className="w-4 h-4" />
                          </a>

                          <button
                            type="button"
                            disabled={deletingId === item.id}
                            onClick={(e) => handleDelete(e, item.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors disabled:opacity-50"
                            title="Eliminar"
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && totalItems > 0 && (
        <div className="bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-600">
          <div className="flex items-center gap-3">
            <span>
              Mostrando{" "}
              <strong className="text-gray-900">{startIndex + 1}</strong> a{" "}
              <strong className="text-gray-900">{endIndex}</strong> de{" "}
              <strong className="text-gray-900">{totalItems}</strong>{" "}
              entrevistas
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">|</span>
              <label className="text-gray-500">Filas:</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border border-gray-200 rounded-md px-2 py-1 text-xs bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Anterior
            </button>
            <span className="px-3 py-1.5 font-semibold text-gray-800 bg-gray-50 rounded-lg border border-gray-200">
              Página {safePage} de {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              Siguiente
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Link Generator Modal */}
      <EntrevistaLinkModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
      />
    </div>
  );
}
