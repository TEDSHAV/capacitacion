"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from "react";
import {
  Search,
  Loader2,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Calendar,
  Building2,
  Layers,
  Filter,
  X,
  User,
  Clock,
  CalendarClock,
  AlertCircle,
} from "lucide-react";
import type { OSIManagement, OSISesion, OSIFilters, OSIStatus } from "@/types";
import { cachePortalData } from "@/lib/offline/portal-data-cache";
import {
  getAllProcesoStepsBatch,
  toggleUnifiedStep,
  ensureAllProcesoStepsExist,
  autoAdvanceEjecucionSteps,
  getSeguimientoPageData,
  toggleAttachmentReceived,
  unmarkEnProcesoStep,
  restoreRescheduledToActivos,
  type ProcesoStepRecord,
} from "@/app/actions/capacitacion-proceso-steps";
import { ALL_STEPS, PLANIFICACION_STEPS, EJECUCION_STEPS } from "@/lib/proceso-steps";
import ProcesoStepsTimeline from "../components/proceso-steps-timeline";
import OSIPagination from "../gestion-osi/components/osi-pagination";
import ListaAsistenciaPreview from "./components/lista-asistencia-preview";
import UnmarkEnProcesoModal from "./components/UnmarkEnProcesoModal";
import { formatDateOnly } from "@/lib/format-date";

interface FilterOptions {
  companies: { id_empresa: number; nombre_empresa: string }[];
  ejecutivos: string[];
  statuses: OSIStatus[];
}

interface SeguimientoServiciosClientProps {
  initialOsis: OSIManagement[];
  initialTotalCount: number;
  initialStepsByOsi?: Record<string, Record<string, Record<string, ProcesoStepRecord>>>;
  initialSessionsByOsi?: Record<string, OSISesion[]>;
  initialRescheduledOsiIds?: number[];
  filterOptions?: FilterOptions;
  statuses?: OSIStatus[];
}

// --- Module-level cache (survives client-side navigation) ---
type CacheKey = string;
interface CacheEntry {
  osis: OSIManagement[];
  totalCount: number;
  stepsPlain: Record<string, Record<string, Record<string, ProcesoStepRecord>>>;
  sessionsPlain: Record<string, OSISesion[]>;
  timestamp: number;
}
const moduleCache = new Map<CacheKey, CacheEntry>();
const MAX_CACHE = 25;
const STALE_TIME_MS = 30_000; // 30 seconds freshness window

export function clearSeguimientoCache(): void {
  moduleCache.clear();
}

function cacheKey(
  filters: OSIFilters,
  searchQuery: string,
  page: number,
  itemsPerPage: number,
  filterMode: string,
  rescheduledCount: number,
): CacheKey {
  return JSON.stringify({
    filters,
    searchQuery: searchQuery.trim(),
    page,
    itemsPerPage,
    filterMode,
    rescheduledCount,
  });
}

function plainToStepsMap(
  plain?: Record<string, Record<string, Record<string, ProcesoStepRecord>>>,
): Map<number, Map<number, Record<string, ProcesoStepRecord>>> {
  const map = new Map<number, Map<number, Record<string, ProcesoStepRecord>>>();
  if (!plain) return map;
  for (const [osiIdStr, sessionObj] of Object.entries(plain)) {
    const osiId = Number(osiIdStr);
    const sessionMap = new Map<number, Record<string, ProcesoStepRecord>>();
    for (const [nroSesionStr, steps] of Object.entries(sessionObj)) {
      sessionMap.set(Number(nroSesionStr), steps);
    }
    map.set(osiId, sessionMap);
  }
  return map;
}

function plainToSessionsMap(
  plain?: Record<string, OSISesion[]>,
): Map<number, OSISesion[]> {
  const map = new Map<number, OSISesion[]>();
  if (!plain) return map;
  for (const [osiIdStr, sessions] of Object.entries(plain)) {
    map.set(Number(osiIdStr), sessions);
  }
  return map;
}

function getNextSessionDate(sessions: OSISesion[]): string | null {
  if (!sessions.length) return null;
  const now = new Date();
  const upcoming = sessions
    .filter((s) => s.fecha)
    .sort((a, b) => new Date(a.fecha!).getTime() - new Date(b.fecha!).getTime());
  const next = upcoming.find((s) => new Date(s.fecha!).getTime() >= now.getTime());
  return (next || upcoming[upcoming.length - 1])?.fecha ?? null;
}

export default function SeguimientoServiciosClient({
  initialOsis,
  initialTotalCount,
  initialStepsByOsi,
  initialSessionsByOsi,
  initialRescheduledOsiIds = [],
  filterOptions,
  statuses = [],
}: SeguimientoServiciosClientProps) {
  const [filterMode, setFilterMode] = useState<"todos" | "activos" | "reagendados">("todos");
  const [rescheduledOsiIds, setRescheduledOsiIds] = useState<number[]>(initialRescheduledOsiIds);
  const [unmarkModal, setUnmarkModal] = useState<{
    osiId: number;
    nroOsi: string;
    nroSesion: number;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [osis, setOsis] = useState<OSIManagement[]>(initialOsis);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<OSIFilters>({});
  const [stepFilter, setStepFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  // osiId → nroSesion → stepKey → record
  const [stepsByOsi, setStepsByOsi] = useState<
    Map<number, Map<number, Record<string, ProcesoStepRecord>>>
  >(() => plainToStepsMap(initialStepsByOsi));
  // osiId → sessions[]
  const [sessionsByOsi, setSessionsByOsi] = useState<Map<number, OSISesion[]>>(() =>
    plainToSessionsMap(initialSessionsByOsi),
  );
  const [expandedOsi, setExpandedOsi] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<Map<number, number>>(new Map());
  const [seeding, setSeeding] = useState<number | null>(null);
  const [previewOsi, setPreviewOsi] = useState<{ osiId: number; nroOsi: string; nroSesion: number; category?: string; title?: string; showReceivedToggle?: boolean } | null>(null);
  const isFirstRender = useRef(true);
  const hasInitialized = useRef(false);

  // Searchable Empresa combobox state
  const [localCompany, setLocalCompany] = useState(filters.companyName || "");
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [companySelectedIndex, setCompanySelectedIndex] = useState(0);
  const companyDropdownRef = useRef<HTMLDivElement>(null);

  // Cache of all fetched OSIs for instant client-side search
  const cachedOsisRef = useRef<OSIManagement[]>(initialOsis);

  // Manual or post-mutation refresh trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Seed moduleCache with initial SSR data if present
  if (initialOsis && initialOsis.length > 0) {
    const initialKey = cacheKey({}, "", 1, 10, "todos", initialRescheduledOsiIds?.length || 0);
    if (!moduleCache.has(initialKey)) {
      moduleCache.set(initialKey, {
        osis: initialOsis,
        totalCount: initialTotalCount ?? initialOsis.length,
        stepsPlain: initialStepsByOsi || {},
        sessionsPlain: initialSessionsByOsi || {},
        timestamp: Date.now(),
      });
    }
  }

  // --- Synchronous cache swap: runs before paint so cached pages appear instantly ---
  useLayoutEffect(() => {
    const key = cacheKey(filters, searchQuery, currentPage, itemsPerPage, filterMode, rescheduledOsiIds.length);
    const cached = moduleCache.get(key);
    if (cached) {
      setOsis(cached.osis);
      setTotalCount(cached.totalCount);
      setStepsByOsi(plainToStepsMap(cached.stepsPlain));
      setSessionsByOsi(plainToSessionsMap(cached.sessionsPlain));
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, searchQuery, currentPage, itemsPerPage, filterMode, rescheduledOsiIds.length, refreshTrigger]);

  // Cache initial RSC data for offline use
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      cachePortalData("dash_seguimiento", "dash_seguimiento", {
        osis: initialOsis,
        totalCount: initialTotalCount,
        stepsByOsi: initialStepsByOsi,
        sessionsByOsi: initialSessionsByOsi,
        filterOptions,
        statuses,
      }).catch(() => {});
    }
  }, [initialOsis, initialTotalCount, initialStepsByOsi, initialSessionsByOsi, filterOptions, statuses]);

  // Debounce search input → searchQuery (sent to server)
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 200);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }
  };

  // Client-side filtered OSIs: search is now server-side, so only the step filter
  // (which depends on the loaded steps data) is applied here on top of the server page.
  const filteredOsis = useMemo(() => {
    if (!stepFilter) return osis;
    return osis.filter((o) => {
      const osiMap = stepsByOsi.get(o.id_osi);
      if (!osiMap) return false;
      for (const sessionSteps of osiMap.values()) {
        if (sessionSteps[stepFilter]?.completed) return true;
      }
      return false;
    });
  }, [osis, stepFilter, stepsByOsi]);

  // Derive unique course/servicio options from cached OSIs
  const courseOptions = useMemo(() => {
    const set = new Set<string>();
    for (const o of cachedOsisRef.current) {
      if (o.servicio) set.add(o.servicio);
    }
    return Array.from(set).sort();
  }, [osis]);

  // Filtered company suggestions for the searchable Empresa combobox (max 10)
  const filteredCompanies = useMemo(() => {
    const q = localCompany.toLowerCase().trim();
    const list = filterOptions?.companies ?? [];
    if (!q) return list.slice(0, 10);
    return list.filter((c) => c.nombre_empresa.toLowerCase().includes(q)).slice(0, 10);
  }, [filterOptions, localCompany]);

  // Sync local company input when the filter is cleared externally (e.g. "Limpiar")
  useEffect(() => {
    setLocalCompany(filters.companyName || "");
  }, [filters.companyName]);

  // Close company dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        companyDropdownRef.current &&
        !companyDropdownRef.current.contains(e.target as Node)
      ) {
        setCompanyDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCompanySelect = useCallback((name: string) => {
    setLocalCompany(name);
    setCompanyDropdownOpen(false);
    setCompanySelectedIndex(0);
    setFilters((prev) => ({ ...prev, companyName: name || undefined }));
    setCurrentPage(1);
  }, []);

  const handleCompanyKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (filteredCompanies.length > 0) {
          setCompanyDropdownOpen(true);
          setCompanySelectedIndex((prev) => {
            const safePrev = Math.min(prev, filteredCompanies.length - 1);
            return safePrev < filteredCompanies.length - 1 ? safePrev + 1 : 0;
          });
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (filteredCompanies.length > 0) {
          setCompanyDropdownOpen(true);
          setCompanySelectedIndex((prev) => {
            const safePrev = Math.min(prev, filteredCompanies.length - 1);
            return safePrev > 0 ? safePrev - 1 : filteredCompanies.length - 1;
          });
        }
        break;
      case "Enter":
        if (companyDropdownOpen && filteredCompanies[companySelectedIndex]) {
          e.preventDefault();
          handleCompanySelect(filteredCompanies[companySelectedIndex].nombre_empresa);
        }
        break;
      case "Escape":
        e.preventDefault();
        setCompanyDropdownOpen(false);
        setCompanySelectedIndex(0);
        break;
      case "Tab":
        setCompanyDropdownOpen(false);
        break;
    }
  };

  const handlePageChange = useCallback((page: number) => setCurrentPage(page), []);
  const handleItemsPerPageChange = useCallback((n: number) => {
    setItemsPerPage(n);
    setCurrentPage(1);
  }, []);

  const fetchOSIs = useCallback(async () => {
    const key = cacheKey(filters, searchQuery, currentPage, itemsPerPage, filterMode, rescheduledOsiIds.length);
    const cached = moduleCache.get(key);

    // If cache entry is fresh (< 30s) and this is not a forced refresh, reuse without network call
    const isFresh = cached && (Date.now() - cached.timestamp < STALE_TIME_MS);
    if (isFresh && refreshTrigger === 0) {
      setOsis(cached.osis);
      setTotalCount(cached.totalCount);
      setStepsByOsi(plainToStepsMap(cached.stepsPlain));
      setSessionsByOsi(plainToSessionsMap(cached.sessionsPlain));
      setLoading(false);
      return;
    }

    if (!cached && osis.length === 0) {
      setLoading(true);
    }

    try {
      const filterPayload: OSIFilters = {
        ...filters,
        search: searchQuery.trim() || undefined,
      };

      if (filterMode === "reagendados") {
        filterPayload.includeOsiIds = rescheduledOsiIds;
      } else if (filterMode === "activos") {
        if (rescheduledOsiIds.length > 0) {
          filterPayload.excludeOsiIds = rescheduledOsiIds;
        }
      }

      // Single server-side round-trip for OSIs + steps + sessions
      const pageData = await getSeguimientoPageData(
        filterPayload,
        currentPage,
        itemsPerPage,
      );

      setOsis(pageData.osis);
      setTotalCount(pageData.totalCount);
      setStepsByOsi(plainToStepsMap(pageData.stepsPlain));
      setSessionsByOsi(plainToSessionsMap(pageData.sessionsPlain));

      // Accumulate fetched OSIs into cache (dedup by id_osi) for service dropdown
      const existingIds = new Set(cachedOsisRef.current.map((o) => o.id_osi));
      const newOnes = pageData.osis.filter((o) => !existingIds.has(o.id_osi));
      if (newOnes.length > 0) {
        cachedOsisRef.current = [...cachedOsisRef.current, ...newOnes];
      }

      // Store in moduleCache
      moduleCache.set(key, {
        osis: pageData.osis,
        totalCount: pageData.totalCount,
        stepsPlain: pageData.stepsPlain,
        sessionsPlain: pageData.sessionsPlain,
        timestamp: Date.now(),
      });
      if (moduleCache.size > MAX_CACHE) {
        const firstKey = moduleCache.keys().next().value;
        if (firstKey) moduleCache.delete(firstKey);
      }

      // Persist to Dexie for offline access
      cachePortalData("dash_seguimiento", "dash_seguimiento", {
        osis: pageData.osis,
        totalCount: pageData.totalCount,
        stepsByOsi: pageData.stepsPlain,
        sessionsByOsi: pageData.sessionsPlain,
        filterOptions,
        statuses,
      }).catch(() => {});
    } catch (err) {
      console.error("Error fetching OSIs for seguimiento:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, searchQuery, currentPage, itemsPerPage, filterMode, rescheduledOsiIds, refreshTrigger, filterOptions, statuses, osis.length]);

  // Re-fetch when filters, search, page, or tab changes (skip first render — server already loaded)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchOSIs();
  }, [fetchOSIs]);

  // --- Prefetch next page in the background ---
  useEffect(() => {
    if (loading) return;
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    if (currentPage >= totalPages) return;
    const nextPage = currentPage + 1;
    const nextKey = cacheKey(filters, searchQuery, nextPage, itemsPerPage, filterMode, rescheduledOsiIds.length);
    if (moduleCache.has(nextKey)) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        const filterPayload: OSIFilters = {
          ...filters,
          search: searchQuery.trim() || undefined,
        };
        if (filterMode === "reagendados") {
          filterPayload.includeOsiIds = rescheduledOsiIds;
        } else if (filterMode === "activos") {
          if (rescheduledOsiIds.length > 0) {
            filterPayload.excludeOsiIds = rescheduledOsiIds;
          }
        }

        const pageData = await getSeguimientoPageData(
          filterPayload,
          nextPage,
          itemsPerPage,
        );
        if (cancelled) return;

        moduleCache.set(nextKey, {
          osis: pageData.osis,
          totalCount: pageData.totalCount,
          stepsPlain: pageData.stepsPlain,
          sessionsPlain: pageData.sessionsPlain,
          timestamp: Date.now(),
        });
        if (moduleCache.size > MAX_CACHE) {
          const firstKey = moduleCache.keys().next().value;
          if (firstKey) moduleCache.delete(firstKey);
        }
      } catch {
        // Silently catch background prefetch errors
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [currentPage, totalCount, itemsPerPage, filters, searchQuery, filterMode, rescheduledOsiIds.length, rescheduledOsiIds, loading]);

  const handleToggleStep = useCallback(
    async (osiId: number, nroSesion: number, stepKey: string, notes?: string) => {
      const result = await toggleUnifiedStep(osiId, stepKey, nroSesion, notes);
      if (result.success) {
        setStepsByOsi((prev) => {
          const newMap = new Map(prev);
          const osiMap = newMap.get(osiId) || new Map();
          const sessionMap = osiMap.get(nroSesion) || {};
          const existing = sessionMap[stepKey];
          const updatedSessionMap: Record<string, ProcesoStepRecord> = {
            ...sessionMap,
            [stepKey]: {
              ...existing,
              osi_id: osiId,
              nro_sesion: nroSesion,
              phase: existing?.phase ?? "ejecucion",
              step_key: stepKey,
              id: existing?.id ?? 0,
              completed: result.completed!,
              completed_at: result.completed ? new Date().toISOString() : null,
              completed_by: existing?.completed_by ?? null,
              notes: result.completed ? (notes ?? existing?.notes ?? null) : null,
              step_metadata: result.completed && notes?.trim() ? { guia: notes.trim() } : existing?.step_metadata ?? null,
            },
          };

          // If marking this post-service step triggered guard clause to auto-complete en_proceso
          if (result.autoCompletedEnProceso) {
            const existingEnProceso = sessionMap["en_proceso"];
            updatedSessionMap["en_proceso"] = {
              ...existingEnProceso,
              osi_id: osiId,
              nro_sesion: nroSesion,
              phase: "ejecucion",
              step_key: "en_proceso",
              id: existingEnProceso?.id ?? 0,
              completed: true,
              completed_at: new Date().toISOString(),
              completed_by: existingEnProceso?.completed_by ?? null,
              notes: existingEnProceso?.notes ?? null,
              step_metadata: {
                ...((existingEnProceso?.step_metadata as Record<string, unknown>) || {}),
                auto_completed_by_guard: true,
                unmarked_by_user: false,
              },
            };
          }

          osiMap.set(nroSesion, updatedSessionMap);
          newMap.set(osiId, osiMap);
          return newMap;
        });

        // Update moduleCache for current key in place so returning to this page retains the toggle
        const currentKey = cacheKey(filters, searchQuery, currentPage, itemsPerPage, filterMode, rescheduledOsiIds.length);
        const entry = moduleCache.get(currentKey);
        if (entry) {
          const osiKey = String(osiId);
          const sesKey = String(nroSesion);
          if (!entry.stepsPlain[osiKey]) entry.stepsPlain[osiKey] = {};
          if (!entry.stepsPlain[osiKey][sesKey]) entry.stepsPlain[osiKey][sesKey] = {};
          const existing = entry.stepsPlain[osiKey][sesKey][stepKey];
          entry.stepsPlain[osiKey][sesKey][stepKey] = {
            ...existing,
            osi_id: osiId,
            nro_sesion: nroSesion,
            phase: existing?.phase ?? "ejecucion",
            step_key: stepKey,
            id: existing?.id ?? 0,
            completed: result.completed!,
            completed_at: result.completed ? new Date().toISOString() : null,
            completed_by: existing?.completed_by ?? null,
            notes: result.completed ? (notes ?? existing?.notes ?? null) : null,
            step_metadata: result.completed && notes?.trim() ? { guia: notes.trim() } : existing?.step_metadata ?? null,
          };
          if (result.autoCompletedEnProceso) {
            const existingEnProceso = entry.stepsPlain[osiKey][sesKey]["en_proceso"];
            entry.stepsPlain[osiKey][sesKey]["en_proceso"] = {
              ...existingEnProceso,
              osi_id: osiId,
              nro_sesion: nroSesion,
              phase: "ejecucion",
              step_key: "en_proceso",
              id: existingEnProceso?.id ?? 0,
              completed: true,
              completed_at: new Date().toISOString(),
              completed_by: existingEnProceso?.completed_by ?? null,
              notes: existingEnProceso?.notes ?? null,
              step_metadata: {
                ...((existingEnProceso?.step_metadata as Record<string, unknown>) || {}),
                auto_completed_by_guard: true,
                unmarked_by_user: false,
              },
            };
          }
        }

        // If toggling lista_asistencia, also toggle the per-OSI attachment_received flag
        if (stepKey === "lista_asistencia" && result.completed) {
          await toggleAttachmentReceived(osiId);
        }
      }
    },
    [filters, searchQuery, currentPage, itemsPerPage, filterMode, rescheduledOsiIds.length],
  );

  const handleRequestUnmarkEnProceso = useCallback(
    (osiId: number) => {
      const osi = osis.find((o) => o.id_osi === osiId);
      const currentSesion = selectedSession.get(osiId) ?? 1;
      setUnmarkModal({
        osiId,
        nroOsi: osi?.nro_osi || `OSI-${osiId}`,
        nroSesion: currentSesion,
      });
    },
    [osis, selectedSession],
  );

  const handleConfirmUnmark = useCallback(
    async (reason: string, isRescheduled: boolean, newDate?: string | null) => {
      if (!unmarkModal) return;
      const { osiId, nroSesion } = unmarkModal;
      const res = await unmarkEnProcesoStep({
        osiId,
        nroSesion,
        reason,
        isRescheduled,
        newDate,
      });
      if (!res.success) {
        throw new Error(res.error || "Error al desmarcar el paso.");
      }

      // Update local state for steps
      setStepsByOsi((prev) => {
        const newMap = new Map(prev);
        const osiMap = newMap.get(osiId) || new Map();
        const sessionMap = osiMap.get(nroSesion) || {};
        const existing = sessionMap["en_proceso"];
        osiMap.set(nroSesion, {
          ...sessionMap,
          en_proceso: {
            ...existing,
            osi_id: osiId,
            nro_sesion: nroSesion,
            phase: "ejecucion",
            step_key: "en_proceso",
            id: existing?.id ?? 0,
            completed: false,
            completed_at: null,
            notes: reason,
            step_metadata: {
              ...((existing?.step_metadata as Record<string, unknown>) || {}),
              unmark_reason: reason,
              is_rescheduled: isRescheduled,
              new_date: newDate || null,
              date_confirmed: !!newDate,
              unmarked_by_user: true,
              unmarked_at: new Date().toISOString(),
            },
          },
        });
        newMap.set(osiId, osiMap);
        return newMap;
      });

      // Update session date locally if newDate was provided
      if (newDate) {
        setSessionsByOsi((prev) => {
          const newMap = new Map(prev);
          const sessions = newMap.get(osiId) || [];
          newMap.set(
            osiId,
            sessions.map((s) => (s.nro_sesion === nroSesion ? { ...s, fecha: newDate } : s)),
          );
          return newMap;
        });
      }

      if (isRescheduled) {
        setRescheduledOsiIds((prev) => (prev.includes(osiId) ? prev : [...prev, osiId]));
        if (filterMode === "activos") {
          setOsis((prev) => prev.filter((o) => o.id_osi !== osiId));
          setTotalCount((prev) => Math.max(0, prev - 1));
        }
      }

      // Clear cache so both tabs and active counts will re-fetch accurate server data
      moduleCache.clear();
    },
    [unmarkModal, filterMode],
  );

  const handleRestoreToActivos = useCallback(
    async (osiId: number, nroSesion: number) => {
      const res = await restoreRescheduledToActivos(osiId, nroSesion);
      if (!res.success) {
        alert(res.error || "Error al restaurar a activos.");
        return;
      }

      setStepsByOsi((prev) => {
        const newMap = new Map(prev);
        const osiMap = newMap.get(osiId) || new Map();
        const sessionMap = osiMap.get(nroSesion) || {};
        const existing = sessionMap["en_proceso"];
        const existingMeta = (existing?.step_metadata as Record<string, unknown>) || {};
        osiMap.set(nroSesion, {
          ...sessionMap,
          en_proceso: {
            ...existing,
            step_metadata: {
              ...existingMeta,
              is_rescheduled: false,
            },
          },
        });
        newMap.set(osiId, osiMap);

        // Check if all sessions for this OSI are no longer rescheduled
        let hasAnyRescheduled = false;
        for (const sMap of osiMap.values()) {
          const m = sMap["en_proceso"]?.step_metadata as Record<string, unknown> | undefined;
          if (m?.is_rescheduled === true && !sMap["en_proceso"]?.completed) {
            hasAnyRescheduled = true;
            break;
          }
        }
        if (!hasAnyRescheduled) {
          setRescheduledOsiIds((rPrev) => rPrev.filter((id) => id !== osiId));
          if (filterMode === "reagendados") {
            setOsis((oPrev) => oPrev.filter((o) => o.id_osi !== osiId));
            setTotalCount((tPrev) => Math.max(0, tPrev - 1));
          }
        }

        return newMap;
      });

      // Clear cache so both tabs reflect the restoration immediately
      moduleCache.clear();
    },
    [filterMode],
  );

  const handleBulkToggle = useCallback(
    async (osiId: number, nroSesion: number, stepKeys: string[]) => {
      for (const key of stepKeys) {
        await handleToggleStep(osiId, nroSesion, key);
      }
    },
    [handleToggleStep],
  );

  const handleExpand = useCallback(
    async (osiId: number) => {
      if (expandedOsi === osiId) {
        setExpandedOsi(null);
        return;
      }
      setExpandedOsi(osiId);

      const sessions = sessionsByOsi.get(osiId) || [];
      const nroSesion = selectedSession.get(osiId) ?? sessions[0]?.nro_sesion ?? 1;

      // Seed steps for the selected session if not present
      const osiMap = stepsByOsi.get(osiId);
      const sessionMap = osiMap?.get(nroSesion);
      if (!sessionMap || Object.keys(sessionMap).length === 0) {
        setSeeding(osiId);
        await ensureAllProcesoStepsExist(osiId, nroSesion);
        const freshMap = await getAllProcesoStepsBatch([osiId]);
        setStepsByOsi((prev) => {
          const newMap = new Map(prev);
          const fresh = freshMap.get(osiId);
          if (fresh) newMap.set(osiId, fresh);
          return newMap;
        });
        setSeeding(null);
      }
    },
    [expandedOsi, sessionsByOsi, selectedSession, stepsByOsi],
  );

  const handleSessionSelect = useCallback(
    async (osiId: number, nroSesion: number) => {
      setSelectedSession((prev) => {
        const newMap = new Map(prev);
        newMap.set(osiId, nroSesion);
        return newMap;
      });

      // Seed steps for this session if not present
      const osiMap = stepsByOsi.get(osiId);
      const sessionMap = osiMap?.get(nroSesion);
      if (!sessionMap || Object.keys(sessionMap).length === 0) {
        setSeeding(osiId);
        await ensureAllProcesoStepsExist(osiId, nroSesion);
        const freshMap = await getAllProcesoStepsBatch([osiId]);
        setStepsByOsi((prev) => {
          const newMap = new Map(prev);
          const fresh = freshMap.get(osiId);
          if (fresh) newMap.set(osiId, fresh);
          return newMap;
        });
        setSeeding(null);
      }
    },
    [stepsByOsi],
  );

  const formatDate = (dateStr: string | null | undefined) =>
    formatDateOnly(dateStr, "es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="space-y-4">
      {/* Sticky Warning Banner when there are rescheduled OSIs */}
      {rescheduledOsiIds.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 px-4 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs font-medium text-amber-900">
              Hay <span className="font-bold">{rescheduledOsiIds.length}</span> servicio(s) re-agendado(s) pendientes de reprogramación.
            </p>
          </div>
          {filterMode !== "reagendados" && (
            <button
              type="button"
              onClick={() => {
                setFilterMode("reagendados");
                setCurrentPage(1);
              }}
              className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline flex items-center gap-1 flex-shrink-0"
            >
              Ver solo re-agendados &rarr;
            </button>
          )}
        </div>
      )}

      {/* OSI List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-sm text-gray-900">
                Seguimiento de OSIs
              </h3>
              <span className="text-xs text-gray-500">
                {searchQuery.trim()
                  ? `(${totalCount} resultados)`
                  : `(${totalCount} OSIs)`}
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por OSI o empresa..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-8 pr-7 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="absolute inset-y-0 right-0 w-7 flex items-center justify-center text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick-Filter Segmented Tabs */}
        <div className="px-4 py-2.5 border-b border-gray-200/80 bg-gray-50/40 flex items-center justify-between gap-4 flex-wrap">
          <div className="inline-flex p-1 bg-gray-200/60 rounded-xl border border-gray-200/80 gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => {
                if (filterMode !== "todos") {
                  setFilterMode("todos");
                  setCurrentPage(1);
                }
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                filterMode === "todos"
                  ? "bg-white text-gray-900 shadow-xs border border-gray-200/80"
                  : "text-gray-500 hover:text-gray-900 hover:bg-white/40"
              }`}
            >
              <span>Todos los servicios</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (filterMode !== "activos") {
                  setFilterMode("activos");
                  setCurrentPage(1);
                }
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                filterMode === "activos"
                  ? "bg-white text-emerald-800 shadow-xs border border-emerald-200/80"
                  : "text-gray-500 hover:text-gray-900 hover:bg-white/40"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  filterMode === "activos" ? "bg-emerald-500" : "bg-gray-400"
                }`}
              />
              <span>Solo Activos</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (filterMode !== "reagendados") {
                  setFilterMode("reagendados");
                  setCurrentPage(1);
                }
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                filterMode === "reagendados"
                  ? "bg-white text-amber-900 shadow-xs border border-amber-200/80"
                  : "text-gray-500 hover:text-gray-900 hover:bg-white/40"
              }`}
            >
              <CalendarClock
                className={`w-3.5 h-3.5 ${
                  filterMode === "reagendados" ? "text-amber-600" : "text-gray-400"
                }`}
              />
              <span>Solo Re-agendados</span>
              {rescheduledOsiIds.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    filterMode === "reagendados"
                      ? "bg-amber-100 text-amber-800 border border-amber-300/80"
                      : "bg-gray-200/90 text-gray-700"
                  }`}
                >
                  {rescheduledOsiIds.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filter Bar — always visible */}
        {filterOptions && (
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                Filtros
                {(Object.values(filters).some((v) => v !== undefined && v !== "") || !!stepFilter) && (
                  <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                    Activos
                  </span>
                )}
              </span>
              {(Object.values(filters).some((v) => v !== undefined && v !== "") || !!stepFilter) ? (
                <button
                  onClick={() => {
                    setFilters({});
                    setStepFilter("");
                    setCurrentPage(1);
                  }}
                  className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-md hover:bg-red-100 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Limpiar
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                {/* Empresa — searchable combobox */}
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 mb-1">
                    Empresa
                  </label>
                  <div className="relative" ref={companyDropdownRef}>
                    <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 z-10" />
                    <input
                      type="text"
                      placeholder="Buscar empresa..."
                      value={localCompany}
                      onChange={(e) => {
                        setLocalCompany(e.target.value);
                        setCompanyDropdownOpen(true);
                        setCompanySelectedIndex(0);
                      }}
                      onFocus={() => setCompanyDropdownOpen(true)}
                      onKeyDown={handleCompanyKeyDown}
                      className="w-full pl-8 pr-7 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      autoComplete="off"
                    />
                    {localCompany && (
                      <button
                        type="button"
                        onClick={() => {
                          setLocalCompany("");
                          setCompanyDropdownOpen(false);
                          setFilters((prev) => ({ ...prev, companyName: undefined }));
                          setCurrentPage(1);
                        }}
                        className="absolute inset-y-0 right-0 w-7 flex items-center justify-center text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    {companyDropdownOpen && filteredCompanies.length > 0 && (
                      <div className="absolute mt-1 w-full border border-gray-300 rounded-md shadow-lg bg-white max-h-60 overflow-y-auto z-50">
                        {filteredCompanies.map((company, index) => (
                          <div
                            key={company.id_empresa}
                            onClick={() => handleCompanySelect(company.nombre_empresa)}
                            className={`px-3 py-1.5 cursor-pointer border-b border-gray-100 last:border-b-0 text-xs ${
                              index === companySelectedIndex
                                ? "bg-blue-50 text-blue-700"
                                : "hover:bg-gray-50 text-gray-900"
                            }`}
                          >
                            {company.nombre_empresa}
                          </div>
                        ))}
                      </div>
                    )}
                    {companyDropdownOpen && localCompany && filteredCompanies.length === 0 && (
                      <div className="absolute mt-1 w-full border border-gray-300 rounded-md shadow-lg bg-white z-50">
                        <div className="px-3 py-1.5 text-xs text-gray-500 text-center">
                          Sin coincidencias
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Curso / Servicio */}
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 mb-1">
                    Curso
                  </label>
                  <select
                    value={filters.servicio || ""}
                    onChange={(e) => {
                      setFilters((prev) => ({ ...prev, servicio: e.target.value || undefined }));
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Todos</option>
                    {courseOptions.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fase del proceso */}
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 mb-1">
                    Fase del proceso
                  </label>
                  <select
                    value={stepFilter}
                    onChange={(e) => setStepFilter(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Todas</option>
                    <optgroup label="Planificación">
                      {PLANIFICACION_STEPS.map((step) => (
                        <option key={step.key} value={step.key}>
                          {step.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Ejecución">
                      {EJECUCION_STEPS.map((step) => (
                        <option key={step.key} value={step.key}>
                          {step.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Ejecutivo */}
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 mb-1">
                    Ejecutivo
                  </label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <select
                      value={filters.ejecutivo || ""}
                      onChange={(e) => {
                        setFilters((prev) => ({ ...prev, ejecutivo: e.target.value || undefined }));
                        setCurrentPage(1);
                      }}
                      className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                    >
                      <option value="">Todos</option>
                      {filterOptions.ejecutivos.map((ejecutivo) => (
                        <option key={ejecutivo} value={ejecutivo}>
                          {ejecutivo}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Fecha Servicio Desde */}
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 mb-1">
                    Fecha Desde
                  </label>
                  <input
                    type="date"
                    value={filters.dateServiceFrom || ""}
                    onChange={(e) => {
                      setFilters((prev) => ({ ...prev, dateServiceFrom: e.target.value || undefined }));
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Fecha Servicio Hasta */}
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 mb-1">
                    Fecha Hasta
                  </label>
                  <input
                    type="date"
                    value={filters.dateServiceTo || ""}
                    onChange={(e) => {
                      setFilters((prev) => ({ ...prev, dateServiceTo: e.target.value || undefined }));
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredOsis.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="mt-2 text-sm text-gray-500">No se encontraron OSIs</p>
          </div>
        ) : (
          <div>
            {/* Column headers */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-gray-50/50">
              <div className="w-4 flex-shrink-0" />
              <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-[2fr_2fr_1fr_1fr_0.7fr_0.6fr] gap-2 items-center">
                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Empresa / OSI</span>
                <span className="hidden md:block text-[10px] font-bold uppercase tracking-wide text-gray-500">Servicio</span>
                <span className="hidden md:block text-[10px] font-bold uppercase tracking-wide text-gray-500">Emisión</span>
                <span className="hidden md:block text-[10px] font-bold uppercase tracking-wide text-gray-500">Ejecución</span>
                <span className="hidden md:block text-[10px] font-bold uppercase tracking-wide text-gray-500">Sesiones</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 text-right">Progreso</span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {filteredOsis.map((osi) => {
              const sessions = sessionsByOsi.get(osi.id_osi) || [];
              const hasMultipleSessions = sessions.length > 1;
              const isExpanded = expandedOsi === osi.id_osi;
              const osiStepsMap = stepsByOsi.get(osi.id_osi) || new Map();
              const currentNroSesion = selectedSession.get(osi.id_osi) ?? sessions[0]?.nro_sesion ?? 1;
              const sessionSteps: Record<string, ProcesoStepRecord> = osiStepsMap.get(currentNroSesion) || {};
              const completedCount = Object.values(sessionSteps).filter((s) => s.completed).length;

              const isAnySessionRescheduled = Array.from(osiStepsMap.values()).some((sMap) => {
                const meta = (sMap as Record<string, ProcesoStepRecord>)["en_proceso"]?.step_metadata as Record<string, unknown> | undefined;
                return meta?.is_rescheduled === true && !(sMap as Record<string, ProcesoStepRecord>)["en_proceso"]?.completed;
              });

              const currentSessionMeta = (sessionSteps["en_proceso"]?.step_metadata as Record<string, unknown> | undefined) || {};
              const isCurrentSessionRescheduled = currentSessionMeta.is_rescheduled === true && !sessionSteps["en_proceso"]?.completed;
              const unmarkReason = (currentSessionMeta.unmark_reason as string) || (sessionSteps["en_proceso"]?.notes as string) || "";

              return (
                <div key={osi.id_osi}>
                  {/* Row header — always expandable */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleExpand(osi.id_osi)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-[2fr_2fr_1fr_1fr_0.7fr_0.6fr] gap-2 items-center">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                          <Building2 className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{osi.nombre_empresa}</span>
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {osi.nro_osi}
                          </p>
                          {isAnySessionRescheduled && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <CalendarClock className="w-3 h-3 text-amber-600" />
                              Re-agendado
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="hidden md:block min-w-0">
                        <p className="text-xs text-gray-500 truncate">{osi.servicio}</p>
                      </div>
                      <div className="hidden md:block min-w-0">
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{formatDate(osi.fecha_emision)}</span>
                        </p>
                      </div>
                      <div className="hidden md:block min-w-0">
                        <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{formatDate(getNextSessionDate(sessions))}</span>
                        </p>
                      </div>
                      <div className="hidden md:flex items-center gap-1 text-xs text-gray-500 min-w-0">
                        {sessions.length > 0 ? (
                          <>
                            <Layers className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{sessions.length} {sessions.length === 1 ? "sesión" : "sesiones"}</span>
                          </>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs font-medium text-gray-500">
                          {completedCount}/{ALL_STEPS.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded view */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 bg-gray-50/30 border-t border-gray-100">
                      {/* Rescheduled warning banner if current session is rescheduled */}
                      {isCurrentSessionRescheduled && (
                        <div className="mb-3 p-3 bg-amber-50/90 border border-amber-200 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <CalendarClock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-xs min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <span className="font-bold text-amber-900">
                                  {hasMultipleSessions
                                    ? `Sesión ${currentNroSesion} Re-agendada`
                                    : "Servicio Re-agendado"}
                                </span>
                                {typeof currentSessionMeta.new_date === "string" && currentSessionMeta.new_date ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 font-semibold text-[11px]">
                                    <Calendar className="w-3 h-3 text-amber-700" />
                                    Nueva fecha: {formatDate(currentSessionMeta.new_date)}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] italic border border-amber-200">
                                    Fecha por confirmar
                                  </span>
                                )}
                              </div>
                              <div className="text-amber-800 break-words mt-0.5">
                                <span className="font-medium text-amber-900">Motivo: </span>
                                {unmarkReason || "Pendiente de reprogramación"}
                              </div>
                              {typeof currentSessionMeta.unmarked_at === "string" && (
                                <span className="block text-[10px] text-amber-700/80 mt-0.5">
                                  Registrado el {formatDate(currentSessionMeta.unmarked_at)}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestoreToActivos(osi.id_osi, currentNroSesion);
                            }}
                            className="text-xs font-semibold px-3 py-1 bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 rounded-lg transition-colors shadow-sm flex-shrink-0"
                          >
                            Restaurar a Activos
                          </button>
                        </div>
                      )}

                      {/* Session tabs (only for multi-session) */}
                      {hasMultipleSessions && (
                        <div className="mb-4">
                          <div className="inline-flex p-1 bg-gray-100/90 rounded-xl border border-gray-200/70 gap-1 flex-wrap shadow-inner">
                            {sessions.map((s) => {
                              const sesSteps = osiStepsMap.get(s.nro_sesion) || {};
                              const sesMeta = (sesSteps["en_proceso"]?.step_metadata as Record<string, unknown> | undefined) || {};
                              const isSesRescheduled = sesMeta.is_rescheduled === true && !sesSteps["en_proceso"]?.completed;
                              const isCurrent = currentNroSesion === s.nro_sesion;

                              return (
                                <button
                                  key={s.nro_sesion}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSessionSelect(osi.id_osi, s.nro_sesion ?? 1);
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                                    isCurrent
                                      ? "bg-white text-gray-900 shadow-xs border border-gray-200/80 font-semibold"
                                      : "text-gray-500 hover:text-gray-900 hover:bg-white/60"
                                  }`}
                                >
                                  <Layers className={`w-3.5 h-3.5 ${isCurrent ? "text-indigo-600" : "text-gray-400"}`} />
                                  <span>Sesión {s.nro_sesion}</span>
                                  {isSesRescheduled && (
                                    <span className="text-[9px] px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-200 rounded-md font-bold">
                                      Re-agendada
                                    </span>
                                  )}
                                  {s.fecha && (
                                    <span className={`text-[11px] flex items-center gap-1 ${isCurrent ? "text-gray-600" : "text-gray-400"}`}>
                                      <Calendar className="w-2.5 h-2.5 opacity-70" />
                                      {formatDate(s.fecha)}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {seeding === osi.id_osi ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        </div>
                      ) : (
                        <ProcesoStepsTimeline
                          osiId={osi.id_osi}
                          steps={ALL_STEPS}
                          completedSteps={sessionSteps}
                          canEdit={true}
                          onToggle={(stepKey, notes) =>
                            handleToggleStep(osi.id_osi, currentNroSesion, stepKey, notes)
                          }
                          onBulkToggle={(stepKeys) =>
                            handleBulkToggle(osi.id_osi, currentNroSesion, stepKeys)
                          }
                          onRequestUnmarkEnProceso={() =>
                            handleRequestUnmarkEnProceso(osi.id_osi)
                          }
                          onPreviewListaAsistencia={(id) =>
                            setPreviewOsi({ osiId: id, nroOsi: osi.nro_osi || "", nroSesion: currentNroSesion })
                          }
                          onPreviewCalificacion={(id) =>
                            setPreviewOsi({ osiId: id, nroOsi: osi.nro_osi || "", nroSesion: currentNroSesion, category: "hoja_calificacion", title: "Hoja de Calificación", showReceivedToggle: false })
                          }
                          onPreviewMaterialFotografico={(id) =>
                            setPreviewOsi({ osiId: id, nroOsi: osi.nro_osi || "", nroSesion: currentNroSesion, category: "material_fotografico", title: "Registro Fotográfico", showReceivedToggle: false })
                          }
                          onPreviewEncuestas={(id) =>
                            window.open(
                              `/dashboard/capacitacion/gestion-osi/${id}/survey-view?sesion=${currentNroSesion}`,
                              "_blank",
                            )
                          }
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        )}

        {/* Pagination — hidden when step-filtering (client-side filter within page); visible when searching (server-side) */}
        {!stepFilter && (
          <OSIPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
            loading={loading}
          />
        )}
      </div>

      {/* Attachment Preview Modal */}
      {previewOsi && (
        <ListaAsistenciaPreview
          osiId={previewOsi.osiId}
          nroOsi={previewOsi.nroOsi}
          nroSesion={previewOsi.nroSesion}
          isOpen={!!previewOsi}
          onClose={() => setPreviewOsi(null)}
          category={previewOsi.category}
          title={previewOsi.title}
          showReceivedToggle={previewOsi.showReceivedToggle !== false}
          onAttachmentToggled={(received) => {
            if (received) {
              handleToggleStep(previewOsi.osiId, previewOsi.nroSesion, "lista_asistencia");
            }
          }}
        />
      )}

      {/* Unmark En Proceso Modal */}
      {unmarkModal && (
        <UnmarkEnProcesoModal
          isOpen={!!unmarkModal}
          osiId={unmarkModal.osiId}
          nroOsi={unmarkModal.nroOsi}
          nroSesion={unmarkModal.nroSesion}
          onClose={() => setUnmarkModal(null)}
          onConfirm={handleConfirmUnmark}
        />
      )}
    </div>
  );
}
