"use client";

import { useState, useEffect } from "react";
import { PlantillaCurso } from "./types";
import { PlantillaCursoList } from "./PlantillaCursoList";
import { CreatePlantillaCursoButton } from "./CreatePlantillaCursoButton";
import { PlantillaCursoForm } from "./PlantillaCursoForm";
import { getPlantillaCursosAction, createPlantillaCursoAction, updatePlantillaCursoAction, deletePlantillaCursoAction, getCoursesAction, getEmpresasAction } from "./actions";

export default function GestionPlantillasCursosClient() {
  const [plantillas, setPlantillas] = useState<PlantillaCurso[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlantilla, setEditingPlantilla] = useState<PlantillaCurso | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const itemsPerPage = 10;

  const loadPlantillas = async (page = 1, search = "") => {
    setIsLoading(true);
    try {
      const result = await getPlantillaCursosAction(page, itemsPerPage, search);
      if (result.success) {
        setPlantillas(result.data || []);
        setTotalPages(Math.ceil((result.total || 0) / itemsPerPage));
      }
    } catch (error) {
      console.error("Error loading plantillas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCoursesAndEmpresas = async () => {
    try {
      const [coursesResult, empresasResult] = await Promise.all([
        getCoursesAction(),
        getEmpresasAction()
      ]);
      
      if (coursesResult.success) {
        setCourses(coursesResult.data || []);
      }
      
      if (empresasResult.success) {
        setEmpresas(empresasResult.data || []);
      }
    } catch (error) {
      console.error("Error loading courses and empresas:", error);
    }
  };

  useEffect(() => {
    loadPlantillas(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  useEffect(() => {
    loadCoursesAndEmpresas();
  }, []);

  const handleCreatePlantilla = () => {
    setEditingPlantilla(null);
    setIsFormOpen(true);
  };

  const handleEditPlantilla = (plantilla: PlantillaCurso) => {
    setEditingPlantilla(plantilla);
    setIsFormOpen(true);
  };

  const handleSavePlantilla = async (plantillaData: Partial<PlantillaCurso>) => {
    try {
      if (editingPlantilla) {
        // Update existing plantilla
        const result = await updatePlantillaCursoAction(editingPlantilla.id, plantillaData);
        if (result.success) {
          loadPlantillas(currentPage, searchTerm);
          setIsFormOpen(false);
        }
      } else {
        // Create new plantilla
        const result = await createPlantillaCursoAction(plantillaData);
        if (result.success) {
          loadPlantillas(currentPage, searchTerm);
          setIsFormOpen(false);
        }
      }
    } catch (error) {
      console.error("Error saving plantilla:", error);
    }
  };

  const handleDeletePlantilla = async (id: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta plantilla?")) {
      try {
        const result = await deletePlantillaCursoAction(id);
        if (result.success) {
          loadPlantillas(currentPage, searchTerm);
        }
      } catch (error) {
        console.error("Error deleting plantilla:", error);
      }
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Plantillas de Cursos</h1>
        <p className="text-gray-600 mt-1">
          Administra las plantillas de contenido para los cursos de capacitación
        </p>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <CreatePlantillaCursoButton onCreatePlantilla={handleCreatePlantilla} />
      </div>

      <PlantillaCursoList
        plantillas={plantillas}
        courses={courses}
        empresas={empresas}
        isLoading={isLoading}
        onEdit={handleEditPlantilla}
        onDelete={handleDeletePlantilla}
        onSearch={handleSearch}
        searchTerm={searchTerm}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />

      {isFormOpen && (
        <PlantillaCursoForm
          plantilla={editingPlantilla}
          courses={courses}
          empresas={empresas}
          onSave={handleSavePlantilla}
          onCancel={() => setIsFormOpen(false)}
        />
      )}
    </div>
  );
}
