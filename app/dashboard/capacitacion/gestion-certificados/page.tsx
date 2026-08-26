"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CachedDataBanner } from "@/components/CachedDataBanner";
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
import { useSwrCachedData } from "@/lib/offline/use-swr-cached-data";
import {
  CertificateManagement,
  CertificateFilters,
  CertificateSearchResult,
} from "@/types";

export default function GestionCertificadosPage() {
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

  // Load filter options with SWR
  const filtersCacheKey = "dash_cert_filters";
  const {
    data: filtersData,
    loading: loadingFilters,
    fromCache: filtersCached,
    cachedAt: filtersCachedAt,
    reload: reloadFilters,
  } = useSwrCachedData(
    filtersCacheKey,
    "dash_cert_filters",
    async () => {
      const [companiesData, coursesData, facilitatorsData, statesData] =
        await Promise.all([
          getCompaniesForFilters(),
          getCoursesForFilters(),
          getFacilitatorsForFilters(),
          getVenezuelanStates(),
        ]);
      return { companiesData, coursesData, facilitatorsData, statesData };
    },
    [],
  );

  // Update state when filter data loads
  useEffect(() => {
    if (filtersData) {
      setCompanies(filtersData.companiesData);
      setCourses(filtersData.coursesData);
      setFacilitators(filtersData.facilitatorsData);
      setStates(filtersData.statesData);
    }
  }, [filtersData]);

  // Load certificates data with SWR
  const certsCacheKey = `dash_certs_${JSON.stringify(filters)}_p${currentPage}_n${itemsPerPage}`;
  const {
    data: certsData,
    loading: certsLoading,
    fetching: certsFetching,
    fromCache: certsCached,
    cachedAt: certsCachedAt,
    reload: reloadCerts,
  } = useSwrCachedData(
    certsCacheKey,
    "dash_certs",
    () => getCertificatesForManagement(filters, currentPage, itemsPerPage),
    [filters, currentPage, itemsPerPage],
  );

  const certificates = certsData?.certificates || [];
  const totalCount = certsData?.totalCount || 0;

  const handleFiltersChange = useCallback((newFilters: CertificateFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
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
      const result = await updateCertificateScoreAction(certificateId, newScore);
      // Reload data after score update
      reloadCerts();
      return result;
    },
    [reloadCerts],
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

      {certsCached && <div className="mb-4"><CachedDataBanner cachedAt={certsCachedAt} /></div>}
      {certsFetching && (
        <div className="mb-4 text-sm text-gray-500 flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          Actualizando...
        </div>
      )}

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
        loading={certsLoading}
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
          loading={certsLoading}
        />
      </div>

      {/* Batch Edit Modal */}
      <BatchEditModal
        isOpen={isBatchEditOpen}
        onClose={() => setIsBatchEditOpen(false)}
        onSuccess={reloadCerts}
        initialOsi={
          filters.searchTerm && /^\d+$/.test(filters.searchTerm)
            ? filters.searchTerm
            : ""
        }
      />
    </div>
  );
}
