"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { CertificateOSI, CourseTopic, OSISearchProps } from "@/types";
import { Button } from "@/components/ui/button";
import { X, Search } from "lucide-react";

export default function OSISearch({
  osis,
  selectedOSI,
  onSelect,
  matchedCourse,
  allCourses,
  disabled = false,
}: OSISearchProps & {
  matchedCourse?: CourseTopic | null;
  allCourses?: CourseTopic[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [visibleCount, setVisibleCount] = useState(10);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // id_curso is id_servicio from v_osi_formato_completo — direct match against catalogo_servicios.id
  const findMatchingCourse = (osi: CertificateOSI): CourseTopic | null => {
    if (!allCourses) return null;

    // 1. Try ID matching
    if (osi.id_curso) {
      const matched = allCourses.find(
        (course) => course.id === osi.id_curso!.toString(),
      );
      if (matched) return matched;
    }

    // 2. Try Name matching as fallback
    if (osi.curso_nombre || osi.detalle_capacitacion) {
      const targetName = (
        osi.curso_nombre ||
        osi.detalle_capacitacion ||
        ""
      ).toLowerCase();
      const matched = allCourses.find(
        (course) =>
          course.nombre.toLowerCase() === targetName ||
          course.name.toLowerCase() === targetName,
      );
      if (matched) return matched;
    }

    return null;
  };

  const filteredOSIs = useMemo(
    () =>
      osis.filter(
        (osi) =>
          osi.is_active !== false &&
          ((osi.nro_osi &&
            osi.nro_osi
              .toString()
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
            (osi.cliente_nombre_empresa &&
              osi.cliente_nombre_empresa
                .toLowerCase()
                .includes(searchTerm.toLowerCase())) ||
            (osi.curso_nombre &&
              osi.curso_nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (osi.detalle_capacitacion &&
              osi.detalle_capacitacion
                .toLowerCase()
                .includes(searchTerm.toLowerCase())) ||
            (osi.tipo_servicio &&
              osi.tipo_servicio.toLowerCase().includes(searchTerm.toLowerCase()))),
      ),
    [osis, searchTerm],
  );

  // Show last 10 OSIs by default, or search results
  const displayOSIs = useMemo(
    () =>
      searchTerm
        ? filteredOSIs.slice(0, visibleCount)
        : osis.slice(0, visibleCount),
    [filteredOSIs, osis, searchTerm, visibleCount],
  );

  const handleSelect = (osi: CertificateOSI) => {
    onSelect(osi);
    setIsOpen(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
  };

  const handleClear = () => {
    onSelect(null);
    setSearchTerm("");
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleInputBlur = () => {
    // Delay closing to allow click on dropdown items
    setTimeout(() => setIsOpen(false), 150);
  };

  const handleDropdownMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) => {
            const newIndex = prev + 1;
            return newIndex >= filteredOSIs.length ? 0 : newIndex;
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => {
            const newIndex = prev - 1;
            return newIndex < 0 ? filteredOSIs.length - 1 : newIndex;
          });
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < filteredOSIs.length) {
            handleSelect(filteredOSIs[highlightedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setHighlightedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, highlightedIndex, filteredOSIs]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset highlighted index and visible count when search term changes
  useEffect(() => {
    setHighlightedIndex(-1);
    setVisibleCount(10);
  }, [searchTerm]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Seleccionar OSI
      </h2>

      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          ref={inputRef}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => !disabled && setIsOpen(true)}
          onBlur={handleInputBlur}
          disabled={disabled}
          placeholder={
            disabled
              ? "OSI Seleccionada (Modo Edición)"
              : "Buscar por número de OSI, cliente, curso o servicio..."
          }
          className={`w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabled ? "bg-gray-50 cursor-not-allowed opacity-75" : ""}`}
        />
        {searchTerm && !disabled && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchTerm("")}
            className="absolute inset-y-0 right-0 w-8 h-full flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-md"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Selected OSI Display */}
      {selectedOSI && selectedOSI.nro_osi && (
        <div
          className={`mt-4 p-4 border rounded-md ${disabled ? "bg-gray-50 border-gray-200" : "bg-blue-50 border-blue-200"}`}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div
                className={`font-bold text-lg ${disabled ? "text-gray-900" : "text-blue-900"}`}
              >
                OSI: {selectedOSI.nro_osi}
              </div>
              <div
                className={`text-sm mt-1 ${disabled ? "text-gray-600" : "text-blue-700"}`}
              >
                <span className="font-semibold">Cliente:</span>{" "}
                {selectedOSI.cliente_nombre_empresa || "N/A"}
              </div>
              <div
                className={`text-sm mt-1 ${disabled ? "text-gray-600" : "text-blue-700"}`}
              >
                <span className="font-semibold">Curso Original (OSI):</span>{" "}
                {selectedOSI.curso_nombre ||
                  selectedOSI.detalle_capacitacion ||
                  "N/A - Sin curso especificado"}
              </div>
            </div>
            {!disabled && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="ml-2 h-8 w-8 text-blue-600 hover:text-red-600 hover:bg-red-50 rounded-full flex-shrink-0"
                title="Quitar selección"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Manual Course Override Dropdown */}
          {!disabled && allCourses && (
            <div className="mt-4 pt-4 border-t border-blue-100">
              <label
                htmlFor="manual_course_select"
                className="block text-sm font-bold text-blue-900 mb-2"
              >
                Curso para Certificado
              </label>
              <p className="text-xs text-blue-700 mb-3 italic">
                El curso se autocompletó basado en la OSI. Puedes cambiarlo aquí
                si deseas usar un contenido o tema diferente de la base de
                datos.
              </p>
              <select
                id="manual_course_select"
                value={matchedCourse?.id || ""}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const course = allCourses.find((c) => c.id === selectedId);
                  if (course) {
                    // Update through the same callback that handles OSI selection
                    // but we only want to update the course topic
                    onSelect({
                      ...selectedOSI,
                      id_curso: parseInt(course.id),
                    });
                  }
                }}
                className="w-full px-3 py-2 bg-white border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">Seleccionar curso manualmente...</option>
                {allCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.nombre}
                  </option>
                ))}
              </select>
              {matchedCourse && (
                <p className="text-[10px] text-green-700 mt-2 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  Curso vinculado: {matchedCourse.nombre}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dropdown Results */}
      {isOpen && !selectedOSI && (
        <div
          ref={dropdownRef}
          className="absolute mt-2 w-full border border-gray-300 rounded-md shadow-lg bg-white max-h-80 overflow-y-auto z-50"
          onMouseDown={handleDropdownMouseDown}
        >
          {displayOSIs.length === 0 ? (
            <div className="p-3 text-gray-500 text-center">
              {searchTerm
                ? "No se encontraron OSIs que coincidan con la búsqueda"
                : "No hay OSIs disponibles"}
            </div>
          ) : (
            <>
              {displayOSIs.map((osi, index) => (
                <div
                  key={osi.id}
                  onClick={() => handleSelect(osi)}
                  className={`p-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                    highlightedIndex === index
                      ? "bg-blue-50"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="font-medium text-gray-900">
                      {osi.nro_osi}
                    </div>
                    {osi.has_certificates && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-100 text-green-800 rounded-full border border-green-200 uppercase tracking-wider">
                        Generado
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {osi.cliente_nombre_empresa}
                  </div>
                  <div className="text-sm text-gray-500">
                    Curso:{" "}
                    {findMatchingCourse(osi)?.nombre ||
                      osi.curso_nombre ||
                      osi.detalle_capacitacion ||
                      "Sin curso especificado"}
                  </div>
                </div>
              ))}

              {/* Load More Button */}
              {(searchTerm ? filteredOSIs.length : osis.length) >
                visibleCount && (
                <div
                  className="p-2 text-center border-t border-gray-100"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 10)}
                    className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    Cargar más (
                    {(searchTerm ? filteredOSIs.length : osis.length) -
                      visibleCount}{" "}
                    restantes)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Instructions */}
      {!selectedOSI && (
        <div className="mt-3 text-sm text-gray-500">
          Haz clic en el campo de búsqueda y selecciona una OSI existente
        </div>
      )}
    </div>
  );
}
