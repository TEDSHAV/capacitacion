"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ClienteMetrics, ClienteBatchSummary, ClienteFilterOptions, ClienteCertificateFilters, ClienteCertificateRow, HiddenBatchSummary } from "@/types";
import { getClienteCertificates, getClienteMetrics, getClienteBatchesFiltered, getClienteHiddenBatches } from "@/app/actions/cliente-portal";
import { cachePortalData, getCachedPortalData, isCacheFresh } from "@/lib/offline/portal-data-cache";
import { ClienteMetricsCards } from "./cliente-metrics";
import { ClienteFilters } from "./cliente-filters";
import { ClienteBatches } from "./cliente-batches";
import { ClientePagination } from "./cliente-pagination";
import { ClientePendingBatches } from "./cliente-pending-batches";
import { Loader2, FileSearch, WifiOff } from "lucide-react";

interface ClienteDashboardClientProps {
  empresaId: number;
  initialMetrics: ClienteMetrics;
  initialBatches: ClienteBatchSummary[];
  initialTotalCount: number;
  filterOptions: ClienteFilterOptions;
  showSedeFilter?: boolean;
  showCiudadFilter?: boolean;
  initialHiddenBatches?: HiddenBatchSummary[];
}

const DEFAULT_FILTERS: ClienteCertificateFilters = {
  type: "all",
};

export function ClienteDashboardClient({
  empresaId,
  initialMetrics,
  initialBatches,
  initialTotalCount,
  filterOptions,
  showSedeFilter = false,
  showCiudadFilter = false,
  initialHiddenBatches = [],
}: ClienteDashboardClientProps) {
  const [filters, setFilters] = useState<ClienteCertificateFilters>(DEFAULT_FILTERS);
  const [metrics, setMetrics] = useState<ClienteMetrics>(initialMetrics);
  const [batches, setBatches] = useState<ClienteBatchSummary[]>(initialBatches);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [hiddenBatches, setHiddenBatches] = useState<HiddenBatchSummary[]>(initialHiddenBatches);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [expandedOsi, setExpandedOsi] = useState<number | null>(null);
  const [expandedCertificates, setExpandedCertificates] = useState<ClienteCertificateRow[]>([]);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [usingCachedBatches, setUsingCachedBatches] = useState(false);
  const itemsPerPage = 10;
  const hasInitialized = useRef(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const hasActiveFilters =
    !!filters.searchTerm ||
    !!filters.courseId ||
    !!filters.cityId ||
    !!filters.sedeId ||
    !!filters.dateFrom ||
    !!filters.dateTo;

  const loadBatches = useCallback(async () => {
    setLoading(true);
    setUsingCachedBatches(false);
    try {
      const [batchRes, hiddenRes] = await Promise.all([
        getClienteBatchesFiltered(
          empresaId,
          filters,
          currentPage,
          itemsPerPage,
        ),
        getClienteHiddenBatches(empresaId),
      ]);
      setBatches(batchRes.data || []);
      setTotalCount(batchRes.totalCount || 0);
      setHiddenBatches(hiddenRes.data || []);

      // Cache the batch list for offline use
      const cacheKey = `cliente_batches_${empresaId}_p${currentPage}`;
      await cachePortalData(cacheKey, "cliente_batches", {
        batches: batchRes.data || [],
        totalCount: batchRes.totalCount || 0,
        hiddenBatches: hiddenRes.data || [],
        filters,
      });
    } catch (err) {
      console.error("Error loading batches:", err);
      // Fall back to cached data if available
      const cacheKey = `cliente_batches_${empresaId}_p${currentPage}`;
      const cached = await getCachedPortalData<{
        batches: ClienteBatchSummary[];
        totalCount: number;
        hiddenBatches: HiddenBatchSummary[];
        filters: ClienteCertificateFilters;
      }>(cacheKey);
      if (cached) {
        setBatches(cached.data.batches);
        setTotalCount(cached.data.totalCount);
        setHiddenBatches(cached.data.hiddenBatches);
        setUsingCachedBatches(true);
      }
    } finally {
      setLoading(false);
    }
  }, [empresaId, filters, currentPage]);

  const loadExpandedCertificates = useCallback(async (nroOsi: number) => {
    setExpandedLoading(true);
    const cacheKey = `cliente_certs_${empresaId}_osi_${nroOsi}`;
    try {
      const { data } = await getClienteCertificates(
        empresaId,
        { ...filters, nroOsi },
        1,
        999,
      );
      setExpandedCertificates(data || []);

      // Cache the certificates for offline use
      if (data && data.length > 0) {
        await cachePortalData(cacheKey, "cliente_certs", data);
      }
    } catch (err) {
      console.error("Error loading expanded certificates:", err);
      // Fall back to cached certificates
      const cached = await getCachedPortalData<ClienteCertificateRow[]>(cacheKey);
      if (cached) {
        setExpandedCertificates(cached.data);
      } else {
        setExpandedCertificates([]);
      }
    } finally {
      setExpandedLoading(false);
    }
  }, [empresaId, filters]);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      // Cache the initial server-rendered data so it's available offline
      const cacheKey = `cliente_batches_${empresaId}_p1`;
      cachePortalData(cacheKey, "cliente_batches", {
        batches: initialBatches,
        totalCount: initialTotalCount,
        hiddenBatches: initialHiddenBatches,
        filters: DEFAULT_FILTERS,
      });
      return;
    }
    loadBatches();
  }, [hasActiveFilters, loadBatches, currentPage, empresaId, initialBatches, initialTotalCount, initialHiddenBatches]);

  // Background prefetch: cache participant lists for visible batches so
  // they can be expanded offline without prior interaction.
  // Uses requestIdleCallback to avoid blocking the UI, fetches sequentially
  // to avoid overwhelming the server, and skips already-cached batches.
  useEffect(() => {
    if (!isOnline || batches.length === 0) return;

    let cancelled = false;

    const prefetchBatch = async (nroOsi: number) => {
      if (cancelled) return;
      const cacheKey = `cliente_certs_${empresaId}_osi_${nroOsi}`;
      // Skip if already cached (fresh within 1 hour)
      const fresh = await isCacheFresh(cacheKey, 60 * 60 * 1000);
      if (fresh || cancelled) return;
      try {
        const { data } = await getClienteCertificates(
          empresaId,
          { ...filters, nroOsi },
          1,
          999,
        );
        if (data && data.length > 0 && !cancelled) {
          await cachePortalData(cacheKey, "cliente_certs", data);
        }
      } catch {
        // Non-fatal — prefetch is best-effort
      }
    };

    const runPrefetch = async () => {
      for (const batch of batches) {
        if (cancelled) break;
        await prefetchBatch(batch.nro_osi);
      }
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    const scheduleRun = () => {
      if ("requestIdleCallback" in window) {
        (window as any).requestIdleCallback(() => {
          runPrefetch();
        }, { timeout: 5000 });
      } else {
        setTimeout(runPrefetch, 2000);
      }
    };

    scheduleRun();

    return () => {
      cancelled = true;
    };
  }, [isOnline, batches, empresaId, filters]);

  const handleFilterChange = (newFilters: ClienteCertificateFilters) => {
    setFilters({ ...newFilters, nroOsi: undefined });
    setCurrentPage(1);
    setExpandedOsi(null);
    setExpandedCertificates([]);
  };

  const handleClearFilters = async () => {
    setFilters(DEFAULT_FILTERS);
    setCurrentPage(1);
    setExpandedOsi(null);
    setExpandedCertificates([]);
    try {
      const [metricsRes, batchRes, hiddenRes] = await Promise.all([
        getClienteMetrics(empresaId),
        getClienteBatchesFiltered(
          empresaId,
          DEFAULT_FILTERS,
          1,
          itemsPerPage,
        ),
        getClienteHiddenBatches(empresaId),
      ]);
      if (metricsRes.data) setMetrics(metricsRes.data);
      setBatches(batchRes.data || []);
      setTotalCount(batchRes.totalCount || 0);
      setHiddenBatches(hiddenRes.data || []);
      setUsingCachedBatches(false);
    } catch (err) {
      // Offline — fall back to cached page 1
      const cached = await getCachedPortalData<{
        batches: ClienteBatchSummary[];
        totalCount: number;
        hiddenBatches: HiddenBatchSummary[];
      }>(`cliente_batches_${empresaId}_p1`);
      if (cached) {
        setBatches(cached.data.batches);
        setTotalCount(cached.data.totalCount);
        setHiddenBatches(cached.data.hiddenBatches);
        setUsingCachedBatches(true);
      }
    }
  };

  const handleToggleExpand = (nroOsi: number) => {
    if (expandedOsi === nroOsi) {
      setExpandedOsi(null);
      setExpandedCertificates([]);
    } else {
      setExpandedOsi(nroOsi);
      setExpandedCertificates([]);
      loadExpandedCertificates(nroOsi);
    }
  };

  return (
    <div className="space-y-8">
      <ClienteMetricsCards metrics={metrics} />

      {(!isOnline || usingCachedBatches) && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>
            {isOnline
              ? "Mostrando datos en caché — algunas funciones pueden no estar disponibles."
              : "Sin conexión — mostrando datos guardados. Los documentos descargados siguen disponibles."}
          </span>
        </div>
      )}

      {hiddenBatches.length > 0 && (
        <ClientePendingBatches batches={hiddenBatches} />
      )}

      <ClienteFilters
        filters={filters}
        onChange={handleFilterChange}
        onClear={handleClearFilters}
        options={filterOptions}
        showSedeFilter={showSedeFilter}
        showCiudadFilter={showCiudadFilter}
      />

      {loading ? (
        <div className="flex flex-col items-center py-16 bg-white rounded-xl border border-gray-100">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-gray-500 mt-2">Cargando...</p>
        </div>
      ) : batches.length > 0 ? (
        <>
          <ClienteBatches
            batches={batches}
            onToggleExpand={handleToggleExpand}
            expandedOsi={expandedOsi}
            expandedCertificates={expandedCertificates}
            expandedLoading={expandedLoading}
            title={hasActiveFilters ? "Lotes Encontrados" : "Últimos Lotes Emitidos"}
          />
          {totalCount > itemsPerPage && (
            <ClientePagination
              currentPage={currentPage}
              totalCount={totalCount}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      ) : (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl py-16 flex flex-col items-center justify-center">
          <FileSearch className="w-12 h-12 text-gray-200 mb-4" />
          <p className="text-gray-500">
            {hasActiveFilters
              ? "No se encontraron lotes con los filtros aplicados."
              : "No hay certificados emitidos para esta empresa aún."}
          </p>
        </div>
      )}
    </div>
  );
}
