"use client";

import { useState, useMemo } from "react";
import { Curso } from "@/types";
import CourseItem from "./CourseItem";
import Pagination from "./Pagination";
import {
  CourseCategoryItem,
  resolveCourseCategory,
  getCategoryTheme,
  DEFAULT_COURSE_CATEGORIES,
} from "@/lib/course-categories";
import { Search, Filter, Layers, RotateCcw } from "lucide-react";

interface CourseListProps {
  cursos: Curso[];
  onEdit: (curso: Curso) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onManageMaterials?: (curso: Curso) => void;
  categories?: CourseCategoryItem[];
}

export default function CourseList({
  cursos,
  onEdit,
  onDelete,
  onDuplicate,
  onManageMaterials,
  categories = DEFAULT_COURSE_CATEGORIES,
}: CourseListProps) {

  const [busqueda, setBusqueda] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Active categories only for filter tabs
  const activeCategories = useMemo(
    () => categories.filter((c) => c.is_active !== false),
    [categories],
  );

  // Compute live counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: cursos.length,
      UNASSIGNED: 0,
    };

    activeCategories.forEach((cat) => {
      counts[cat.codigo.toUpperCase()] = 0;
    });

    cursos.forEach((curso) => {
      const resolved = resolveCourseCategory(curso, activeCategories);
      if (resolved) {
        const code = resolved.codigo.toUpperCase();
        counts[code] = (counts[code] || 0) + 1;
      } else {
        counts.UNASSIGNED = (counts.UNASSIGNED || 0) + 1;
      }
    });

    return counts;
  }, [cursos, activeCategories]);

  // Combined filtering
  const cursosFiltrados = useMemo(() => {
    const query = busqueda.toLowerCase().trim();

    return cursos.filter((curso) => {
      // 1. Text search
      const matchesSearch =
        !query ||
        curso.nombre?.toLowerCase().includes(query) ||
        curso.contenido_curso?.toLowerCase().includes(query) ||
        curso.carga_horaria_std?.toString().includes(query) ||
        curso.categoria?.toLowerCase().includes(query) ||
        false;

      if (!matchesSearch) return false;

      // 2. Category selection
      if (selectedCategoria === "ALL") return true;

      const cat = resolveCourseCategory(curso, activeCategories);
      if (selectedCategoria === "UNASSIGNED") {
        return !cat;
      }

      return cat?.codigo.toUpperCase() === selectedCategoria.toUpperCase();
    });
  }, [cursos, busqueda, selectedCategoria, activeCategories]);

  // Pagination logic
  const totalPages = Math.ceil(cursosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const cursosPaginados = cursosFiltrados.slice(startIndex, endIndex);

  // Handlers that reset page to 1 on filter/search change
  const handleBusquedaChange = (value: string) => {
    setBusqueda(value);
    setCurrentPage(1);
  };

  const handleCategoriaChange = (cat: string) => {
    setSelectedCategoria(cat);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setBusqueda("");
    setSelectedCategoria("ALL");
    setCurrentPage(1);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Top Filter and Search Bar */}
      <div className="p-4 sm:p-5 border-b border-gray-200 bg-gray-50/50 space-y-4">
        {/* Category Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-gray-400" />
            <span>Categorías:</span>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Buscar por nombre, código o contenido..."
              value={busqueda}
              onChange={(e) => handleBusquedaChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-2xs placeholder-gray-400"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            {busqueda && (
              <button
                onClick={() => handleBusquedaChange("")}
                className="absolute right-2.5 top-2.5 text-xs text-gray-400 hover:text-gray-600"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills Scrollable Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {/* ALL Tab */}
          <button
            type="button"
            onClick={() => handleCategoriaChange("ALL")}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              selectedCategoria === "ALL"
                ? "bg-gray-900 text-white shadow-xs ring-1 ring-gray-900"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <span>Todos</span>
            <span
              className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                selectedCategoria === "ALL"
                  ? "bg-gray-700 text-gray-200"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {categoryCounts.ALL}
            </span>
          </button>

          {/* Individual Category Tabs */}
          {activeCategories.map((cat) => {
            const isSelected =
              selectedCategoria.toUpperCase() === cat.codigo.toUpperCase();
            const theme = getCategoryTheme(cat.color);
            const count = categoryCounts[cat.codigo.toUpperCase()] || 0;

            return (
              <button
                key={cat.codigo}
                type="button"
                onClick={() => handleCategoriaChange(cat.codigo.toUpperCase())}
                title={cat.nombre}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  isSelected
                    ? theme.tabActive
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSelected ? "bg-white" : theme.badgeDot
                  }`}
                />
                <span className="font-bold">{cat.codigo}</span>
                <span className="font-normal opacity-90 hidden md:inline">
                  {cat.nombre}
                </span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? "bg-white/20 text-white" : theme.pillCount
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {/* UNASSIGNED Tab */}
          <button
            type="button"
            onClick={() => handleCategoriaChange("UNASSIGNED")}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              selectedCategoria === "UNASSIGNED"
                ? "bg-gray-700 text-white shadow-xs ring-1 ring-gray-700"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <span>Sin categoría</span>
            <span
              className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                selectedCategoria === "UNASSIGNED"
                  ? "bg-gray-600 text-gray-200"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {categoryCounts.UNASSIGNED}
            </span>
          </button>

          {/* Reset Filters Pill (visible when filters are active) */}
          {(selectedCategoria !== "ALL" || Boolean(busqueda)) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 shadow-2xs transition-colors whitespace-nowrap ml-auto"
              title="Restablecer todos los filtros"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
              <span>Restablecer filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* List Header */}
      <div className="bg-gray-100/70 px-6 py-2.5 border-b border-gray-200">
        <div className="grid grid-cols-12 gap-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          <div className="col-span-6">Información del Curso</div>
          <div className="col-span-2 text-center sm:text-left">Duración</div>
          <div className="col-span-4 text-right">Acciones</div>
        </div>
      </div>

      {/* Course Rows */}
      {cursosPaginados.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <div className="w-14 h-14 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            {busqueda || selectedCategoria !== "ALL"
              ? "No se encontraron cursos con los filtros seleccionados"
              : "No hay cursos creados"}
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {busqueda || selectedCategoria !== "ALL"
              ? "Prueba cambiando la categoría seleccionada o los términos de búsqueda."
              : "Crea tu primer curso para comenzar."}
          </p>
          {(busqueda || selectedCategoria !== "ALL") && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-4 inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-2xs hover:bg-gray-50 hover:text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-300"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
              <span>Restablecer filtros</span>
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {cursosPaginados.map((curso) => (
            <CourseItem
              key={curso.id}
              curso={curso}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onManageMaterials={onManageMaterials}
              categories={categories}
            />
          ))}
        </div>

      )}

      {/* Pagination Footer */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        startIndex={startIndex}
        endIndex={endIndex}
        totalItems={cursosFiltrados.length}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
