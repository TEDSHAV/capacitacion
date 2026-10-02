"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Curso, Empresa } from "@/types";
import {
  createCurso,
  updateCurso,
  duplicateCurso,
  deleteCurso,
  toggleMostrarEnCatalogo,
} from "./actions";
import CourseForm from "./CourseForm";
import CourseList from "./CourseList";
import CreateCourseButton from "./CreateCourseButton";
import CategoryManagementModal from "./CategoryManagementModal";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { cachePortalData } from "@/lib/offline/portal-data-cache";
import {
  CourseCategoryItem,
  DEFAULT_COURSE_CATEGORIES,
  resolveCourseCategory,
} from "@/lib/course-categories";
import { FolderOpen, AlertCircle, Presentation, EyeOff } from "lucide-react";
import PresentationStudioModal from "./PresentationStudioModal";

export default function GestionCursosClient({
  user,
  empresas = [],
  cursos = [],
  initialCategories = DEFAULT_COURSE_CATEGORIES,
}: {
  user: { id?: string; email?: string } | null;
  empresas: Empresa[];
  cursos: Curso[] | undefined;
  initialCategories?: CourseCategoryItem[];
}) {
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [creandoCurso, setCreandoCurso] = useState(false);
  const [editandoCurso, setEditandoCurso] = useState<number | null>(null);
  const [gestionandoCategorias, setGestionandoCategorias] = useState(false);
  const [estudioPresentacionAbierto, setEstudioPresentacionAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [cursosList, setCursosList] = useState<Curso[]>(cursos || []);
  const [categoriesList, setCategoriesList] = useState<CourseCategoryItem[]>(
    initialCategories || DEFAULT_COURSE_CATEGORIES,
  );
  const hasInitialized = useRef(false);


  // Cache initial RSC data for offline use
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      cachePortalData("dash_cursos", "dash_cursos", {
        cursos: cursos || [],
        empresas,
      }).catch(() => {});
    }
  }, [cursos, empresas]);

  // Compute course count per category
  const courseCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    cursosList.forEach((curso) => {
      const cat = resolveCourseCategory(curso, categoriesList);
      if (cat) {
        const code = cat.codigo.toUpperCase();
        counts[code] = (counts[code] || 0) + 1;
      }
    });
    return counts;
  }, [cursosList, categoriesList]);

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-gray-600">No autenticado</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const cerrarModal = () => {
    setCreandoCurso(false);
    setEditandoCurso(null);
    setError(null);
  };

  const handleCreateCourse = async (formData: FormData) => {
    setError(null);
    setGuardando(true);

    try {
      const result = await createCurso(formData);

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setCreandoCurso(false);
        if (result.data.mostrar_en_catalogo !== false) {
          setCursosList((prev) => [result.data!, ...prev]); // Add new course to list if visible in catalog
        }
      }
    } catch {
      setError("Error al crear el curso");
    } finally {
      setGuardando(false);
    }
  };

  const handleEditCourse = async (formData: FormData) => {
    if (!editandoCurso) return;

    setError(null);
    setGuardando(true);

    try {
      const result = await updateCurso(editandoCurso.toString(), formData);

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setEditandoCurso(null);
        if (result.data.mostrar_en_catalogo === false) {
          // If updated course is no longer shown in catalog, remove it from list
          setCursosList((prev) =>
            prev.filter((curso) => curso.id !== editandoCurso),
          );
        } else {
          setCursosList((prev) =>
            prev.map((curso) =>
              curso.id === editandoCurso ? result.data! : curso,
            ),
          ); // Update course in list
        }
      }
    } catch {
      setError("Error al actualizar el curso");
    } finally {
      setGuardando(false);
    }
  };

  const handleDeleteCourse = (id: string) => {
    confirm({
      title: "Eliminar Curso",
      message: "¿Estás seguro de que quieres eliminar este curso?",
      confirmLabel: "Eliminar",
      onConfirm: async () => {
        try {
          const result = await deleteCurso(id);
          if (result.error) {
            setError(result.error);
          } else {
            setCursosList((prev) =>
              prev.filter((curso) => curso.id.toString() !== id),
            );
          }
        } catch {
          setError("Error al eliminar el curso");
        }
      },
    });
  };

  const handleDuplicateCourse = async (id: string) => {
    try {
      const result = await duplicateCurso(id);

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        if (result.data.mostrar_en_catalogo !== false) {
          setCursosList((prev) => [result.data!, ...prev]); // Add duplicated course to list if visible in catalog
        }
      }
    } catch {
      setError("Error al duplicar el curso");
    }
  };

  const [lastHiddenCourse, setLastHiddenCourse] = useState<{
    id: string;
    nombre: string;
  } | null>(null);

  const handleToggleMostrar = async (id: string, mostrar: boolean) => {
    const courseToHide = cursosList.find((c) => c.id.toString() === id);
    try {
      // Optimistically remove from list if hiding
      setCursosList((prev) => prev.filter((curso) => curso.id.toString() !== id));
      if (!mostrar && courseToHide) {
        setLastHiddenCourse({ id, nombre: courseToHide.nombre });
      }

      const result = await toggleMostrarEnCatalogo(id, mostrar);
      if (result.error) {
        setError(result.error);
      }
    } catch {
      setError("Error al actualizar visibilidad del curso");
    }
  };

  const handleUndoHide = async () => {
    if (!lastHiddenCourse) return;
    const { id } = lastHiddenCourse;
    setLastHiddenCourse(null);
    try {
      const result = await toggleMostrarEnCatalogo(id, true);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setCursosList((prev) => [result.data!, ...prev]);
      }
    } catch {
      setError("Error al restaurar el curso");
    }
  };

  const abrirModalEdicion = (curso: Curso) => {
    setEditandoCurso(curso.id);
    setError(null);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Undo Hidden Course Notification */}
        {lastHiddenCourse && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center space-x-2.5">
              <EyeOff className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                Curso <strong>{lastHiddenCourse.nombre}</strong> ocultado del catálogo.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleUndoHide}
                className="text-xs font-bold text-amber-900 hover:text-amber-950 bg-amber-200/70 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                Deshacer
              </button>
              <button
                type="button"
                onClick={() => setLastHiddenCourse(null)}
                className="text-xs font-semibold text-amber-700 hover:text-amber-900"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-2.5">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-xs font-semibold text-red-600 hover:text-red-800"
            >
              Descartar
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Gestión de Cursos
              </h1>
              <p className="mt-1.5 text-sm text-gray-500">
                Crear, categorizar y administrar contenidos de cursos y fichas técnicas
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEstudioPresentacionAbierto(true)}
                className="inline-flex items-center space-x-2 px-3.5 py-2 border border-sky-300 text-sky-800 bg-sky-50 hover:bg-sky-100 rounded-lg text-sm font-semibold shadow-2xs transition-colors hover:border-sky-400"
              >
                <Presentation className="w-4 h-4 text-sky-700" />
                <span>Prisma Studio</span>
              </button>
              <button
                type="button"
                onClick={() => setGestionandoCategorias(true)}
                className="inline-flex items-center space-x-2 px-3.5 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-lg text-sm font-semibold shadow-2xs transition-colors hover:border-gray-400"
              >
                <FolderOpen className="w-4 h-4 text-blue-600" />
                <span>Gestionar Categorías</span>
              </button>
              <CreateCourseButton onClick={() => setCreandoCurso(true)} />
            </div>
          </div>
        </div>

        {/* Presentation Studio Modal */}
        {estudioPresentacionAbierto && (
          <PresentationStudioModal
            isOpen={estudioPresentacionAbierto}
            onClose={() => setEstudioPresentacionAbierto(false)}
            cursosCatalogo={cursosList}
          />
        )}

        {/* Create/Edit Course Modal */}
        {(creandoCurso || editandoCurso) && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <CourseForm
              curso={
                editandoCurso !== null
                  ? cursosList.find((c) => c.id === editandoCurso) || null
                  : null
              }
              onSubmit={creandoCurso ? handleCreateCourse : handleEditCourse}
              onCancel={cerrarModal}
              isEdit={!!editandoCurso}
              existingCursos={cursosList}
              editingId={editandoCurso}
              categories={categoriesList}
              serverError={error}
              isSubmitting={guardando}
            />
          </div>
        )}

        {/* Category Management Modal */}
        <CategoryManagementModal
          isOpen={gestionandoCategorias}
          onClose={() => setGestionandoCategorias(false)}
          categories={categoriesList}
          onCategoriesChange={setCategoriesList}
          courseCountByCategory={courseCountByCategory}
        />

        {/* Courses List */}
        <CourseList
          cursos={cursosList}
          onEdit={abrirModalEdicion}
          onDelete={handleDeleteCourse}
          onDuplicate={handleDuplicateCourse}
          onToggleMostrar={handleToggleMostrar}
          categories={categoriesList}
        />
      </div>
      {confirmDialog}
    </div>
  );
}

