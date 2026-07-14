"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import OptimizedDataProvider from "./components/osi-data-provider-optimized";
import OptimizedOSITable from "./components/osi-table-optimized";
import OSIFilters from "./components/osi-filters";
import OSIPagination from "./components/osi-pagination";
import OSIEmptyState from "./components/osi-empty-state";
import { OSI } from "@/types";

export default function OptimizedGestionDeOSIsPage() {
  const router = useRouter();

  // Memoized navigation functions
  const handleCreateNew = useCallback(() => {
    try {
      router.push("/dashboard/negocios/gestion-de-osis/new");
    } catch (error) {
      console.error("Error navigating to new OSI page:", error);
      window.location.href = "/dashboard/negocios/gestion-de-osis/new";
    }
  }, [router]);

  const handleOSIClick = useCallback((osi: OSI) => {
    router.push(`/dashboard/negocios/gestion-de-osis/${osi.nro_osi}`);
  }, [router]);

  const handleNavigateToNew = useCallback(() => {
    router.push("/dashboard/negocios/gestion-de-osis/new");
  }, [router]);

  return (
    <OptimizedDataProvider>
      {({
        osis,
        filteredOsis,
        loading,
        searchTerm,
        selectedMonth,
        selectedStatus,
        selectedLocation,
        recentFilter,
        currentPage,
        itemsPerPage,
        setSearchTerm,
        setSelectedMonth,
        setSelectedStatus,
        setSelectedLocation,
        setRecentFilter,
        setCurrentPage,
        setItemsPerPage,
        clearAllFilters,
        hasActiveFilters,
        monthOptions
      }) => {
        // Pagination calculations
        const totalPages = Math.ceil(filteredOsis.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentItems = filteredOsis.slice(startIndex, endIndex);

        if (loading) {
          return (
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Cargando...</p>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
            <OSIFilters
              searchTerm={searchTerm}
              selectedMonth={selectedMonth}
              selectedStatus={selectedStatus}
              selectedLocation={selectedLocation}
              recentFilter={recentFilter}
              onSearchChange={setSearchTerm}
              onMonthChange={setSelectedMonth}
              onStatusChange={setSelectedStatus}
              onLocationChange={setSelectedLocation}
              onRecentChange={setRecentFilter}
              onClearFilters={clearAllFilters}
              onCreateNew={handleCreateNew}
              monthOptions={monthOptions}
              hasActiveFilters={hasActiveFilters}
            />

            {/* OSI List */}
            {filteredOsis.length === 0 ? (
              <OSIEmptyState
                hasFilters={hasActiveFilters}
                onClearFilters={clearAllFilters}
                onCreateNew={handleNavigateToNew}
              />
            ) : (
              <>
                <OptimizedOSITable
                  osis={currentItems}
                  onOSIClick={handleOSIClick}
                  getStatusColor={() => ''} // This will be handled internally
                />

                <OSIPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  itemsPerPage={itemsPerPage}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  totalItems={filteredOsis.length}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                />
              </>
            )}
          </div>
        );
      }}
    </OptimizedDataProvider>
  );
}
