"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import type { OSIFilters, OSIManagement, OSIStatus } from "@/types";
import { getOSIsForManagement, getOSIFilterOptions, getManualOSIBatchesAction } from "@/app/actions/osi";
import { CachedDataBanner } from "@/components/CachedDataBanner";
import { cachePortalData, getCachedPortalData } from "@/lib/offline/portal-data-cache";
import OSIFiltersV2 from "./components/osi-filters-v2";
import OSITableV2 from "./components/osi-table-v2";
import OSIPagination from "./components/osi-pagination";
import OSIDetailsModalV2 from "./components/osi-details-modal-v2";
import OSISurveyModal from "./components/osi-survey-modal";
import AssignFacilitadorModal from "./components/assign-facilitador-modal";
import { getSessionCount } from "@/lib/osi-utils";

interface GestionOSIClientProps {
  user: any;
}

// --- Module-level cache (survives navigation) ---
type CacheKey = string;
interface CacheEntry {
  osis: OSIManagement[];
  totalCount: number;
  timestamp: number;
}
const moduleCache = new Map<CacheKey, CacheEntry>();
const FRESH_MS = 60_000;
const MAX_CACHE = 20;

function cacheKey(filters: OSIFilters, page: number, itemsPerPage: number, tab: string): CacheKey {
  return JSON.stringify({ ...filters, page, itemsPerPage, tab });
}

export default function GestionOSIClient({ user }: GestionOSIClientProps) {
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [osis, setOsis] = useState<OSIManagement[]>([]);
  const [totalCount, setTotalCount] = useState(0);
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
  >([]);
  const [ejecutivos, setEjecutivos] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<OSIStatus[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

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
  const filtersLoadedRef = useRef(false);

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
      if (Date.now() - cached.timestamp < FRESH_MS) {
        setLoading(false);
        setFetching(false);
        if (!filtersLoadedRef.current) setLoadingFilters(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, currentPage, itemsPerPage, activeTab]);

  // --- Async fetch: runs after paint, only if data is stale or missing ---
  useEffect(() => {
    let cancelled = false;

    const key = cacheKey(filters, currentPage, itemsPerPage, activeTab);
    const cached = getCached(key);

    // If we have fresh cached data, skip the fetch entirely.
    if (cached && Date.now() - cached.timestamp < FRESH_MS) {
      return;
    }

    const isInitialLoad = !filtersLoadedRef.current;
    const hasExistingData = osis.length > 0;

    if (cached) {
      setLoading(false);
      setFetching(true);
    } else if (hasExistingData || !isInitialLoad) {
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

        // Always load OSI data
        promises.push(
          activeTab === "automatic"
            ? getOSIsForManagement(filters, currentPage, itemsPerPage)
            : getManualOSIBatchesAction(filters, currentPage, itemsPerPage)
        );

        // Only load filter options on initial mount (not on filter/page changes)
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
  }, [filters, currentPage, itemsPerPage, activeTab]);

  // --- Prefetch next page in the background ---
  useEffect(() => {
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
          ? await getOSIsForManagement(filters, nextPage, itemsPerPage)
          : await getManualOSIBatchesAction(filters, nextPage, itemsPerPage);
        if (cancelled) return;
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
  }, [currentPage, totalCount, itemsPerPage, filters, activeTab]);

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
      {fromCache && <div className="mb-4"><CachedDataBanner cachedAt={cachedAt} /></div>}
      <div className="mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Consulta de OSIs</h1>
          <p className="mt-1 text-sm text-gray-600">
            Visualiza y monitorea las Órdenes de Servicio Interna
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="mt-4 sm:mt-6 flex justify-start">
          <div className="inline-flex p-1 bg-gray-100 rounded-xl overflow-x-auto max-w-full">
            <button
              onClick={() => {
                setActiveTab("automatic");
                setCurrentPage(1);
              }}
              className={`
                whitespace-nowrap py-2 px-4 sm:px-6 rounded-lg font-medium text-sm transition-all duration-200
                ${activeTab === "automatic"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"}
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
                whitespace-nowrap mx-1 sm:mx-2 py-2 px-4 sm:px-6 rounded-lg font-medium text-sm transition-all duration-200
                ${activeTab === "manual"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"}
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
        />
      )}
    </div>
  );
}
