"use client";

import { useRouter } from "next/navigation";
import React, { useCallback } from "react";
import LoadingSpinner from '@/components/ui/loading-spinner'
import { OSI } from "@/types";
import OSIFilters from "./components/osi-filters";
import OSITable from "./components/osi-table";
import VirtualizedTable from "./components/VirtualizedTable";
import OSIPagination from "./components/osi-pagination";
import OSIEmptyState from "./components/osi-empty-state";

// Import server action components
import OSIDataProviderWrapper from "./osi-provider-wrapper";

export default function GestionDeOSIsPage() {
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
    <OSIDataProviderWrapper>
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
        monthOptions,
        totalPages,
        startIndex,
        endIndex,
        currentItems
      }: any) => {
        if (loading) {
          return <LoadingSpinner message="Cargando..." color="blue" />;
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
                {/* Use virtualized table for large datasets, regular table for smaller ones */}
                {currentItems.length > 50 ? (
                  <VirtualizedTable
                    osis={currentItems}
                    onOSIClick={handleOSIClick}
                  />
                ) : (
                  <OSITable
                    osis={currentItems}
                    onOSIClick={handleOSIClick}
                    getStatusColor={() => ''} // This will be handled internally
                  />
                )}

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
    </OSIDataProviderWrapper>
  );
}
