"use client";

import { useState, useEffect } from "react";
import CertificateMetricsComponent from "./components/certificate-metrics";
import CertificateFiltersComponent from "./components/certificate-filters";
import CertificateTableComponent from "./components/certificate-table";
import CertificatePaginationComponent from "./components/certificate-pagination";
import { 
  getCertificatesForManagement, 
  getCompaniesForFilters, 
  getCoursesForFilters, 
  getFacilitatorsForFilters,
  getVenezuelanStates
} from "@/app/actions/certificados";
import { CertificateManagement, CertificateFilters, CertificateSearchResult } from "@/types";

export default function GestionCertificadosPage() {
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState<CertificateManagement[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [metrics, setMetrics] = useState<any>(null);
  const [filters, setFilters] = useState<CertificateFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // Filter options
  const [companies, setCompanies] = useState<{ id: number; razon_social: string }[]>([]);
  const [courses, setCourses] = useState<{ id: number; nombre: string }[]>([]);
  const [facilitators, setFacilitators] = useState<{ id: number; nombre_apellido: string }[]>([]);
  const [states, setStates] = useState<{ id: number; nombre_estado: string }[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  // Load filter options
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [companiesData, coursesData, facilitatorsData, statesData] = await Promise.all([
          getCompaniesForFilters(),
          getCoursesForFilters(),
          getFacilitatorsForFilters(),
          getVenezuelanStates()
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

  // Load certificates data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const result: CertificateSearchResult = await getCertificatesForManagement(
          filters,
          currentPage,
          itemsPerPage
        );
        
        setCertificates(result.certificates);
        setTotalCount(result.totalCount);
        setMetrics(result.metrics);
      } catch (error) {
        console.error("Error loading certificates:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filters, currentPage, itemsPerPage]);

  const handleFiltersChange = (newFilters: CertificateFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when items per page changes
  };

  const handleViewCertificate = (certificate: CertificateManagement) => {
    // Open certificate details view
    window.open(`/verify-certificate/${certificate.id}`, '_blank');
  };

  const handleDownloadCertificate = async (certificate: CertificateManagement) => {
    try {
      const response = await fetch(`/api/generate-certificate-pdf/${certificate.id}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `certificado_${certificate.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Error downloading certificate');
      }
    } catch (error) {
      console.error('Error downloading certificate:', error);
    }
  };

  const handleVerifyCertificate = (certificate: CertificateManagement) => {
    // Open verification page
    window.open(`/verify-certificate/${certificate.id}`, '_blank');
  };

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
        loading={loading} 
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
    </div>
  );
}
