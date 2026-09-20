"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { RefreshCw } from "lucide-react";
import type { OSIFilters, OSIManagement, OSIStatus } from "@/types";
import { getOSIsForGestionOSI, getOSIFilterOptions, getManualOSIBatchesAction } from "@/app/actions/osi";
import { CachedDataBanner } from "@/components/CachedDataBanner";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { cachePortalData, getCachedPortalData } from "@/lib/offline/portal-data-cache";
import OSIFiltersV2 from "./components/osi-filters-v2";
import OSITableV2 from "./components/osi-table-v2";
import OSIPagination from "./components/osi-pagination";
import OSIDetailsModalV2 from "./components/osi-details-modal-v2";
import OSISurveyModal from "./components/osi-survey-modal";
import AssignFacilitadorModal from "./components/assign-facilitador-modal";
import { getSessionCount } from "@/lib/osi-utils";

interface FilterOptions {
  companies: { id_empresa: number; nombre_empresa: string }[];
  ejecutivos: string[];
  statuses: OSIStatus[];
}

interface GestionOSIClientProps {
  user: any;
  initialOsis?: OSIManagement[];
  initialTotalCount?: number;
  initialFilterOptions?: FilterOptions;
}

// --- Module-level cache (survives navigation) ---
type CacheKey = string;
interface CacheEntry {
  osis: OSIManagement[];
  totalCount: number;
  timestamp: number;
}
const moduleCache = new Map<CacheKey, CacheEntry>();
const MAX_CACHE = 20;
const STALE_TIME_MS = 30_000; // 30 seconds freshness window

export function clearGestionOsiCache(): void {
  moduleCache.clear();
}

function cacheKey(filters: OSIFilters, page: number, itemsPerPage: number, tab: string): CacheKey {
  return JSON.stringify({ ...filters, page, itemsPerPage, tab });
}

export default function GestionOSIClient({
  user,
  initialOsis,
  initialTotalCount,
  initialFilterOptions,
}: GestionOSIClientProps) {
  const isOnline = useOnlineStatus();
  const [loading, setLoading] = useState(!initialOsis);
  const [fetching, setFetching] = useState(false);
  const [osis, setOsis] = useState<OSIManagement[]>(initialOsis || []);
  const [totalCount, setTotalCount] = useState(initialTotalCount || 0);
  const [filters, setFilters] = useState<OSIFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [activeTab, setActiveTab] = useState<"automatic" | "manual">("automatic");

  // Offline state
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);

  // Filter options
  const [companies, setCompanies] = useState<
    { id_empresa: number; nombre_empresa: string }[]
  >(initialFilterOptions?.companies || []);
  const [ejecutivos, setEjecutivos] = useState<string[]>(initialFilterOptions?.ejecutivos || []);
  const [statuses, setStatuses] = useState<OSIStatus[]>(initialFilterOptions?.statuses || []);
  const [loadingFilters, setLoadingFilters] = useState(!initialFilterOptions);

  // Selected OSI for details modal
  const [selectedOSI, setSelectedOSI] = useState<OSIManagement | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalSection, setModalSection] = useState<"info" | "documents">(
    "info",
  );

  // Survey Modal state
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [surveyOSI, setSurveyOSI] = useState<OSIManagement | null>(null);

  // Assign Facilitador Modal state
  const [showAssignFacilitadorModal, setShowAssignFacilitadorModal] = useState(false);
  const [assignFacilitadorOSI, setAssignFacilitadorOSI] = useState<OSIManagement | null>(null);

  // Track if filters have been loaded (for initial load detection)
  const filtersLoadedRef = useRef(Boolean(initialFilterOptions));
  const isFirstRender = useRef(true);

  // Seed moduleCache with initial SSR data if present
  if (initialOsis && initialOsis.length > 0) {
    const initialKey = cacheKey({}, 1, 20, "automatic");
    if (!moduleCache.has(initialKey)) {
      moduleCache.set(initialKey, {
        osis: initialOsis,
        totalCount: initialTotalCount ?? initialOsis.length,
        timestamp: Date.now(),
      });
    }
  }

  // Cache initial RSC data to Dexie for offline use
  useEffect(() => {
    if (initialOsis && initialOsis.length > 0) {
      const initialKey = cacheKey({}, 1, 20, "automatic");
      cachePortalData(initialKey, "dash_osis", {
        osis: initialOsis,
        totalCount: initialTotalCount ?? initialOsis.length,
      }).catch(() => {});
    }
    if (initialFilterOptions) {
      cachePortalData("dash_osi_filters", "dash_osi_filters", initialFilterOptions).catch(() => {});
    }
  }, [initialOsis, initialTotalCount, initialFilterOptions]);

  // Trigger manual or post-mutation refresh
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const refreshData = useCallback(() => {
    moduleCache.clear();
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const getCached = useCallback((key: CacheKey): CacheEntry | null => {
    return moduleCache.get(key) || null;
  }, []);

  const setCached = useCallback((key: CacheKey, entry: CacheEntry) => {
    moduleCache.set(key, entry);
    if (moduleCache.size > MAX_CACHE) {
      const firstKey = moduleCache.keys().next().value;
      if (firstKey) moduleCache.delete(firstKey);
    }
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showModal || showSurveyModal || showAssignFacilitadorModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showModal, showSurveyModal, showAssignFacilitadorModal]);

  // --- Sync cache swap: runs before paint so cached data appears instantly ---
  useLayoutEffect(() => {
    const key = cacheKey(filters, currentPage, itemsPerPage, activeTab);
    const cached = getCached(key);
    if (cached) {
      setOsis(cached.osis);
      setTotalCount(cached.totalCount);
      setLoading(false);
      setFetching(true);
      if (!filtersLoadedRef.current) setLoadingFilters(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, currentPage, itemsPerPage, activeTab, refreshTrigger]);

  // --- Async fetch: runs after paint, revalidating with fresh server data ---
  useEffect(() => {
    // If initial SSR data was provided, skip the very first client-side mount fetch
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (initialOsis && initialOsis.length > 0) {
        return;
      }
    }

    let cancelled = false;

    const key = cacheKey(filters, currentPage, itemsPerPage, activeTab);
    const cached = getCached(key);

    // If cache entry is fresh (< 30s old) and this is not a manual force-refresh, skip network call
    const isFresh = cached && (Date.now() - cached.timestamp < STALE_TIME_MS);
    if (isFresh && refreshTrigger === 0) {
      setOsis(cached.osis);
      setTotalCount(cached.totalCount);
      setLoading(false);
      setFetching(false);
      return;
    }

    const isInitialLoad = !filtersLoadedRef.current;
    const hasExistingData = osis.length > 0;

    if (cached || hasExistingData) {
      setLoading(false);
      setFetching(true);
    } else {
      setLoading(true);
      setFetching(false);
    }

    if (isInitialLoad) setLoadingFilters(true);

    const loadAll = async () => {
      try {
        const promises: Promise<any>[] = [];

        // Always load OSI data (getOSIsForGestionOSI already includes certificado_impreso)
        promises.push(
          activeTab === "automatic"
            ? getOSIsForGestionOSI(filters, currentPage, itemsPerPage)
            : getManualOSIBatchesAction(filters, currentPage, itemsPerPage)
        );

        // Only load filter options on initial mount if not already loaded
        if (isInitialLoad) {
          promises.push(getOSIFilterOptions());
        }

        const results = await Promise.all(promises);

        if (cancelled) return;

        const dataResult = results[0];

        setOsis(dataResult.osis);
        setTotalCount(dataResult.totalCount);
        setFromCache(false);
        setCachedAt(null);
        setCached(key, {
          osis: dataResult.osis,
          totalCount: dataResult.totalCount,
          timestamp: Date.now(),
        });

        // Persist to Dexie for offline access
        cachePortalData(key, "dash_osis", dataResult).catch(() => {});

        if (isInitialLoad && results[1]) {
          const filterOptions = results[1];
          setCompanies(filterOptions.companies);
          setEjecutivos(filterOptions.ejecutivos);
          setStatuses(filterOptions.statuses);
          filtersLoadedRef.current = true;
          // Cache filter options too
          cachePortalData("dash_osi_filters", "dash_osi_filters", filterOptions).catch(() => {});
        }
      } catch (error) {
        console.error("Error loading OSI data:", error);
        // Try to load from Dexie cache on error
        if (!cached) {
          try {
            const cachedData = await getCachedPortalData<{ osis: OSIManagement[]; totalCount: number }>(key);
            if (cachedData) {
              setOsis(cachedData.data.osis);
              setTotalCount(cachedData.data.totalCount);
              setFromCache(true);
              setCachedAt(cachedData.cachedAt);
            }
          } catch {
            // Offline cache also failed, show error
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setFetching(false);
          setLoadingFilters(false);
        }
      }
    };

    loadAll();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, currentPage, itemsPerPage, activeTab, refreshTrigger]);

  // --- Prefetch next page in the background ---
  useEffect(() => {
    if (loading || fetching) return;
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    if (currentPage >= totalPages) return;
    const nextPage = currentPage + 1;
    const nextKey = cacheKey(filters, nextPage, itemsPerPage, activeTab);
    if (getCached(nextKey)) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        const result = activeTab === "automatic"
          ? await getOSIsForGestionOSI(filters, nextPage, itemsPerPage)
          : await getManualOSIBatchesAction(filters, nextPage, itemsPerPage);
        if (cancelled) return;
        // getOSIsForGestionOSI already includes certificado_impreso
        setCached(nextKey, {
          osis: result.osis,
          totalCount: result.totalCount,
          timestamp: Date.now(),
        });
      } catch {
        // Prefetch failure is non-fatal.
      }
    }, 300);

    return () => { cancelled = true; clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, totalCount, itemsPerPage, filters, activeTab, loading, fetching]);

  const handleFiltersChange = useCallback((newFilters: OSIFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when items per page changes
  }, []);

  const handleViewDetails = useCallback(
    (osi: OSIManagement, section: "info" | "documents" = "info") => {
      setSelectedOSI(osi);
      setModalSection(section);
      setShowModal(true);
    },
    [],
  );

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setSelectedOSI(null);
  }, []);

  const handleSurvey = useCallback((osi: OSIManagement) => {
    setSurveyOSI(osi);
    setShowSurveyModal(true);
  }, []);

  const handleCloseSurveyModal = useCallback(() => {
    setShowSurveyModal(false);
    setSurveyOSI(null);
  }, []);

  const handleAssignFacilitador = useCallback((osi: OSIManagement) => {
    setAssignFacilitadorOSI(osi);
    setShowAssignFacilitadorModal(true);
  }, []);

  const handleCloseAssignFacilitadorModal = useCallback(() => {
    setShowAssignFacilitadorModal(false);
    setAssignFacilitadorOSI(null);
  }, []);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8 bg-white">
      {fromCache && <div className="mb-4"><CachedDataBanner cachedAt={cachedAt} isOnline={isOnline} /></div>}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Consulta de OSIs</h1>
            <p className="mt-1 text-sm text-gray-600">
              Visualiza y monitorea las Órdenes de Servicio Interna
            </p>
          </div>
          <button
            type="button"
            onClick={refreshData}
            disabled={fetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 transition-colors shadow-sm cursor-pointer"
            title="Actualizar lista de OSIs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin text-blue-600" : "text-gray-500"}`} />
            <span className="hidden sm:inline">{fetching ? "Actualizando..." : "Actualizar"}</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="mt-4 sm:mt-6 flex justify-start">
          <div className="inline-flex p-1 bg-gray-100/90 rounded-xl border border-gray-200/70 overflow-x-auto max-w-full gap-1 shadow-inner">
            <button
              onClick={() => {
                setActiveTab("automatic");
                setCurrentPage(1);
              }}
              className={`
                whitespace-nowrap py-2 px-4 sm:px-6 rounded-lg font-semibold text-sm transition-all duration-150
                ${activeTab === "automatic"
                  ? "bg-white text-gray-900 shadow-xs border border-gray-200/80"
                  : "text-gray-500 hover:text-gray-900 hover:bg-white/50"}
              `}
            >
              OSIs
            </button>
            <button
              onClick={() => {
                setActiveTab("manual");
                setCurrentPage(1);
              }}
              className={`
                whitespace-nowrap py-2 px-4 sm:px-6 rounded-lg font-semibold text-sm transition-all duration-150
                ${activeTab === "manual"
                  ? "bg-white text-gray-900 shadow-xs border border-gray-200/80"
                  : "text-gray-500 hover:text-gray-900 hover:bg-white/50"}
              `}
            >
              <span className="sm:hidden">Manuales</span>
              <span className="hidden sm:inline">OSIs Ingresadas Manualmente</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters — never disabled during background fetches */}
      <OSIFiltersV2
        filters={filters}
        onFiltersChange={handleFiltersChange}
        companies={companies}
        ejecutivos={ejecutivos}
        statuses={statuses}
        loading={loadingFilters}
      />

      {/* OSI Table */}
      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mb-2">
        <span className="inline-block w-1 h-3 bg-green-500 rounded-sm" />
        <span>Certificados emitidos</span>
      </div>
      <OSITableV2
        osis={osis}
        loading={loading}
        fetching={fetching}
        statuses={statuses}
        onViewDetails={handleViewDetails}
        onSurvey={handleSurvey}
        onAssignFacilitador={handleAssignFacilitador}
      />

      {/* Pagination */}
      <div className="mt-6">
        <OSIPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
          loading={loading}
        />
      </div>

      {/* Details Modal */}
      {showModal && (
        <OSIDetailsModalV2
          osi={selectedOSI}
          onClose={handleCloseModal}
          statuses={statuses}
          initialSection={modalSection}
        />
      )}

      {/* Survey Modal */}
      {showSurveyModal && (
        <OSISurveyModal
          osi={surveyOSI}
          sessionCount={surveyOSI ? getSessionCount(surveyOSI) : 1}
          onClose={handleCloseSurveyModal}
        />
      )}

      {/* Assign Facilitador Modal */}
      {showAssignFacilitadorModal && assignFacilitadorOSI && (
        <AssignFacilitadorModal
          osiId={assignFacilitadorOSI.id_osi}
          osiNumber={assignFacilitadorOSI.nro_osi}
          osiCompany={assignFacilitadorOSI.nombre_empresa}
          sessionCount={getSessionCount(assignFacilitadorOSI)}
          onClose={handleCloseAssignFacilitadorModal}
          onSuccess={refreshData}
        />
      )}
    </div>
  );
}
