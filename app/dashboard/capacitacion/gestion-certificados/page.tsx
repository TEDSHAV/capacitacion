"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import CertificateMetricsComponent from "./components/certificate-metrics";
import CertificateFiltersComponent from "./components/certificate-filters";
import CertificateTableComponent from "./components/certificate-table";
import CertificatePaginationComponent from "./components/certificate-pagination";
import { BatchEditModal } from "./components/batch-edit-modal";
import {
  getCertificatesForManagement,
  getCompaniesForFilters,
  getCoursesForFilters,
  getFacilitatorsForFilters,
  getVenezuelanStates,
  updateCertificateScoreAction,
} from "@/app/actions/certificados";
import {
  CertificateManagement,
  CertificateFilters,
  CertificateSearchResult,
} from "@/types";

export default function GestionCertificadosPage() {
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState<CertificateManagement[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [metrics, setMetrics] = useState<any>(null);
  const [filters, setFilters] = useState<CertificateFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);

  // Filter options
  const [companies, setCompanies] = useState<
    { id: number; razon_social: string }[]
  >([]);
  const [courses, setCourses] = useState<{ id: number; nombre: string }[]>([]);
  const [facilitators, setFacilitators] = useState<
    { id: number; nombre_apellido: string }[]
  >([]);
  const [states, setStates] = useState<{ id: number; nombre_estado: string }[]>(
    [],
  );
  const [loadingFilters, setLoadingFilters] = useState(true);

  // Load filter options
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [companiesData, coursesData, facilitatorsData, statesData] =
          await Promise.all([
            getCompaniesForFilters(),
            getCoursesForFilters(),
            getFacilitatorsForFilters(),
            getVenezuelanStates(),
          ]);

        setCompanies(companiesData);
        setCourses(coursesData);
        setFacilitators(facilitatorsData);
        setStates(statesData);
      } catch (error) {
        console.error("Error loading filter options:", error);
      } finally {
        setLoadingFilters(false);
      }
    };

    loadFilterOptions();
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const result: CertificateSearchResult =
        await getCertificatesForManagement(
          filters,
          currentPage,
          itemsPerPage,
        );

      setCertificates(result.certificates);
      setTotalCount(result.totalCount);
      setMetrics(result.metrics);
    } catch (error) {
      console.error("Error loading certificates:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, itemsPerPage]);

  // Load certificates data
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFiltersChange = useCallback((newFilters: CertificateFilters) => {
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

  const handleViewCertificate = useCallback(
    (certificate: CertificateManagement) => {
      // Open certificate details view
      window.open(`/verify-certificate/${certificate.id}`, "_blank");
    },
    [],
  );

  const handleDownloadCertificate = useCallback(
    async (certificate: CertificateManagement) => {
      try {
        const response = await fetch(
          `/api/generate-certificate-pdf/${certificate.id}`,
        );
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.style.display = "none";
          a.href = url;
          a.download = `certificado_${certificate.id}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          console.error("Error downloading certificate");
        }
      } catch (error) {
        console.error("Error downloading certificate:", error);
      }
    },
    [],
  );

  const handleVerifyCertificate = useCallback(
    (certificate: CertificateManagement) => {
      // Open verification page
      window.open(`/verify-certificate/${certificate.id}`, "_blank");
    },
    [],
  );

  const handleEditCertificate = useCallback(
    (certificate: CertificateManagement) => {
      // Redirect to generation page with edit mode
      window.location.href = `/dashboard/capacitacion/generacion-certificado?editId=${certificate.id}`;
    },
    [],
  );

  const handleScoreUpdate = useCallback(
    async (certificateId: number, newScore: number) => {
      return await updateCertificateScoreAction(certificateId, newScore);
    },
    [],
  );

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Gestión de Certificados
        </h1>
        <p className="mt-2 text-gray-600">
          Administra los certificados emitidos y su historial
        </p>
      </div>

      {/* Metrics Dashboard */}
      <CertificateMetricsComponent
        metrics={metrics || {}}
        loading={loading && !metrics}
      />

      {/* Filters */}
      <CertificateFiltersComponent
        filters={filters}
        onFiltersChange={handleFiltersChange}
        companies={companies}
        courses={courses}
        facilitators={facilitators}
        states={states}
        loading={loadingFilters}
      />

      {/* Certificate Table */}
      <CertificateTableComponent
        certificates={certificates}
        loading={loading}
        onViewCertificate={handleViewCertificate}
        onDownloadCertificate={handleDownloadCertificate}
        onVerifyCertificate={handleVerifyCertificate}
        onEditCertificate={handleEditCertificate}
        onScoreUpdate={handleScoreUpdate}
        headerActions={
          <Button
            onClick={() => setIsBatchEditOpen(true)}
            className="!bg-transparent border !border-blue-200 !text-blue-600 hover:!bg-blue-50 hover:!border-blue-300 font-bold w-32 py-1 rounded-md shadow-none flex items-center justify-center transition-all hover:scale-[1.02] active:scale-[0.98] text-xs"
          >
            Edición por Lote
          </Button>
        }
      />

      {/* Pagination */}
      <div className="mt-6">
        <CertificatePaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
          loading={loading}
        />
      </div>

      {/* Batch Edit Modal */}
      <BatchEditModal
        isOpen={isBatchEditOpen}
        onClose={() => setIsBatchEditOpen(false)}
        onSuccess={loadData}
        initialOsi={
          filters.searchTerm && /^\d+$/.test(filters.searchTerm)
            ? filters.searchTerm
            : ""
        }
      />
    </div>
  );
}
