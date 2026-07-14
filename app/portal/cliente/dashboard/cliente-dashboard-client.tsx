"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ClienteMetrics, ClienteBatchSummary, ClienteFilterOptions, ClienteCertificateFilters, ClienteCertificateRow } from "@/types";
import { getClienteCertificates, getClienteMetrics, getClienteBatchesFiltered } from "@/app/actions/cliente-portal";
import { ClienteMetricsCards } from "./cliente-metrics";
import { ClienteFilters } from "./cliente-filters";
import { ClienteBatches } from "./cliente-batches";
import { ClientePagination } from "./cliente-pagination";
import { Loader2, FileSearch } from "lucide-react";

interface ClienteDashboardClientProps {
  empresaId: number;
  initialMetrics: ClienteMetrics;
  initialBatches: ClienteBatchSummary[];
  initialTotalCount: number;
  filterOptions: ClienteFilterOptions;
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
}: ClienteDashboardClientProps) {
  const [filters, setFilters] = useState<ClienteCertificateFilters>(DEFAULT_FILTERS);
  const [metrics, setMetrics] = useState<ClienteMetrics>(initialMetrics);
  const [batches, setBatches] = useState<ClienteBatchSummary[]>(initialBatches);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [expandedOsi, setExpandedOsi] = useState<number | null>(null);
  const [expandedCertificates, setExpandedCertificates] = useState<ClienteCertificateRow[]>([]);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const itemsPerPage = 10;
  const hasInitialized = useRef(false);

  const hasActiveFilters =
    !!filters.searchTerm ||
    !!filters.courseId ||
    !!filters.stateId ||
    !!filters.cityId ||
    !!filters.dateFrom ||
    !!filters.dateTo;

  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      const { data, totalCount: count } = await getClienteBatchesFiltered(
        empresaId,
        filters,
        currentPage,
        itemsPerPage,
      );
      setBatches(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error("Error loading batches:", err);
    } finally {
      setLoading(false);
    }
  }, [empresaId, filters, currentPage]);

  const loadExpandedCertificates = useCallback(async (nroOsi: number) => {
    setExpandedLoading(true);
    try {
      const { data } = await getClienteCertificates(
        empresaId,
        { ...filters, nroOsi },
        1,
        999,
      );
      setExpandedCertificates(data || []);
    } catch (err) {
      console.error("Error loading expanded certificates:", err);
    } finally {
      setExpandedLoading(false);
    }
  }, [empresaId, filters]);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      return;
    }
    loadBatches();
  }, [hasActiveFilters, loadBatches, currentPage]);

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
    const { data: metricsData } = await getClienteMetrics(empresaId);
    if (metricsData) setMetrics(metricsData);
    const { data, totalCount: count } = await getClienteBatchesFiltered(
      empresaId,
      DEFAULT_FILTERS,
      1,
      itemsPerPage,
    );
    setBatches(data || []);
    setTotalCount(count || 0);
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
