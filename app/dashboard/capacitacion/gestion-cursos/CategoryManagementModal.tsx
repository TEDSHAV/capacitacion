"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  FolderOpen,
  Loader2,
  Info,
} from "lucide-react";
import {
  CourseCategoryItem,
  AVAILABLE_CATEGORY_COLORS,
  getCategoryTheme,
} from "@/lib/course-categories";
import {
  createCategoriaCurso,
  updateCategoriaCurso,
  deleteCategoriaCurso,
} from "./category-actions";

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CourseCategoryItem[];
  onCategoriesChange: (updated: CourseCategoryItem[]) => void;
  courseCountByCategory: Record<string, number>;
}

export default function CategoryManagementModal({
  isOpen,
  onClose,
  categories,
  onCategoriesChange,
  courseCountByCategory,
}: CategoryManagementModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form mode: null (idle list), 'new' (creating), or category ID/code (editing)
  const [formMode, setFormMode] = useState<"idle" | "new" | number>("idle");

  // Form fields
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    color: "sky",
    is_active: true,
  });

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Handle outside click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const resetForm = () => {
    setFormData({
      codigo: "",
      nombre: "",
      descripcion: "",
      color: "sky",
      is_active: true,
    });
    setFormMode("idle");
    setError(null);
  };

  const handleStartNew = () => {
    resetForm();
    setFormMode("new");
  };

  const handleStartEdit = (cat: CourseCategoryItem) => {
    setFormData({
      codigo: cat.codigo,
      nombre: cat.nombre,
      descripcion: cat.descripcion || "",
      color: cat.color || "sky",
      is_active: cat.is_active !== false,
    });
    setFormMode(cat.id || 9999);
    setError(null);
  };

  const handleSave = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (formMode === "new") {
        if (!formData.codigo.trim() || !formData.nombre.trim()) {
          setError("El código y el nombre son obligatorios");
          setLoading(false);
          return;
        }

        const res = await createCategoriaCurso({
          codigo: formData.codigo,
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          color: formData.color,
        });

        if (res.error) {
          setError(res.error);
        } else if (res.data) {
          onCategoriesChange([...categories, res.data]);
          setSuccessMsg(`Categoría "${res.data.codigo}" creada exitosamente`);
          resetForm();
        }
      } else if (typeof formMode === "number") {
        const catId = formMode;
        const res = await updateCategoriaCurso(catId, {
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          color: formData.color,
          is_active: formData.is_active,
        });

        if (res.error) {
          setError(res.error);
        } else if (res.data) {
          onCategoriesChange(
            categories.map((c) => (c.id === catId ? res.data! : c)),
          );
          setSuccessMsg(`Categoría "${res.data.codigo}" actualizada`);
          resetForm();
        }
      }
    } catch {
      setError("Error inesperado al guardar categoría");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cat: CourseCategoryItem) => {
    const count = courseCountByCategory[cat.codigo.toUpperCase()] || 0;

    const confirmMsg =
      count > 0
        ? `La categoría ${cat.codigo} tiene ${count} curso(s) asignado(s). ¿Deseas desactivarla?`
        : `¿Estás seguro de eliminar la categoría "${cat.codigo} - ${cat.nombre}"?`;

    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    setError(null);
    try {
      if (cat.id) {
        const res = await deleteCategoriaCurso(cat.id, cat.codigo);
        if (res.error) {
          setError(res.error);
        } else if (res.deactivatedOnly) {
          onCategoriesChange(
            categories.map((c) =>
              c.id === cat.id ? { ...c, is_active: false } : c,
            ),
          );
          setSuccessMsg(
            `Categoría "${cat.codigo}" desactivada (posee cursos vinculados)`,
          );
        } else {
          onCategoriesChange(categories.filter((c) => c.id !== cat.id));
          setSuccessMsg(`Categoría "${cat.codigo}" eliminada`);
        }
      } else {
        // In-memory fallback removal
        onCategoriesChange(
          categories.filter((c) => c.codigo !== cat.codigo),
        );
        setSuccessMsg(`Categoría "${cat.codigo}" removida`);
      }
    } catch {
      setError("Error al eliminar categoría");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Gestión de Categorías de Cursos
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Administra las clasificaciones (FG, TI, TP, CO) del catálogo de Capacitación
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Alerts */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 flex items-center space-x-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form Section (when adding or editing) */}
          {formMode !== "idle" && (
            <div className="bg-gray-50 border border-blue-200 rounded-xl p-5 shadow-xs transition-all animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
                  <span>
                    {formMode === "new"
                      ? "Crear Nueva Categoría"
                      : `Editar Categoría "${formData.codigo}"`}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Código */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Código (Siglas) *
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    disabled={formMode !== "new"}
                    value={formData.codigo}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        codigo: e.target.value.toUpperCase().trim(),
                      })
                    }
                    placeholder="Ej: FG, TI, TP, CO"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    2 a 10 letras en mayúscula
                  </p>
                </div>

                {/* Nombre */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    placeholder="Ej: Técnico Industrial"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Descripción */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Descripción / Propósito
                  </label>
                  <textarea
                    rows={2}
                    value={formData.descripcion}
                    onChange={(e) =>
                      setFormData({ ...formData, descripcion: e.target.value })
                    }
                    placeholder="Describe qué tipos de cursos pertenecen a esta categoría..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Color Selector */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Color de Insignia
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_CATEGORY_COLORS.map((c) => {
                      const isSelected = formData.color === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, color: c.id })
                          }
                          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                            isSelected
                              ? "ring-2 ring-blue-500 border-transparent shadow-xs"
                              : "border-gray-200 hover:border-gray-300 bg-white"
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: c.hex }}
                          />
                          <span>{c.name}</span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-blue-600 ml-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 pt-3 border-t border-gray-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3.5 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSave}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>
                      {formMode === "new" ? "Crear Categoría" : "Guardar Cambios"}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Categories List */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Categorías Disponibles ({categories.length})
              </h3>
              {formMode === "idle" && (
                <button
                  type="button"
                  onClick={handleStartNew}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors border border-blue-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nueva Categoría</span>
                </button>
              )}
            </div>

            <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
              {categories.map((cat) => {
                const theme = getCategoryTheme(cat.color);
                const count =
                  courseCountByCategory[cat.codigo.toUpperCase()] || 0;

                return (
                  <div
                    key={cat.codigo}
                    className="p-4 hover:bg-gray-50/80 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      {/* Code Badge */}
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border shrink-0 ${theme.badge}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${theme.badgeDot}`}
                        />
                        {cat.codigo}
                      </span>

                      {/* Info */}
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-semibold text-gray-900 truncate">
                            {cat.nombre}
                          </h4>
                          {!cat.is_active && (
                            <span className="text-[10px] font-medium bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                              Inactiva
                            </span>
                          )}
                        </div>
                        {cat.descripcion && (
                          <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                            {cat.descripcion}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Meta & Actions */}
                    <div className="flex items-center space-x-3 shrink-0">
                      {/* Courses count badge */}
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                        {count} curso{count === 1 ? "" : "s"}
                      </span>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(cat)}
                        title="Editar categoría"
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Delete / Deactivate Button */}
                      <button
                        type="button"
                        onClick={() => handleDelete(cat)}
                        title={
                          count > 0
                            ? "Desactivar categoría"
                            : "Eliminar categoría"
                        }
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info note */}
          <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg flex items-start space-x-2 text-xs text-blue-800">
            <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
            <p>
              Las categorías configuradas aquí se reflejan instantáneamente en los filtros del directorio y en el formulario de creación y edición de cursos.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
