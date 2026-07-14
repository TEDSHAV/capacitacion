"use client";

import { useState, useEffect, useCallback } from "react";
import type { OSIFilters, OSIManagement, OSIStatus } from "@/types";
import { getOSIsForManagement, getOSIFilterOptions } from "@/app/actions/osi";
import OSIFiltersV2 from "./components/osi-filters-v2";
import OSITableV2 from "./components/osi-table-v2";
import OSIPagination from "./components/osi-pagination";
import OSIDashboardMetrics from "./components/osi-dashboard-metrics";
import OSIDetailsModalV2 from "./components/osi-details-modal-v2";

interface GestionOSIClientProps {
  user: any;
}

export default function GestionOSIClient({ user }: GestionOSIClientProps) {
  const [loading, setLoading] = useState(true);
  const [osis, setOsis] = useState<OSIManagement[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [metrics, setMetrics] = useState({
    total_hours: 0,
    total_sesiones: 0,
    unique_companies: 0,
  });
  const [filters, setFilters] = useState<OSIFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

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

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showModal]);

  // Load filter options
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const filterOptions = await getOSIFilterOptions();
        setCompanies(filterOptions.companies);
        setEjecutivos(filterOptions.ejecutivos);
        setStatuses(filterOptions.statuses);
      } catch (error) {
        console.error("Error loading filter options:", error);
      } finally {
        setLoadingFilters(false);
      }
    };

    loadFilterOptions();
  }, []);

  // Load OSIs data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const result = await getOSIsForManagement(
          filters,
          currentPage,
          itemsPerPage,
        );

        setOsis(result.osis);
        setTotalCount(result.totalCount);
        setMetrics(
          result.metrics || {
            total_hours: 0,
            total_sesiones: 0,
            unique_companies: 0,
          },
        );
      } catch (error) {
        console.error("Error loading OSIs:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filters, currentPage, itemsPerPage]);

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

  const handleViewDetails = useCallback((osi: OSIManagement) => {
    setSelectedOSI(osi);
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setSelectedOSI(null);
  }, []);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
      <div className="mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de OSIs</h1>
          <p className="mt-1 text-sm text-gray-600">
            Visualiza y monitorea las Órdenes de Servicio de Instrucción
          </p>
        </div>
      </div>

      {/* Dashboard Metrics */}
      <OSIDashboardMetrics
        osis={osis}
        statuses={statuses}
        totalCount={totalCount}
        metrics={metrics}
        loading={loadingFilters}
      />

      {/* Filters */}
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
        statuses={statuses}
        onViewDetails={handleViewDetails}
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
        />
      )}
    </div>
  );
}
