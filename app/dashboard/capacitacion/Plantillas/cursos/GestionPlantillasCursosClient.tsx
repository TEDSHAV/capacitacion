"use client";

import { useState, useEffect, useRef } from "react";
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { PlantillaCurso } from "./types";
import { PlantillaCursoList } from "./PlantillaCursoList";
import { CreatePlantillaCursoButton } from "./CreatePlantillaCursoButton";
import { PlantillaCursoForm } from "./PlantillaCursoForm";
import { getPlantillaCursosAction, createPlantillaCursoAction, updatePlantillaCursoAction, deletePlantillaCursoAction, getCoursesAction, getEmpresasAction, getCourseWithContentAction } from "./actions";

interface GestionPlantillasCursosClientProps {
  initialPlantillas?: PlantillaCurso[];
  initialTotal?: number;
  initialCourses?: any[];
  initialEmpresas?: any[];
}

export default function GestionPlantillasCursosClient({
  initialPlantillas,
  initialTotal,
  initialCourses,
  initialEmpresas,
}: GestionPlantillasCursosClientProps = {}) {
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const itemsPerPage = 10;
  const hasInitialData = initialPlantillas !== undefined;
  const skipFirstLoad = useRef(hasInitialData);

  const [plantillas, setPlantillas] = useState<PlantillaCurso[]>(initialPlantillas ?? []);
  const [courses, setCourses] = useState<any[]>(initialCourses ?? []);
  const [empresas, setEmpresas] = useState<any[]>(initialEmpresas ?? []);
  const [isLoading, setIsLoading] = useState(!hasInitialData);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlantilla, setEditingPlantilla] = useState<PlantillaCurso | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(
    initialTotal !== undefined ? Math.ceil(initialTotal / itemsPerPage) : 1
  );
  const [searchTerm, setSearchTerm] = useState("");

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
      // Load data in parallel for better performance
      const [coursesResult, empresasResult] = await Promise.all([
        getCoursesAction(),
        getEmpresasAction()
      ]);
      
      console.log('Courses result:', coursesResult);
      console.log('Empresas result:', empresasResult);
      
      if (coursesResult.success) {
        setCourses(coursesResult.data || []);
      } else {
        console.error('Failed to load courses:', coursesResult.error);
      }
      
      if (empresasResult.success) {
        setEmpresas(empresasResult.data || []);
      } else {
        console.error('Failed to load empresas:', empresasResult.error);
      }
    } catch (error) {
      console.error("Error loading courses and empresas:", error);
    }
  };

  useEffect(() => {
    if (skipFirstLoad.current) {
      skipFirstLoad.current = false;
      return;
    }
    loadPlantillas(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  useEffect(() => {
    if (!initialCourses) {
      loadCoursesAndEmpresas();
    }
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

  const handleDeletePlantilla = (id: number) => {
    confirm({
      title: 'Eliminar Plantilla',
      message: '¿Estás seguro de que deseas eliminar esta plantilla?',
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        try {
          const result = await deletePlantillaCursoAction(id);
          if (result.success) {
            loadPlantillas(currentPage, searchTerm);
          }
        } catch (error) {
          console.error("Error deleting plantilla:", error);
        }
      },
    });
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
      {confirmDialog}
    </div>
  );
}
