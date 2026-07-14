"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { CapacitacionClientProps, PlantillaCarnet } from "@/types";
import { setActiveTemplate } from "@/app/actions/template-actions";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

export default function PlantillasCarnetsPage({
  user,
}: CapacitacionClientProps) {
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [plantillas, setPlantillas] = useState<PlantillaCarnet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    archivo: null as File | null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadPlantillas();
  }, []);

  const loadPlantillas = async () => {
    try {
      console.log("Loading carnet plantillas...");
      const { data, error } = await supabase
        .from("plantillas_carnets")
        .select("*")
        .order("created_at", { ascending: false });

      console.log("Load response:", { data, error });

      if (error) {
        console.error("Supabase load error:", error);
        throw new Error(
          error.message || "Error al cargar las plantillas de carnet",
        );
      }

      setPlantillas(data || []);
    } catch (error) {
      console.error("Error loading plantillas:", error);
      alert(
        `Error al cargar las plantillas de carnet: ${error instanceof Error ? error.message : "Error desconocido"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      alert("Por favor ingresa un nombre para la plantilla");
      return;
    }

    if (!formData.archivo) {
      alert("Por favor selecciona un archivo de imagen");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload file to server
      const uploadFormData = new FormData();
      uploadFormData.append("file", formData.archivo);
      uploadFormData.append("type", "carnet");

      const uploadResponse = await fetch("/api/upload-template", {
        method: "POST",
        body: uploadFormData,
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResult.success) {
        throw new Error(`Error al subir archivo: ${uploadResult.error}`);
      }

      // Check if this is the first template (auto-activate)
      const isFirstTemplate = plantillas.length === 0;

      // Create template record in database with uploaded file info
      const { data: newTemplate, error: insertError } = await supabase
        .from("plantillas_carnets")
        .insert({
          nombre: formData.nombre.trim(),
          archivo: uploadResult.fileName,
          url_imagen: uploadResult.url,
          tipo: "carnet",
          is_active: isFirstTemplate,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Error al guardar plantilla: ${insertError.message}`);
      }

      // Reset form and reload
      setFormData({ nombre: "", archivo: null });
      setPreviewFile(null);
      setShowForm(false);
      loadPlantillas();

      alert("¡Plantilla de carnet creada exitosamente!");
    } catch (error) {
      console.error("Error creating plantilla:", error);
      alert(
        `Error al crear plantilla: ${error instanceof Error ? error.message : "Error desconocido"}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetActive = async (id: number) => {
    try {
      const result = await setActiveTemplate(id, "carnet");
      if (result.success) {
        loadPlantillas(); // Reload to show active status
        alert("¡Plantilla activa actualizada exitosamente!");
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert("Error al actualizar plantilla activa");
    }
  };

  const handleDeactivate = (id: number) => {
    // Count active plantillas
    const activeCount = plantillas.filter((p) => p.is_active).length;
    if (activeCount <= 1) {
      alert(
        "Debe haber al menos una plantilla activa. Para cambiar la plantilla activa, establezca otra como activa.",
      );
      return;
    }

    confirm({
      title: "Desactivar Plantilla de Carnet",
      message:
        "¿Estás seguro de que deseas desactivar esta plantilla de carnet? Dejará de estar disponible para nuevas generaciones.",
      confirmLabel: "Desactivar",
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from("plantillas_carnets")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("id", id);

          if (error)
            throw new Error(error.message || "Error al desactivar plantilla");
          loadPlantillas();
        } catch (error) {
          console.error("Error deactivating plantilla:", error);
          alert("Error al desactivar la plantilla");
        }
      },
    });
  };

  const handlePermanentDelete = (id: number, isActive: boolean) => {
    if (isActive) {
      alert(
        "No puedes eliminar la plantilla activa. Primero establece otra como activa.",
      );
      return;
    }

    confirm({
      title: "Eliminar Plantilla Permanentemente",
      message:
        "¿Estás seguro de que deseas eliminar esta plantilla de carnet permanentemente? Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from("plantillas_carnets")
            .delete()
            .eq("id", id);

          if (error)
            throw new Error(error.message || "Error al eliminar plantilla");
          loadPlantillas();
        } catch (error) {
          console.error("Error deleting plantilla:", error);
          alert(
            `Error al eliminar: ${error instanceof Error ? error.message : "Error desconocido"}`,
          );
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">
            Cargando plantillas de carnet...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Plantillas de Carnet
        </h1>
        <p className="mt-2 text-gray-600">
          Administra las plantillas de diseño para los carnets de capacitación
        </p>
      </div>

      <div className="mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {showForm ? "Cancelar" : "Nueva Plantilla de Carnet"}
        </button>
      </div>

      {showForm && (
        <div className="mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Nueva Plantilla de Carnet
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Plantilla
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Carnet Estándar 2024"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Archivo de Imagen (PNG/JPG)
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setFormData({ ...formData, archivo: file });
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () =>
                      setPreviewFile(reader.result as string);
                    reader.readAsDataURL(file);
                  } else {
                    setPreviewFile(null);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Formato recomendado: PNG, tamaño de tarjeta de crédito (85.6mm ×
                53.98mm)
              </p>
            </div>

            {previewFile && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vista previa
                </label>
                <div className="aspect-[1.586/1] max-w-xs bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={previewFile}
                    alt="Vista previa"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Creando..." : "Crear Plantilla"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setPreviewFile(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plantillas.map((plantilla) => (
          <div
            key={plantilla.id}
            className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${plantilla.is_active ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
          >
            {plantilla.is_active && (
              <div className="mb-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Activa
                </span>
              </div>
            )}

            <div className="aspect-[1.586/1] bg-gray-100 rounded-lg mb-4 overflow-hidden">
              {plantilla.url_imagen &&
              plantilla.url_imagen !== "/templates/carnet.png" ? (
                <img
                  src={plantilla.url_imagen}
                  alt={plantilla.nombre}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback to default carnet image if uploaded file doesn't exist
                    (e.target as HTMLImageElement).src =
                      "/templates/carnet.png";
                  }}
                />
              ) : (
                <img
                  src="/templates/carnet.png"
                  alt={plantilla.nombre}
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            <h3 className="font-semibold text-gray-900 mb-2">
              {plantilla.nombre}
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              Archivo: {plantilla.archivo}
            </p>
            <p className="text-xs text-gray-400 mb-4">
              Creada:{" "}
              {new Date(plantilla.created_at).toLocaleDateString("es-VE")}
            </p>

            <div className="flex flex-col space-y-2">
              {!plantilla.is_active && (
                <button
                  onClick={() => handleSetActive(plantilla.id)}
                  className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                >
                  Establecer como Activa
                </button>
              )}
              <div className="flex space-x-2">
                <button
                  onClick={() =>
                    window.open(
                      plantilla.url_imagen || "/templates/carnet.png",
                      "_blank",
                    )
                  }
                  className="flex-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  Ver
                </button>
                {plantilla.is_active ? (
                  <button
                    onClick={() => handleDeactivate(plantilla.id)}
                    className="flex-1 px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors"
                  >
                    Desactivar
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      handlePermanentDelete(plantilla.id, !!plantilla.is_active)
                    }
                    className="flex-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {plantillas.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay plantillas de carnet
          </h3>
          <p className="text-gray-500 mb-4">
            Crea tu primera plantilla de carnet para empezar a personalizar los
            diseños
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Crear Primera Plantilla
          </button>
        </div>
      )}
      {confirmDialog}
    </div>
  );
}
