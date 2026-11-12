"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  BookOpen,
  Users,
  MapPin,
  CreditCard,
  Award,
  Clock,
  DollarSign,
  TrendingUp,
  Search,
  ExternalLink,
  Printer,
  AlertCircle,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ChevronRight,
  Filter,
  ClipboardList,
  Star,
  Check,
  Calendar,
  Sparkles,
  Info,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  X,
  Eye,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { getReportesV2Data, type ReportesV2Data, type PotentialMultiOsiGroup } from "@/app/actions/reportes-v2";
import { agruparOsisComoServicio } from "@/app/actions/indicadores-ajustes";

export type DimensionTab =
  | "overview"
  | "cursos"
  | "facilitadores"
  | "empresas"
  | "carnets"
  | "surveys"
  | "tendencias"
  | "ubicaciones";

interface Props {
  activeTab?: string;
  onTabChange?: (tab: any) => void;
  dateFrom?: string;
  dateTo?: string;
  selectedState?: string;
  shellUrl?: string;
}

// Module-level in-memory cache for instant navigation without stuck loading screens
const v2DataCache = new Map<string, { data: ReportesV2Data; timestamp: number }>();

export default function ReportesV2View({
  activeTab = "overview",
  onTabChange,
  dateFrom,
  dateTo,
  selectedState,
  shellUrl = "",
}: Props) {
  const cacheKey = `${dateFrom || "all"}_${dateTo || "all"}_${selectedState || "all"}`;
  const initialCached = v2DataCache.get(cacheKey);

  const [data, setData] = useState<ReportesV2Data | null>(initialCached?.data ?? null);
  const [loading, setLoading] = useState(!initialCached);
  const [error, setError] = useState<string | null>(null);
  const [internalTab, setInternalTab] = useState<DimensionTab>(
    (activeTab as DimensionTab) || "overview",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 250);

  // Sorting state for Cursos tab
  const [courseSortKey, setCourseSortKey] = useState<"totalOsis" | "totalHours" | "totalCertificates" | "nombre" | "cargaHorariaStd">("totalOsis");
  const [courseSortDir, setCourseSortDir] = useState<"asc" | "desc">("desc");

  // Sorting state for Facilitadores tab
  const [facSortKey, setFacSortKey] = useState<"totalHonorarios" | "totalHours" | "totalOsis" | "totalCertificates" | "nombreApellido" | "averageRating">("totalHonorarios");
  const [facSortDir, setFacSortDir] = useState<"asc" | "desc">("desc");

  // Sorting state for Empresas tab
  const [compSortKey, setCompSortKey] = useState<"totalCertificates" | "totalOsis" | "totalHours" | "razonSocial">("totalCertificates");
  const [compSortDir, setCompSortDir] = useState<"asc" | "desc">("desc");

  // Overview ranking mode for top courses
  const [topCourseRanking, setTopCourseRanking] = useState<"osis" | "hours" | "certs">("osis");

  // Multi-OSI review modal & course OSIs modal
  const [isMultiOsiModalOpen, setIsMultiOsiModalOpen] = useState(false);
  const [selectedCourseOsis, setSelectedCourseOsis] = useState<{
    courseName: string;
    totalHours?: number;
    totalSessions?: number;
    deliveries?: ReportesV2Data["courses"][0]["deliveries"];
    osis: Array<{
      idOsi: number;
      nroOsi: string;
      fecha: string | null;
      empresa: string;
      hours: number;
      certificatesCount: number;
      totalCost?: number;
    }>;
  } | null>(null);
  const [groupingKey, setGroupingKey] = useState<string | null>(null);

  const handleGroup = async (group: PotentialMultiOsiGroup) => {
    if (group.osis.length < 2) return;
    setGroupingKey(group.groupKey);
    try {
      // Automatically assign the OSI that carries the costs as the primary parent OSI
      const parentId = group.parentOsiId || group.osis.find((o) => o.isParentCandidate)?.idOsi || group.osis[0].idOsi;
      const childIds = group.osis.filter((o) => o.idOsi !== parentId).map((o) => o.idOsi);
      const res = await agruparOsisComoServicio({
        parentOsiId: parentId,
        childOsiIds: childIds,
        motivo: `Curso abierto conjunto (${group.cursoNombre}) - OSI titular con costos`,
      });
      if (res.success) {
        v2DataCache.delete(cacheKey);
        const fresh = await getReportesV2Data(dateFrom, dateTo, selectedState);
        if (fresh.data) {
          v2DataCache.set(cacheKey, { data: fresh.data, timestamp: Date.now() });
          setData(fresh.data);
        }
      } else {
        alert(res.error || "No se pudo agrupar el servicio");
      }
    } catch (err: any) {
      alert(err?.message || "Error al agrupar");
    } finally {
      setGroupingKey(null);
    }
  };

  // Sync internal tab if activeTab prop changes
  useEffect(() => {
    if (activeTab) {
      setInternalTab(activeTab as DimensionTab);
      setSearchTerm("");
    }
  }, [activeTab]);

  const handleTabSelect = (tab: DimensionTab) => {
    setInternalTab(tab);
    setSearchTerm("");
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  useEffect(() => {
    let isCancelled = false;
    const cached = v2DataCache.get(cacheKey);

    if (cached) {
      setData(cached.data);
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
      setError(null);
    }

    getReportesV2Data(dateFrom, dateTo, selectedState)
      .then((res) => {
        if (!isCancelled) {
          if (res.error) {
            if (!cached) setError(res.error);
          } else if (res.data) {
            v2DataCache.set(cacheKey, { data: res.data, timestamp: Date.now() });
            setData(res.data);
            setError(null);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          if (!cached) setError(err.message || "Error al cargar datos");
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [cacheKey, dateFrom, dateTo, selectedState]);

  // Search filtering for each dimension (debounced for smooth UI)
  const filteredCompanies = useMemo(() => {
    if (!data?.companies) return [];
    if (!debouncedSearchTerm.trim()) return data.companies;
    const term = debouncedSearchTerm.toLowerCase();
    return data.companies.filter(
      (c) =>
        c.razonSocial.toLowerCase().includes(term) ||
        c.rif.toLowerCase().includes(term) ||
        c.states.some((s) => s.toLowerCase().includes(term)),
    );
  }, [data?.companies, debouncedSearchTerm]);

  const filteredCourses = useMemo(() => {
    if (!data?.courses) return [];
    if (!debouncedSearchTerm.trim()) return data.courses;
    const term = debouncedSearchTerm.toLowerCase();
    return data.courses.filter((c) => c.nombre.toLowerCase().includes(term));
  }, [data?.courses, debouncedSearchTerm]);

  const filteredFacilitators = useMemo(() => {
    if (!data?.facilitators) return [];
    if (!debouncedSearchTerm.trim()) return data.facilitators;
    const term = debouncedSearchTerm.toLowerCase();
    return data.facilitators.filter(
      (f) =>
        f.nombreApellido.toLowerCase().includes(term) ||
        (f.cedula && f.cedula.toLowerCase().includes(term)) ||
        f.estadoNombre.toLowerCase().includes(term),
    );
  }, [data?.facilitators, debouncedSearchTerm]);

  const filteredLocations = useMemo(() => {
    if (!data?.locations) return [];
    if (!debouncedSearchTerm.trim()) return data.locations;
    const term = debouncedSearchTerm.toLowerCase();
    return data.locations.filter((l) => l.nombreEstado.toLowerCase().includes(term));
  }, [data?.locations, debouncedSearchTerm]);

  const filteredSurveys = useMemo(() => {
    if (!data?.surveysData?.osis) return [];
    if (!debouncedSearchTerm.trim()) return data.surveysData.osis;
    const term = debouncedSearchTerm.toLowerCase();
    return data.surveysData.osis.filter(
      (s) =>
        s.nroOsi.toLowerCase().includes(term) ||
        s.empresaNombre.toLowerCase().includes(term) ||
        s.cursoNombre.toLowerCase().includes(term),
    );
  }, [data?.surveysData?.osis, debouncedSearchTerm]);

  // Sortable datasets
  const sortedCourses = useMemo(() => {
    const list = [...filteredCourses];
    list.sort((a, b) => {
      let av: any = a[courseSortKey];
      let bv: any = b[courseSortKey];
      if (typeof av === "string") {
        return courseSortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return courseSortDir === "asc" ? (av - bv) : (bv - av);
    });
    return list;
  }, [filteredCourses, courseSortKey, courseSortDir]);

  const sortedFacilitators = useMemo(() => {
    const list = [...filteredFacilitators];
    list.sort((a, b) => {
      let av: any = a[facSortKey];
      let bv: any = b[facSortKey];
      if (typeof av === "string") {
        return facSortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return facSortDir === "asc" ? (av - bv) : (bv - av);
    });
    return list;
  }, [filteredFacilitators, facSortKey, facSortDir]);

  const sortedCompanies = useMemo(() => {
    const list = [...filteredCompanies];
    list.sort((a, b) => {
      let av: any = a[compSortKey];
      let bv: any = b[compSortKey];
      if (typeof av === "string") {
        return compSortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return compSortDir === "asc" ? (av - bv) : (bv - av);
    });
    return list;
  }, [filteredCompanies, compSortKey, compSortDir]);

  // Overview top courses ranked by selected criterion
  const overviewTopCourses = useMemo(() => {
    if (!data?.courses) return [];
    const list = [...data.courses];
    if (topCourseRanking === "osis") {
      list.sort((a, b) => b.totalOsis - a.totalOsis || b.totalHours - a.totalHours);
    } else if (topCourseRanking === "hours") {
      list.sort((a, b) => b.totalHours - a.totalHours || b.totalOsis - a.totalOsis);
    } else {
      list.sort((a, b) => b.totalCertificates - a.totalCertificates);
    }
    return list.slice(0, 5);
  }, [data?.courses, topCourseRanking]);

  // Structure selected course OSIs into delivery groups (parent + children)
  const courseDeliveries = useMemo(() => {
    if (!selectedCourseOsis) return [];
    if (selectedCourseOsis.deliveries && selectedCourseOsis.deliveries.length > 0) {
      return selectedCourseOsis.deliveries;
    }
    return (selectedCourseOsis.osis || []).map((o) => ({
      fecha: o.fecha || "Sin fecha",
      isOpenCourse: false,
      isCorporateMulti: false,
      distinctCompaniesCount: 1,
      parentOsi: {
        idOsi: o.idOsi,
        nroOsi: o.nroOsi,
        fecha: o.fecha,
        empresa: o.empresa,
        sede: null as string | null,
        hours: o.hours,
        certificatesCount: o.certificatesCount,
        totalCost: o.totalCost ?? 0,
      },
      childOsis: [] as Array<{
        idOsi: number;
        nroOsi: string;
        fecha: string | null;
        empresa: string;
        sede?: string | null;
        hours: number;
        certificatesCount: number;
        totalCost: number;
      }>,
    }));
  }, [selectedCourseOsis]);

  const toggleCourseSort = (key: typeof courseSortKey) => {
    if (courseSortKey === key) {
      setCourseSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setCourseSortKey(key);
      setCourseSortDir("desc");
    }
  };

  const toggleFacSort = (key: typeof facSortKey) => {
    if (facSortKey === key) {
      setFacSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setFacSortKey(key);
      setFacSortDir("desc");
    }
  };

  const toggleCompSort = (key: typeof compSortKey) => {
    if (compSortKey === key) {
      setCompSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setCompSortKey(key);
      setCompSortDir("desc");
    }
  };

  const renderSortIndicator = (currentKey: string, targetKey: string, dir: "asc" | "desc") => {
    if (currentKey !== targetKey) {
      return <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-40 inline-block ml-1" />;
    }
    return dir === "asc" ? (
      <ArrowUp className="w-3 h-3 text-sky-600 inline-block ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-sky-600 inline-block ml-1" />
    );
  };

  // PDF / Print Preview trigger
  const handlePrintPdf = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 bg-white rounded-2xl border border-gray-200 shadow-sm">
        <Loader2 className="w-8 h-8 text-sky-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-gray-800">Cargando métricas de reportes...</p>
        <p className="text-xs text-gray-400 mt-1 max-w-md text-center">
          Consultas en paralelo directo a Supabase, resolución relacional sin truncamientos.
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-red-900">Error al cargar reportes</h3>
          <p className="text-xs text-red-700 mt-1">{error || "No se pudieron obtener los datos."}</p>
        </div>
      </div>
    );
  }

  const { overview } = data;

  return (
    <div className="space-y-6">
      {/* ── Multi-OSI Quality Alert Banner ─────────────────────────────────── */}
      {data.potentialMultiOsiGroups && data.potentialMultiOsiGroups.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0 mt-0.5">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-amber-900">
                  Detección de Cursos Abiertos y Servicios Multi-OSI ({data.potentialMultiOsiGroups.length} casos)
                </h4>
                <span className="text-[10px] bg-amber-200 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                  Normalización Activa
                </span>
              </div>
              <p className="text-xs text-amber-800/90 mt-1 max-w-3xl leading-relaxed">
                Se identificaron servicios compartidos entre clientes o contrataciones agrupadas en la misma fecha y sede. Las horas ya están unificadas para reflejar la duración real de cada clase. Puedes auditar o vincular formalmente estas órdenes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            <button
              onClick={() => setIsMultiOsiModalOpen(true)}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              Revisar Grupos Multi-OSI ({data.potentialMultiOsiGroups.length})
            </button>
            <Link
              href="/dashboard/capacitacion/indicadores?tab=72h"
              className="px-3.5 py-2 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
            >
              Ir a Indicadores 72h →
            </Link>
          </div>
        </div>
      )}

      {/* ── 6 KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Certificados */}
        <div
          onClick={() => handleTabSelect("overview")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${internalTab === "overview"
              ? "bg-sky-50/70 border-sky-300 shadow-sm ring-1 ring-sky-400"
              : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
            }`}
        >
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Certificados</span>
            <Award className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-gray-900 tabular-nums">
              {overview.totalCertificates.toLocaleString()}
            </span>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
              {overview.activeCertificates.toLocaleString()} activos
            </p>
          </div>
        </div>

        {/* Card 2: Carnets PVC */}
        <div
          onClick={() => handleTabSelect("carnets")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${internalTab === "carnets"
              ? "bg-indigo-50/70 border-indigo-300 shadow-sm ring-1 ring-indigo-400"
              : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
            }`}
        >
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Carnets PVC</span>
            <CreditCard className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-gray-900 tabular-nums">
              {overview.totalCarnets.toLocaleString()}
            </span>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {overview.carnetsExpiringSoon > 0 ? (
                <span className="text-amber-600 font-medium">
                  {overview.carnetsExpiringSoon} por vencer
                </span>
              ) : (
                <span>{overview.activeCarnets} vigentes</span>
              )}
            </p>
          </div>
        </div>

        {/* Card 3: Horas Académicas */}
        <div
          onClick={() => handleTabSelect("cursos")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${internalTab === "cursos"
              ? "bg-amber-50/70 border-amber-300 shadow-sm ring-1 ring-amber-400"
              : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
            }`}
        >
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Horas Dictadas</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-gray-900 tabular-nums">
              {overview.totalHoursDelivered.toLocaleString()}h
            </span>
            <p className="text-[11px] text-gray-500 mt-0.5">
              en {overview.totalOsis} grupos impartidos
            </p>
          </div>
        </div>

        {/* Card 4: Honorarios Facilitadores ($ Pagado Real) */}
        <div
          onClick={() => handleTabSelect("facilitadores")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${internalTab === "facilitadores"
              ? "bg-emerald-50/70 border-emerald-300 shadow-sm ring-1 ring-emerald-400"
              : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
            }`}
        >
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Honorarios ($)</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-emerald-700 tabular-nums">
              ${overview.totalHonorariosFacilitadores.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {overview.totalFacilitatorHours.toLocaleString()}h autorizadas
            </p>
          </div>
        </div>

        {/* Card 5: Empresas */}
        <div
          onClick={() => handleTabSelect("empresas")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${internalTab === "empresas"
              ? "bg-purple-50/70 border-purple-300 shadow-sm ring-1 ring-purple-400"
              : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
            }`}
        >
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Empresas</span>
            <Building2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-gray-900 tabular-nums">
              {overview.totalCompanies.toLocaleString()}
            </span>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {overview.totalCourses} temas del catálogo
            </p>
          </div>
        </div>

        {/* Card 6: Facilitadores Pagados */}
        <div
          onClick={() => handleTabSelect("facilitadores")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${internalTab === "facilitadores"
              ? "bg-rose-50/70 border-rose-300 shadow-sm ring-1 ring-rose-400"
              : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
            }`}
        >
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Facilitadores</span>
            <Users className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-gray-900 tabular-nums">
              {overview.paidFacilitatorsCount}
            </span>
            <p className="text-[11px] text-gray-500 mt-0.5">
              con honorarios procesados
            </p>
          </div>
        </div>
      </div>

      {/* ── Sub-Nav Pills & Filters ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-3">
          {/* Pill selector */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => handleTabSelect("overview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${internalTab === "overview"
                  ? "bg-white text-sky-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
                }`}
            >
              <Award className="w-3.5 h-3.5" />
              Vista General
            </button>

            <button
              onClick={() => handleTabSelect("cursos")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${internalTab === "cursos"
                  ? "bg-white text-sky-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
                }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Cursos ({data.courses.length})
            </button>

            <button
              onClick={() => handleTabSelect("facilitadores")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${internalTab === "facilitadores"
                  ? "bg-white text-sky-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
                }`}
            >
              <Users className="w-3.5 h-3.5" />
              Facilitadores ({data.facilitators.length})
            </button>

            <button
              onClick={() => handleTabSelect("empresas")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${internalTab === "empresas"
                  ? "bg-white text-sky-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
                }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Empresas ({data.companies.length})
            </button>

            <button
              onClick={() => handleTabSelect("carnets")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${internalTab === "carnets"
                  ? "bg-white text-sky-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
                }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Carnets ({data.carnetsData?.total || 0})
            </button>

            <button
              onClick={() => handleTabSelect("surveys")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${internalTab === "surveys"
                  ? "bg-white text-sky-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
                }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Satisfacción ({data.surveysData?.totalSurveys || 0})
            </button>

            <button
              onClick={() => handleTabSelect("tendencias")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${internalTab === "tendencias"
                  ? "bg-white text-sky-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
                }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Tendencias
            </button>

            <button
              onClick={() => handleTabSelect("ubicaciones")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${internalTab === "ubicaciones"
                  ? "bg-white text-sky-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
                }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              Estados ({data.locations.length})
            </button>
          </div>

          {/* Quick search input */}
          {internalTab !== "overview" && internalTab !== "tendencias" && (
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Buscar en ${internalTab}...`}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
          )}
        </div>

        {/* ─── TAB 1: OVERVIEW COCKPIT ───────────────────────────────────── */}
        {internalTab === "overview" && (
          <div className="space-y-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Top Facilitadores con Honorarios */}
              <div className="bg-slate-50/60 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-600" />
                    Honorarios por Facilitador
                  </h4>
                  <button
                    onClick={() => handleTabSelect("facilitadores")}
                    className="text-[11px] font-semibold text-sky-600 hover:underline"
                  >
                    Ver todos →
                  </button>
                </div>
                <div className="space-y-2">
                  {data.facilitators.slice(0, 5).map((f, idx) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-gray-100"
                    >
                      <div className="truncate pr-2">
                        <span className="font-semibold text-gray-800 mr-1.5">{idx + 1}.</span>
                        <span className="text-gray-700 font-medium">{f.nombreApellido}</span>
                        <span className="block text-[10px] text-gray-400">{f.cedula || "Facilitador"}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-emerald-700 tabular-nums">
                          ${f.totalHonorarios.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-400 block tabular-nums">
                          {f.totalHours}h requisición
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Cursos Dictados */}
              <div className="bg-slate-50/60 rounded-xl p-4 border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-amber-600" />
                    Cursos Más Impartidos
                  </h4>
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-gray-200 text-[10px]">
                    <button
                      onClick={() => setTopCourseRanking("osis")}
                      className={`px-2 py-0.5 rounded font-medium transition-colors ${topCourseRanking === "osis"
                          ? "bg-amber-100 text-amber-900 font-bold"
                          : "text-gray-500 hover:text-gray-800"
                        }`}
                      title="Ordenar por cantidad de grupos u órdenes ejecutadas"
                    >
                      Por Grupos
                    </button>
                    <button
                      onClick={() => setTopCourseRanking("hours")}
                      className={`px-2 py-0.5 rounded font-medium transition-colors ${topCourseRanking === "hours"
                          ? "bg-amber-100 text-amber-900 font-bold"
                          : "text-gray-500 hover:text-gray-800"
                        }`}
                      title="Ordenar por horas totales dictadas"
                    >
                      Por Horas
                    </button>
                    <button
                      onClick={() => setTopCourseRanking("certs")}
                      className={`px-2 py-0.5 rounded font-medium transition-colors ${topCourseRanking === "certs"
                          ? "bg-amber-100 text-amber-900 font-bold"
                          : "text-gray-500 hover:text-gray-800"
                        }`}
                      title="Ordenar por participantes capacitados"
                    >
                      Por Participantes
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {overviewTopCourses.map((c, idx) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-gray-100"
                    >
                      <div className="truncate pr-2">
                        <span className="font-semibold text-gray-800 mr-1.5">{idx + 1}.</span>
                        <span className="text-gray-700 font-medium">{c.nombre}</span>
                        <span className="block text-[10px] text-gray-400">
                          {c.totalOsis} {c.totalOsis === 1 ? "OSI" : "OSIs"} {c.totalSessions > 0 && c.totalSessions !== c.totalOsis ? `(${c.totalSessions} ${c.totalSessions === 1 ? "grupo dictado" : "grupos dictados"})` : ""} · {c.totalHours}h dictadas
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-amber-700 tabular-nums">{c.totalHours}h</span>
                        <span className="text-[10px] text-gray-400 block tabular-nums">{c.totalCertificates.toLocaleString()} certs</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Empresas */}
              <div className="bg-slate-50/60 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    Empresas con Mayor Participación
                  </h4>
                  <button
                    onClick={() => handleTabSelect("empresas")}
                    className="text-[11px] font-semibold text-sky-600 hover:underline"
                  >
                    Ver todas →
                  </button>
                </div>
                <div className="space-y-2">
                  {data.companies.slice(0, 5).map((comp, idx) => (
                    <div
                      key={comp.id}
                      className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-gray-100"
                    >
                      <div className="truncate pr-2">
                        <span className="font-semibold text-gray-800 mr-1.5">{idx + 1}.</span>
                        <span className="text-gray-700 font-medium">{comp.razonSocial}</span>
                        <span className="block text-[10px] text-gray-400">{comp.rif}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-gray-900 tabular-nums">{comp.totalCertificates}</span>
                        <span className="text-[10px] text-gray-400 block tabular-nums">{comp.totalHours}h</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Link Card to KPIs / Indicadores */}
            <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-sky-950 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-600" />
                  Métricas Operativas: Cumplimiento de 72 Horas y Arrastre de OSIs
                </h4>
                <p className="text-xs text-sky-800 mt-1 max-w-2xl leading-relaxed">
                  Para auditar el plazo de emisión de certificados (dentro de los 3 días hábiles post-ejecución) y el seguimiento de OSIs (ejecutadas, pendientes, arrastradas y planificadas para los próximos meses), consulta la sección de Indicadores.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Link
                  href="/dashboard/capacitacion/indicadores?tab=contratacion"
                  className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Crecimiento de Facilitadores →
                </Link>
                <Link
                  href="/dashboard/capacitacion/indicadores?tab=72h"
                  className="px-3 py-1.5 bg-sky-600 text-white hover:bg-sky-700 text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Auditoría 72h →
                </Link>
                <Link
                  href="/dashboard/capacitacion/indicadores?tab=gestion"
                  className="px-3 py-1.5 bg-white border border-sky-300 text-sky-900 hover:bg-sky-50 text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Flujo Mensual OSIs →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: CURSOS ─────────────────────────────────────────────── */}
        {internalTab === "cursos" && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Aclaratoria sobre horas académicas:</strong> La columna <em>Horas Dictadas</em> corresponde a la suma real de las sesiones ejecutadas en todos los grupos atendidos (por ejemplo, <em>Excelencia Operacional</em> es un curso de 16h estándar que se ha dictado a 31 grupos distintos, acumulando 545h de capacitación efectiva). No debe confundirse con la duración de una sola edición.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[680px]">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] bg-gray-50/70 select-none">
                    <th
                      onClick={() => toggleCourseSort("nombre")}
                      className="py-2.5 px-3 font-semibold cursor-pointer hover:text-sky-900 hover:bg-gray-100 transition-colors w-[36%] min-w-[220px]"
                    >
                      Curso / Tema {renderSortIndicator(courseSortKey, "nombre", courseSortDir)}
                    </th>
                    <th
                      onClick={() => toggleCourseSort("totalOsis")}
                      className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-sky-900 hover:bg-gray-100 transition-colors w-[12%] min-w-[70px]"
                    >
                      OSIs {renderSortIndicator(courseSortKey, "totalOsis", courseSortDir)}
                    </th>
                    <th
                      onClick={() => toggleCourseSort("totalHours")}
                      className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-sky-900 hover:bg-gray-100 transition-colors w-[13%] min-w-[85px]"
                    >
                      Horas Dictadas {renderSortIndicator(courseSortKey, "totalHours", courseSortDir)}
                    </th>
                    <th
                      onClick={() => toggleCourseSort("totalCertificates")}
                      className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-sky-900 hover:bg-gray-100 transition-colors w-[13%] min-w-[85px]"
                    >
                      Participantes {renderSortIndicator(courseSortKey, "totalCertificates", courseSortDir)}
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right w-[13%] min-w-[75px]">Empresas</th>
                    <th className="py-2.5 px-3 font-semibold text-right w-[13%] min-w-[75px]">Facilitadores</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedCourses.map((c) => (
                    <tr key={c.id} className="hover:bg-sky-50/40 transition-colors">
                      <td className="py-3 px-3 font-medium text-gray-900">
                        <span className="block leading-snug">{c.nombre}</span>
                        {c.totalOsis === 0 && c.totalCertificates > 0 && (
                          <span className="inline-block mt-0.5 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 font-normal">
                            Certificados emitidos de cursos previos
                          </span>
                        )}
                        {c.totalOsis > 0 && c.totalCertificates === 0 && (
                          <span className="inline-block mt-0.5 text-[10px] text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200/60 font-normal">
                            Curso ejecutado · Certificados en trámite
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">
                        {c.osisList && c.osisList.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCourseOsis({
                                courseName: c.nombre,
                                totalHours: c.totalHours,
                                totalSessions: c.totalSessions,
                                deliveries: c.deliveries,
                                osis: c.osisList,
                              });
                            }}
                            className="inline-flex flex-col items-end group/btn cursor-pointer"
                            title={`Ver el desglose de las ${c.totalOsis} OSIs de este curso`}
                          >
                            <span className="inline-flex items-center gap-1 font-bold text-sky-700 group-hover/btn:text-sky-900 group-hover/btn:underline px-1.5 py-0.5 rounded hover:bg-sky-100/60 transition-colors">
                              <span>{c.totalOsis}</span>
                              <ExternalLink className="w-3 h-3 text-sky-500 opacity-70" />
                            </span>
                            {c.totalSessions > 0 && c.totalSessions !== c.totalOsis && (
                              <span className="text-[10px] text-gray-500 font-medium">
                                ({c.totalSessions} {c.totalSessions === 1 ? "grupo dictado" : "grupos dictados"})
                              </span>
                            )}
                          </button>
                        ) : (
                          <span className="text-gray-400 font-semibold">{c.totalOsis}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-amber-700 font-bold tabular-nums">
                        {c.totalHours}h
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-gray-900 tabular-nums">
                        {c.totalCertificates.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-700 tabular-nums">
                        {c.totalCompanies}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-700 tabular-nums">
                        {c.totalFacilitators}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
              <span>
                * <strong>Horas Dictadas</strong>: Horas académicas acumuladas de los cursos y OSIs ejecutadas en el período.
              </span>
              <span>
                Mostrando {filteredCourses.length} cursos impartidos
              </span>
            </div>
          </div>
        )}

        {/* ─── TAB 3: FACILITADORES ──────────────────────────────────────── */}
        {internalTab === "facilitadores" && (
          <div className="space-y-4">
            {/* Banner to Contratación & Crecimiento de Facilitadores Indicator */}
            <div className="bg-gradient-to-r from-emerald-50 to-sky-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Indicador de Crecimiento y Contratación de Facilitadores
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Consulta cuántos facilitadores han ingresado mes a mes, su distribución por ciudad/estado, conversión de entrevistas y descarga el reporte oficial en PDF.
                </p>
              </div>
              <Link
                href="/dashboard/capacitacion/indicadores?tab=contratacion"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors shrink-0 self-start sm:self-auto"
              >
                Abrir Indicador y Exportar PDF →
              </Link>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
                <span className="text-xs font-semibold uppercase text-emerald-800 tracking-wider">
                  Total Honorarios Pagados
                </span>
                <p className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">
                  ${overview.totalHonorariosFacilitadores.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  {overview.pendingFacilitatorHonorarios > 0
                    ? `+$${overview.pendingFacilitatorHonorarios.toLocaleString()} en requisiciones pendientes`
                    : "Procesado por Administración vía requisición"}
                </p>
              </div>

              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
                <span className="text-xs font-semibold uppercase text-amber-800 tracking-wider">
                  Horas Totales Pagadas
                </span>
                <p className="text-2xl font-bold text-amber-800 mt-1 tabular-nums">
                  {overview.totalFacilitatorHours.toLocaleString()}h
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  {overview.pendingFacilitatorHours > 0
                    ? `+${overview.pendingFacilitatorHours.toLocaleString()}h en requisiciones pendientes`
                    : "Horas académicas registradas en requisiciones"}
                </p>
              </div>

              <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-4">
                <span className="text-xs font-semibold uppercase text-sky-800 tracking-wider">
                  Facilitadores Remunerados
                </span>
                <p className="text-2xl font-bold text-sky-900 mt-1 tabular-nums">
                  {overview.paidFacilitatorsCount}
                </p>
                <p className="text-[11px] text-sky-700 mt-0.5">
                  de {data.facilitators.length} facilitadores con actividad en el período
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] bg-gray-50/70 select-none">
                    <th
                      onClick={() => toggleFacSort("nombreApellido")}
                      className="py-2.5 px-3 font-semibold cursor-pointer hover:text-sky-900 hover:bg-gray-100 transition-colors"
                    >
                      Facilitador {renderSortIndicator(facSortKey, "nombreApellido", facSortDir)}
                    </th>
                    <th className="py-2.5 px-3 font-semibold">Cédula</th>
                    <th className="py-2.5 px-3 font-semibold">Estado Base</th>
                    <th
                      onClick={() => toggleFacSort("totalHours")}
                      className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-sky-900 hover:bg-gray-100 transition-colors"
                    >
                      Horas Pagadas {renderSortIndicator(facSortKey, "totalHours", facSortDir)}
                    </th>
                    <th
                      onClick={() => toggleFacSort("totalHonorarios")}
                      className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-sky-900 hover:bg-gray-100 transition-colors"
                    >
                      Honorarios ($) {renderSortIndicator(facSortKey, "totalHonorarios", facSortDir)}
                    </th>
                    <th
                      onClick={() => toggleFacSort("totalOsis")}
                      className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-sky-900 hover:bg-gray-100 transition-colors"
                    >
                      OSIs {renderSortIndicator(facSortKey, "totalOsis", facSortDir)}
                    </th>
                    <th
                      onClick={() => toggleFacSort("totalCertificates")}
                      className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-sky-900 hover:bg-gray-100 transition-colors"
                    >
                      Certificados {renderSortIndicator(facSortKey, "totalCertificates", facSortDir)}
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">Temas</th>
                    <th
                      onClick={() => toggleFacSort("averageRating")}
                      className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-sky-900 hover:bg-gray-100 transition-colors"
                    >
                      Rating {renderSortIndicator(facSortKey, "averageRating", facSortDir)}
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-center">Estatus Requisición</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedFacilitators.map((f) => (
                    <tr key={f.id} className="hover:bg-sky-50/40 transition-colors">
                      <td className="py-3 px-3 font-medium text-gray-900">
                        <span>{f.nombreApellido}</span>
                        {!f.isActive && (
                          <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-normal">
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-gray-500 font-mono text-[11px]">{f.cedula || "N/A"}</td>
                      <td className="py-3 px-3 text-gray-600">{f.estadoNombre}</td>
                      <td className="py-3 px-3 text-right tabular-nums">
                        <span className="text-amber-700 font-bold">{f.totalHours}h</span>
                        {f.pendingHours > 0 && (
                          <span className="block text-[10px] text-amber-600 font-normal">
                            (+{f.pendingHours}h pend.)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">
                        <span className="text-emerald-600 font-bold text-sm">
                          ${f.totalHonorarios.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                        {f.pendingHonorarios > 0 && (
                          <span className="block text-[10px] text-amber-600 font-normal">
                            (+${f.pendingHonorarios.toLocaleString()} pend.)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-sky-700 font-semibold tabular-nums">
                        {f.totalOsis}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-gray-900 tabular-nums">
                        {f.totalCertificates.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-700 tabular-nums">
                        {f.uniqueCourses}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">
                        {f.averageRating > 0 ? (
                          <span
                            className="inline-flex items-center gap-1 font-semibold text-amber-700"
                            title={`Promedio de ${f.surveyCount} encuesta(s)`}
                          >
                            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                            {f.averageRating}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {f.estatusRequisicion === "procesada" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <Check className="w-3 h-3" /> Procesada
                          </span>
                        ) : f.estatusRequisicion === "pendiente" ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800"
                            title="Requisición entregada pero pendiente de procesamiento por Administración"
                          >
                            <Clock className="w-3 h-3" /> Pendiente
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                            Sin Requisición
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 4: EMPRESAS ───────────────────────────────────────────── */}
        {internalTab === "empresas" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] bg-gray-50/70 select-none">
                  <th
                    onClick={() => toggleCompSort("razonSocial")}
                    className="py-2.5 px-3 font-semibold cursor-pointer hover:text-sky-900 hover:bg-gray-100 transition-colors"
                  >
                    Empresa / Cliente {renderSortIndicator(compSortKey, "razonSocial", compSortDir)}
                  </th>
                  <th className="py-2.5 px-3 font-semibold">RIF</th>
                  <th
                    onClick={() => toggleCompSort("totalCertificates")}
                    className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-sky-900 hover:bg-gray-100 transition-colors"
                  >
                    Certificados {renderSortIndicator(compSortKey, "totalCertificates", compSortDir)}
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-right">Carnets</th>
                  <th
                    onClick={() => toggleCompSort("totalOsis")}
                    className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-sky-900 hover:bg-gray-100 transition-colors"
                  >
                    OSIs {renderSortIndicator(compSortKey, "totalOsis", compSortDir)}
                  </th>
                  <th
                    onClick={() => toggleCompSort("totalHours")}
                    className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-sky-900 hover:bg-gray-100 transition-colors"
                  >
                    Horas Recibidas {renderSortIndicator(compSortKey, "totalHours", compSortDir)}
                  </th>
                  <th className="py-2.5 px-3 font-semibold">Estados Atendidos</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedCompanies.map((c) => (
                  <tr key={c.id} className="hover:bg-sky-50/40 transition-colors">
                    <td className="py-3 px-3 font-medium text-gray-900">
                      {c.razonSocial}
                    </td>
                    <td className="py-3 px-3 text-gray-500 font-mono text-[11px]">{c.rif}</td>
                    <td className="py-3 px-3 text-right font-bold text-gray-900 tabular-nums">
                      {c.totalCertificates.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700 tabular-nums">
                      {c.totalCarnets.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-sky-700 font-semibold tabular-nums">
                      {c.totalOsis}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700 tabular-nums">
                      {c.totalHours}h
                    </td>
                    <td className="py-3 px-3 text-gray-500 max-w-[200px] truncate" title={c.states.join(", ")}>
                      {c.states.join(", ") || "—"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/dashboard/capacitacion/gestion-osi?search=${encodeURIComponent(c.razonSocial)}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-800"
                      >
                        OSIs <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── TAB 5: CARNETS ────────────────────────────────────────────── */}
        {internalTab === "carnets" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-gray-200">
                <span className="text-xs font-semibold uppercase text-gray-500">Total Carnets</span>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {data.carnetsData?.total.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Emitidos históricamente</p>
              </div>

              <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
                <span className="text-xs font-semibold uppercase text-emerald-700">Carnets Vigentes</span>
                <p className="text-2xl font-bold text-emerald-900 mt-1">
                  {data.carnetsData?.active.toLocaleString()}
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">Válidos para laborar</p>
              </div>

              <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200">
                <span className="text-xs font-semibold uppercase text-amber-700">Por Vencer (≤30 días)</span>
                <p className="text-2xl font-bold text-amber-900 mt-1">
                  {data.carnetsData?.expiringSoon.toLocaleString()}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">Requieren renovación</p>
              </div>

              <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200">
                <span className="text-xs font-semibold uppercase text-rose-700">Carnets Vencidos</span>
                <p className="text-2xl font-bold text-rose-900 mt-1">
                  {data.carnetsData?.expired.toLocaleString()}
                </p>
                <p className="text-xs text-rose-700 mt-0.5">Plazo expirado</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Muestra de Carnets Recientes
                </h4>
                <span className="text-xs text-gray-400">Últimos registros</span>
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] bg-gray-50/70">
                    <th className="py-2.5 px-3 font-semibold">ID Carnet</th>
                    <th className="py-2.5 px-3 font-semibold">Empresa Asociada</th>
                    <th className="py-2.5 px-3 font-semibold">Fecha Emisión</th>
                    <th className="py-2.5 px-3 font-semibold">Fecha Vencimiento</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(data.carnetsData?.recent || []).map((c) => (
                    <tr key={c.id} className="hover:bg-sky-50/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-gray-900">
                        #{c.id}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-gray-800">
                        {c.empresaNombre}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">{c.fechaEmision || "—"}</td>
                      <td className="py-2.5 px-3 text-gray-600">{c.fechaVencimiento || "—"}</td>
                      <td className="py-2.5 px-3 text-center">
                        {c.status === "vigente" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Vigente
                          </span>
                        )}
                        {c.status === "por_vencer" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Por Vencer
                          </span>
                        )}
                        {c.status === "vencido" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            Vencido
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 6: SATISFACCIÓN (SURVEYS) ─────────────────────────────── */}
        {internalTab === "surveys" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-yellow-500/10 border border-amber-200 rounded-xl p-5 flex flex-col justify-center">
                <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
                  Calificación Global de Satisfacción
                </span>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-4xl font-extrabold text-amber-600">
                    {data.surveysData.averageScore}
                  </span>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {[1, 2, 3, 4, 5].map((st) => (
                        <Star
                          key={st}
                          className={`w-4 h-4 ${st <= Math.round(data.surveysData.averageScore)
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-300"
                            }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500 mt-1">
                      Basado en {data.surveysData.totalSurveys} encuestas
                    </span>
                  </div>
                </div>
              </div>

              {/* Breakdown by questions */}
              <div className="md:col-span-2 bg-slate-50/70 border border-gray-200 rounded-xl p-5">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
                  Promedio por Dimensiones Evaluadas (Escala 1 a 5)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-white p-3 rounded-lg border border-gray-100 text-center">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Q1 Contenido</span>
                    <span className="text-base font-bold text-gray-800 mt-1 block">
                      {data.surveysData.questionAverages.q1} / 5
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-gray-100 text-center">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Q2 Facilitador</span>
                    <span className="text-base font-bold text-gray-800 mt-1 block">
                      {data.surveysData.questionAverages.q2} / 5
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-gray-100 text-center">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Q3 Didáctica</span>
                    <span className="text-base font-bold text-gray-800 mt-1 block">
                      {data.surveysData.questionAverages.q3} / 5
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-gray-100 text-center">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Q4 Organización</span>
                    <span className="text-base font-bold text-gray-800 mt-1 block">
                      {data.surveysData.questionAverages.q4} / 5
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-gray-100 text-center">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Q5 Utilidad</span>
                    <span className="text-base font-bold text-gray-800 mt-1 block">
                      {data.surveysData.questionAverages.q5} / 5
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Surveys by OSI Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] bg-gray-50/70">
                    <th className="py-2.5 px-3 font-semibold">Nro OSI</th>
                    <th className="py-2.5 px-3 font-semibold">Empresa</th>
                    <th className="py-2.5 px-3 font-semibold">Curso Dictado</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Encuestas</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Rating Medio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSurveys.map((s) => (
                    <tr key={s.idOsi} className="hover:bg-sky-50/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-sky-700">
                        {s.nroOsi}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-gray-900">{s.empresaNombre}</td>
                      <td className="py-2.5 px-3 text-gray-700">{s.cursoNombre}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-800 tabular-nums">
                        {s.surveyCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-amber-600 tabular-nums">
                        ★ {s.averageRating}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 7: TENDENCIAS ─────────────────────────────────────────── */}
        {internalTab === "tendencias" && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Evolución Mensual (Últimos 12 Meses)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] bg-gray-50/70">
                    <th className="py-2.5 px-3 font-semibold">Mes</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Certificados</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Carnets PVC</th>
                    <th className="py-2.5 px-3 font-semibold text-right">OSIs Ejecutadas</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Horas Académicas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.monthlyTrends.map((m) => (
                    <tr key={m.monthKey} className="hover:bg-sky-50/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-gray-900">{m.label}</td>
                      <td className="py-3 px-3 text-right font-bold text-sky-700 tabular-nums">
                        {m.certificatesCount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right text-indigo-700 tabular-nums">
                        {m.carnetsCount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-700 font-semibold tabular-nums">
                        {m.osisCount}
                      </td>
                      <td className="py-3 px-3 text-right text-amber-700 font-bold tabular-nums">
                        {m.hoursCount}h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 8: UBICACIONES ────────────────────────────────────────── */}
        {internalTab === "ubicaciones" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] bg-gray-50/70">
                  <th className="py-2.5 px-3 font-semibold">Estado de Venezuela</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Certificados</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Carnets PVC</th>
                  <th className="py-2.5 px-3 font-semibold text-right">OSIs</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Empresas</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Horas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLocations.map((l) => (
                  <tr key={l.id} className="hover:bg-sky-50/40 transition-colors">
                    <td className="py-3 px-3 font-medium text-gray-900 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-sky-600" />
                      {l.nombreEstado}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-gray-900 tabular-nums">
                      {l.totalCertificates.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700 tabular-nums">
                      {l.totalCarnets.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-sky-700 font-semibold tabular-nums">
                      {l.totalOsis}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700 tabular-nums">
                      {l.totalCompanies}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-700 font-medium tabular-nums">
                      {l.totalHours}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Multi-OSI Review Modal ────────────────────────────────────────── */}
      {isMultiOsiModalOpen && data.potentialMultiOsiGroups && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-gray-200">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-amber-50/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Cursos Abiertos y Servicios Multi-OSI ({data.potentialMultiOsiGroups.length})
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Capacitaciones dictadas en una misma sesión para varias empresas clientes o divididas por facturación.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMultiOsiModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="space-y-3">
                {data.potentialMultiOsiGroups.map((group, idx) => (
                  <div key={group.groupKey || idx} className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/50 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-gray-800">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 text-sm">{group.cursoNombre}</span>
                          {group.isOpenCourse ? (
                            <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full border border-sky-200">
                              Curso Abierto · {group.companies?.length || group.osis.length} empresas
                            </span>
                          ) : (
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200">
                              Servicio Corporativo · {group.osis.length} órdenes
                            </span>
                          )}
                          {group.hasCostValidation && (
                            <span
                              className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1"
                              title="Validado por costos: una OSI titular concentra los honorarios/viáticos y las demás son $0"
                            >
                              <span>✓ Costos Validados</span>
                              {group.totalGroupCost != null && group.totalGroupCost > 0 && (
                                <span>(${group.totalGroupCost})</span>
                              )}
                            </span>
                          )}
                        </div>
                        <div className="text-gray-500 text-xs mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{group.companies?.join(" · ") || group.empresaNombre}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="font-mono text-gray-700 bg-white px-2 py-1 rounded-md border border-gray-200 text-[11px] font-medium">
                          📅 {group.fecha || "Sin fecha"}
                        </span>
                        <button
                          type="button"
                          disabled={groupingKey === group.groupKey}
                          onClick={() => handleGroup(group)}
                          className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 text-white font-semibold text-[11px] rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                          title="Vincular formalmente estas OSIs como 1 servicio en Indicadores"
                        >
                          {groupingKey === group.groupKey ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Vinculando...</span>
                            </>
                          ) : (
                            <>
                              <Layers className="w-3 h-3" />
                              <span>Vincular como 1 Servicio</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      {(() => {
                        const parent = group.osis[0];
                        const children = group.osis.slice(1);
                        return (
                          <>
                            {parent && (
                              <div>
                                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-1 px-1">
                                  <span>👑 OSI Principal (Titular de Costos):</span>
                                </div>
                                <a
                                  href={`/dashboard/capacitacion/osi/${parent.idOsi}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-3 rounded-xl border bg-gradient-to-r from-emerald-50/50 via-sky-50/40 to-white border-emerald-300 hover:border-emerald-500 shadow-2xs flex items-center justify-between block no-underline group cursor-pointer transition-all"
                                  title="Abrir OSI titular en nueva pestaña"
                                >
                                  <div className="min-w-0 pr-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono font-bold text-sky-800 group-hover:text-sky-950 text-xs">
                                        OSI #{parent.nroOsi}
                                      </span>
                                      <ExternalLink className="w-3.5 h-3.5 text-sky-500" />
                                      {parent.totalCost > 0 ? (
                                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                                          💰 Costos: ${parent.totalCost}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                          $0
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs font-semibold text-gray-900 mt-1 block truncate">
                                      🏢 {parent.empresaNombre || "Empresa"}
                                    </span>
                                    <span className="text-[11px] text-gray-500 mt-0.5 block">
                                      {parent.certificatesCount} {parent.certificatesCount === 1 ? "certificado emitido" : "certificados emitidos"}
                                    </span>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                                      {parent.hours}h
                                    </span>
                                  </div>
                                </a>
                              </div>
                            )}

                            {children.length > 0 && (
                              <div className="pl-3 sm:pl-5 space-y-1.5 pt-1 border-l-2 border-sky-300 ml-4">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-800 mb-1">
                                  <span>↳ OSIs Secundarias (Clientes Participantes · Mismo Curso):</span>
                                </div>
                                {children.map((child) => (
                                  <a
                                    key={child.idOsi}
                                    href={`/dashboard/capacitacion/osi/${child.idOsi}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2.5 bg-gray-50/80 hover:bg-sky-50/60 border border-gray-200 hover:border-sky-300 rounded-lg flex items-center justify-between transition-all group block no-underline text-xs cursor-pointer"
                                    title="Abrir OSI secundaria en nueva pestaña"
                                  >
                                    <div className="min-w-0 pr-3">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-sky-500 font-bold text-sm leading-none">↳</span>
                                        <span className="font-mono font-bold text-sky-700 group-hover:text-sky-900 text-xs">
                                          OSI #{child.nroOsi}
                                        </span>
                                        <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-sky-600" />
                                        <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                                          Participante {child.totalCost > 0 ? `($${child.totalCost})` : "($0)"}
                                        </span>
                                      </div>
                                      <span className="text-[11px] font-medium text-gray-800 block ml-3 mt-0.5 truncate">
                                        🏢 {child.empresaNombre || "Empresa"}
                                      </span>
                                      <span className="text-[10px] text-gray-400 block ml-3">
                                        {child.certificatesCount} {child.certificatesCount === 1 ? "certificado emitido" : "certificados emitidos"}
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-gray-500 font-mono">
                                      {child.hours}h
                                    </span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Al vincular como 1 servicio, el cálculo de emisión 72h se unifica con la OSI principal.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMultiOsiModalOpen(false)}
                  className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
                <Link
                  href="/dashboard/capacitacion/indicadores?tab=72h"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors"
                >
                  Abrir Auditoría en Indicadores →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Dialog for Course OSIs List ──────────────────────────────────── */}
      {selectedCourseOsis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-gray-200">
            <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between bg-sky-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-100 rounded-lg text-sky-700">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    OSIs del Curso: {selectedCourseOsis.courseName}
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {selectedCourseOsis.osis.length} {selectedCourseOsis.osis.length === 1 ? "orden de servicio" : "órdenes de servicio"}
                    {selectedCourseOsis.totalSessions ? ` en ${selectedCourseOsis.totalSessions} ${selectedCourseOsis.totalSessions === 1 ? "grupo dictado" : "grupos dictados"}` : ""}
                    {selectedCourseOsis.totalHours != null ? ` · ${selectedCourseOsis.totalHours}h dictadas en total` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCourseOsis(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 max-h-[60vh]">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 flex items-start gap-2">
                <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <span>
                  Haz clic en cualquier orden para abrir su formato oficial en una pestaña nueva. Cuando varias empresas asisten a un curso abierto el mismo día, las horas se deduplican para reflejar la duración real del curso.
                </span>
              </div>

              {courseDeliveries.map((group, gIdx) => (
                <div key={gIdx} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  {/* Delivery Group Header */}
                  <div className="bg-slate-50/90 px-3.5 py-2 border-b border-gray-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800 flex items-center gap-1.5 font-mono">
                        📅 {group.fecha}
                      </span>
                      {group.childOsis.length > 0 ? (
                        group.isOpenCourse ? (
                          <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full border border-sky-200">
                            Curso Abierto · {group.distinctCompaniesCount || (group.childOsis.length + 1)} empresas
                          </span>
                        ) : (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200">
                            Servicio Corporativo · {group.childOsis.length + 1} órdenes
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] bg-gray-100 text-gray-600 font-medium px-2 py-0.5 rounded-full">
                          Entrega Individual
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 space-y-2.5">
                    {/* 👑 OSI Principal (Titular de Costos) */}
                    <div>
                      {group.childOsis.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-1 px-1">
                          <span>👑 OSI Principal (Titular de Costos):</span>
                        </div>
                      )}
                      <a
                        href={`/dashboard/capacitacion/osi/${group.parentOsi.idOsi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between block no-underline group cursor-pointer ${
                          group.childOsis.length > 0
                            ? "bg-gradient-to-r from-emerald-50/50 via-sky-50/40 to-white border-emerald-300 hover:border-emerald-500 shadow-2xs"
                            : "bg-white border-gray-200 hover:border-sky-400 hover:bg-sky-50/30"
                        }`}
                        title="Abrir OSI principal en nueva pestaña"
                      >
                        <div className="min-w-0 pr-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sky-800 group-hover:text-sky-950 text-xs">
                              OSI #{group.parentOsi.nroOsi}
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 text-sky-500" />
                            {group.parentOsi.totalCost != null && group.parentOsi.totalCost > 0 ? (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                                💰 Costos: ${group.parentOsi.totalCost}
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                $0
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-gray-900 mt-1 block truncate">
                            🏢 {group.parentOsi.empresa}{group.parentOsi.sede ? ` · 📍 ${group.parentOsi.sede}` : ""}
                          </span>
                          <span className="text-[11px] text-gray-500 mt-0.5 block">
                            {group.parentOsi.certificatesCount} {group.parentOsi.certificatesCount === 1 ? "certificado emitido" : "certificados emitidos"}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                            {group.parentOsi.hours}h
                          </span>
                        </div>
                      </a>
                    </div>

                    {/* ↳ OSIs Secundarias / Clientes Participantes */}
                    {group.childOsis.length > 0 && (
                      <div className="pl-3 sm:pl-5 space-y-1.5 pt-1 border-l-2 border-sky-300 ml-4">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-800 mb-1">
                          <span>↳ OSIs Secundarias (Clientes Participantes · Mismo Curso):</span>
                        </div>
                        {group.childOsis.map((child) => (
                          <a
                            key={child.idOsi}
                            href={`/dashboard/capacitacion/osi/${child.idOsi}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 bg-gray-50/80 hover:bg-sky-50/60 border border-gray-200 hover:border-sky-300 rounded-lg flex items-center justify-between transition-all group block no-underline text-xs"
                            title="Abrir OSI secundaria en nueva pestaña"
                          >
                            <div className="min-w-0 pr-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sky-500 font-bold text-sm leading-none">↳</span>
                                <span className="font-mono font-bold text-sky-700 group-hover:text-sky-900 text-xs">
                                  OSI #{child.nroOsi}
                                </span>
                                <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-sky-600" />
                                <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                                  Participante {child.totalCost > 0 ? `($${child.totalCost})` : "($0)"}
                                </span>
                              </div>
                              <span className="text-[11px] font-medium text-gray-800 block ml-3 mt-0.5 truncate">
                                🏢 {child.empresa}{child.sede ? ` · 📍 ${child.sede}` : ""}
                              </span>
                              <span className="text-[10px] text-gray-400 block ml-3">
                                {child.certificatesCount} {child.certificatesCount === 1 ? "certificado emitido" : "certificados emitidos"}
                              </span>
                            </div>
                            <span className="text-[11px] text-gray-500 font-mono">
                              {child.hours}h
                            </span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3.5 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCourseOsis(null)}
                className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
