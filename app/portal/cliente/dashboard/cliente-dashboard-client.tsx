"use client";

import { useState, useCallback, useEffect } from "react";
import { ClienteMetrics, ClienteBatchSummary, ClienteFilterOptions, ClienteCertificateFilters, ClienteCertificateRow } from "@/types";
import { getClienteCertificates, getClienteMetrics, getClienteRecentBatches } from "@/app/actions/cliente-portal";
import { ClienteMetricsCards } from "./cliente-metrics";
import { ClienteFilters } from "./cliente-filters";
import { ClienteBatches } from "./cliente-batches";
import { ClienteResults } from "./cliente-results";
import { ClientePagination } from "./cliente-pagination";
import { Loader2, FileSearch, ArrowLeft } from "lucide-react";

interface ClienteDashboardClientProps {
  empresaId: number;
  initialMetrics: ClienteMetrics;
  initialBatches: ClienteBatchSummary[];
  filterOptions: ClienteFilterOptions;
}

const DEFAULT_FILTERS: ClienteCertificateFilters = {
  type: "all",
};

export function ClienteDashboardClient({
  empresaId,
  initialMetrics,
  initialBatches,
  filterOptions,
}: ClienteDashboardClientProps) {
  const [filters, setFilters] = useState<ClienteCertificateFilters>(DEFAULT_FILTERS);
  const [metrics, setMetrics] = useState<ClienteMetrics>(initialMetrics);
  const [batches, setBatches] = useState<ClienteBatchSummary[]>(initialBatches);
  const [certificates, setCertificates] = useState<ClienteCertificateRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const itemsPerPage = 10;

  const hasActiveFilters =
    !!filters.searchTerm ||
    !!filters.courseId ||
    !!filters.stateId ||
    !!filters.dateFrom ||
    !!filters.dateTo ||
    !!filters.nroOsi;

  const loadResults = useCallback(async () => {
    setLoading(true);
    try {
      const { data, totalCount: count } = await getClienteCertificates(
        empresaId,
        filters,
        currentPage,
        itemsPerPage,
      );
      setCertificates(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error("Error loading results:", err);
    } finally {
      setLoading(false);
    }
  }, [empresaId, filters, currentPage]);

  useEffect(() => {
    if (hasActiveFilters) {
      loadResults();
    }
  }, [hasActiveFilters, loadResults]);

  const handleFilterChange = (newFilters: ClienteCertificateFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleClearFilters = async () => {
    setFilters(DEFAULT_FILTERS);
    setCurrentPage(1);
    setCertificates([]);
    setTotalCount(0);
    // Refresh batches
    const { data } = await getClienteRecentBatches(empresaId, 5);
    if (data) setBatches(data);
    const { data: metricsData } = await getClienteMetrics(empresaId);
    if (metricsData) setMetrics(metricsData);
  };

  const handleBatchClick = (batch: ClienteBatchSummary) => {
    setFilters({
      ...DEFAULT_FILTERS,
      nroOsi: batch.nro_osi,
    });
    setCurrentPage(1);
  };

  return (
    <div className="space-y-8">
      <ClienteMetricsCards metrics={metrics} />

      <ClienteFilters
        filters={filters}
        onChange={handleFilterChange}
        onClear={handleClearFilters}
        options={filterOptions}
      />

      {loading ? (
        <div className="flex flex-col items-center py-16 bg-white rounded-xl border border-gray-100">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-gray-500 mt-2">Cargando...</p>
        </div>
      ) : !hasActiveFilters ? (
        <ClienteBatches batches={batches} onBatchClick={handleBatchClick} />
      ) : (
        <>
          <button
            onClick={handleClearFilters}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Lotes
          </button>
          <ClienteResults
            certificates={certificates}
            nroOsi={filters.nroOsi}
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
      )}

      {!hasActiveFilters && batches.length === 0 && !loading && (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl py-16 flex flex-col items-center justify-center">
          <FileSearch className="w-12 h-12 text-gray-200 mb-4" />
          <p className="text-gray-500">
            No hay certificados emitidos para esta empresa aún.
          </p>
        </div>
      )}
    </div>
  );
}
