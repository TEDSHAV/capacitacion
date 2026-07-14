"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { OSI } from "@/types";
import OSIFilters from "./components/osi-filters";
import OSITable from "./components/osi-table";
import OSIPagination from "./components/osi-pagination";
import OSIEmptyState from "./components/osi-empty-state";

export default function GestionDeOSIsPage() {
  const router = useRouter();
  const [osis, setOsis] = useState<OSI[]>([]);
  const [filteredOsis, setFilteredOsis] = useState<OSI[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [recentFilter, setRecentFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        // Fetch all users to create a lookup map for executive names
        const { data: usersData, error: usersError } = await supabase
          .from("usuarios")
          .select("id, nombre_apellido");

        // Create a map of user ID to name
        const executiveMap = new Map(
          usersData?.map((user) => [user.id, user.nombre_apellido]) || []
        );

        // Fetch OSI data from Supabase (most recent active OSIs)
        const { data: osiData, error } = await supabase
          .from("osi")
          .select("*")
          .eq("is_active", true)
          .order("fecha_emision", { ascending: false })
          .limit(100); // Fetch more to allow for filtering and pagination

        // Map executive names to OSI data
        const osiDataWithExecutiveNames = osiData?.map(osi => ({
          ...osi,
          executive_name: executiveMap.get(osi.ejecutivo_negocios)
        }));

        setOsis(osiDataWithExecutiveNames || []);
        setFilteredOsis(osiDataWithExecutiveNames || []);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (!session?.user) {
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Filter OSIs based on search term and other filters
  useEffect(() => {
    let filtered = [...osis];

    // Search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (osi) =>
          (osi.nro_osi &&
            osi.nro_osi.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (osi.cliente_nombre_empresa &&
            osi.cliente_nombre_empresa
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          (osi.tipo_servicio &&
            osi.tipo_servicio
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          (osi.nro_presupuesto &&
            osi.nro_presupuesto
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          (osi.tema &&
            osi.tema.toLowerCase().includes(searchTerm.toLowerCase())),
      );
    }

    // Month filter
    if (selectedMonth) {
      filtered = filtered.filter((osi) => {
        if (!osi.fecha_emision) return false;
        const osiDate = new Date(osi.fecha_emision);
        const monthYear = `${osiDate.getFullYear()}-${String(osiDate.getMonth() + 1).padStart(2, "0")}`;
        return monthYear === selectedMonth;
      });
    }

    // Status filter
    if (selectedStatus) {
      filtered = filtered.filter((osi) => {
        if (selectedStatus === "active") {
          return osi.estado === "active" || osi.estado === "activo";
        }
        return osi.estado === selectedStatus;
      });
    }

    // Location filter
    if (selectedLocation) {
      filtered = filtered.filter((osi) => {
        const locationMatch =
          (osi.direccion_ejecucion &&
            osi.direccion_ejecucion
              .toLowerCase()
              .includes(selectedLocation.toLowerCase())) ||
          (osi.direccion_envio &&
            osi.direccion_envio
              .toLowerCase()
              .includes(selectedLocation.toLowerCase()));
        return locationMatch;
      });
    }

    // Recent filter
    if (recentFilter) {
      const now = new Date();
      filtered = filtered.filter((osi) => {
        if (!osi.fecha_emision) return false;
        const osiDate = new Date(osi.fecha_emision);
        const daysDiff = Math.floor(
          (now.getTime() - osiDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        switch (recentFilter) {
          case "7days":
            return daysDiff <= 7;
          case "30days":
            return daysDiff <= 30;
          case "90days":
            return daysDiff <= 90;
          default:
            return true;
        }
      });
    }

    setFilteredOsis(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [
    searchTerm,
    selectedMonth,
    selectedStatus,
    selectedLocation,
    recentFilter,
    osis,
  ]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredOsis.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredOsis.slice(startIndex, endIndex);

  // Generate month options for the dropdown
  const getMonthOptions = () => {
    const months = [];
    const now = new Date();
    const currentYear = now.getFullYear();

    // Generate options for the current year and previous year
    for (let year = currentYear; year >= currentYear - 1; year--) {
      for (let month = 12; month >= 1; month--) {
        const date = new Date(year, month - 1);
        const monthYear = `${year}-${String(month).padStart(2, "0")}`;
        const monthName =
          date.toLocaleDateString("es-ES", {
            month: "long",
            year: "numeric",
          }) || "";
        months.push({
          value: monthYear,
          label: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        });
      }
    }
    return months;
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedMonth("");
    setSelectedStatus("");
    setSelectedLocation("");
    setRecentFilter("");
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(searchTerm || selectedMonth || selectedStatus || selectedLocation || recentFilter);

  const handleCreateNew = () => {
    try {
      router.push("/dashboard/negocios/gestion-de-osis/new");
    } catch (error) {
      console.error("Error navigating to new OSI page:", error);
      // Fallback: try window.location as backup
      window.location.href = "/dashboard/negocios/gestion-de-osis/new";
    }
  };

  const handleOSIClick = (osi: OSI) => {
    // Navigate directly to OSI detail page (data will load on-demand)
    router.push(`/dashboard/negocios/gestion-de-osis/${osi.nro_osi}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "activo":
        return "bg-green-100 text-green-800";
      case "pendiente":
        return "bg-yellow-100 text-yellow-800";
      case "cerrado":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

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
        monthOptions={getMonthOptions()}
        hasActiveFilters={hasActiveFilters}
      />

      {/* OSI List */}
      {filteredOsis.length === 0 ? (
        <OSIEmptyState
          hasFilters={hasActiveFilters}
          onClearFilters={clearAllFilters}
          onCreateNew={() =>
            router.push("/dashboard/negocios/gestion-de-osis/new")
          }
        />
      ) : (
        <>
          <OSITable
            osis={currentItems}
            onOSIClick={handleOSIClick}
            getStatusColor={getStatusColor}
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
}
