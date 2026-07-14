"use client";

import { useState, useEffect, useRef } from "react";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { FacilitadorFormData, State, CourseTopic, City } from "@/types";
import { PersonalInfoSection } from "./sections/PersonalInfoSection";
import { ProfessionalInfoSection } from "./sections/ProfessionalInfoSection";
import { LocationSection } from "./sections/LocationSection";
import { CourseTopicsSection } from "./sections/CourseTopicsSection";
import { FileUploadSection } from "./sections/FileUploadSection";
import { AdditionalInfoSection } from "./sections/AdditionalInfoSection";
import { FormActions } from "./sections/FormActions";
import {
  getFacilitatorByIdAction,
  createFacilitatorAction,
  updateFacilitatorAction,
} from "@/app/actions/facilitators-crud";

interface FacilitatorFormProps {
  onFacilitatorSaved: () => void;
  onCancel?: () => void;
  editId?: string | null;
}

export const FacilitatorForm = ({
  onFacilitatorSaved,
  onCancel,
  editId,
}: FacilitatorFormProps) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState<FacilitadorFormData>({
    fuente: "",
    fecha_ingreso: "",
    nombre_apellido: "",
    cedula: "",
    rif: "",
    email: "",
    telefono: "",
    direccion: "",
    nivel_educacion: "",
    formacion_docente_certificada: false,
    alcance: "",
    notas_observaciones: "",
    id_estado_geografico: null,
    id_ciudad: null,
    temas_cursos: [],
    calificacion: null,
    firma_id: null,
    tiene_curriculum: false,
    tiene_certificaciones: false,
    tiene_foto_perfil: false,
    ano_ingreso: null,
  });
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [states, setStates] = useState<State[]>([]);
  const [loadingStates, setLoadingStates] = useState(true);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [courseTopics, setCourseTopics] = useState<CourseTopic[]>([]);
  const [loadingCourseTopics, setLoadingCourseTopics] = useState(true);

  useEffect(() => {
    loadStates();
    loadCities();
    loadCourseTopics();
  }, []);

  // Load facilitator data if in edit mode
  useEffect(() => {
    if (editId) {
      const loadFacilitator = async () => {
        try {
          const result = await getFacilitatorByIdAction(editId);
          if (result.error || !result.data) {
            throw new Error(result.error || "Facilitator not found");
          }

          const facilitator = result.data;
          setFormData({
            fuente: facilitator.fuente || "",
            fecha_ingreso:
              facilitator.fecha_ingreso ||
              (facilitator.ano_ingreso
                ? `${facilitator.ano_ingreso}-01-01`
                : ""),
            nombre_apellido: facilitator.nombre_apellido || "",
            cedula: facilitator.cedula || "",
            rif: facilitator.rif || "",
            email: facilitator.email || "",
            telefono: facilitator.telefono || "",
            direccion: facilitator.direccion || "",
            nivel_educacion: facilitator.nivel_educacion || "",
            formacion_docente_certificada:
              facilitator.formacion_docente_certificada || false,
            alcance: facilitator.alcance || "",
            notas_observaciones: facilitator.notas_observaciones || "",
            id_estado_geografico: facilitator.id_estado_geografico,
            id_ciudad: facilitator.id_ciudad,
            temas_cursos: facilitator.temas_cursos || [],
            calificacion: facilitator.calificacion,
            firma_id: facilitator.firma_id,
            tiene_curriculum: facilitator.tiene_curriculum || false,
            tiene_certificaciones: facilitator.tiene_certificaciones || false,
            tiene_foto_perfil: facilitator.tiene_foto_perfil || false,
            ano_ingreso: facilitator.ano_ingreso,
          });
        } catch (error) {
          console.error("Error loading facilitator:", error);
        }
      };

      loadFacilitator();
    }
  }, [editId]);

  const loadCourseTopics = async () => {
    try {
      setLoadingCourseTopics(true);
      const response = await fetch("/api/course-topics");
      if (response.ok) {
        const data = await response.json();
        setCourseTopics(data);
      }
    } catch (error) {
      console.error("Error loading course topics:", error);
    } finally {
      setLoadingCourseTopics(false);
    }
  };

  const loadStates = async () => {
    try {
      setLoadingStates(true);
      const response = await fetch("/api/estados");
      if (response.ok) {
        const data = await response.json();
        setStates(data);
      }
    } catch (error) {
      console.error("Error loading states:", error);
    } finally {
      setLoadingStates(false);
    }
  };

  const loadCities = async () => {
    try {
      setLoadingCities(true);
      const response = await fetch("/api/ciudades");
      if (response.ok) {
        const data = await response.json();
        setCities(data);
      }
    } catch (error) {
      console.error("Error loading cities:", error);
    } finally {
      setLoadingCities(false);
    }
  };

  const handleAddCity = async (stateId: number, cityName: string) => {
    try {
      const response = await fetch("/api/ciudades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_estado: stateId, nombre_ciudad: cityName }),
      });
      if (response.ok) {
        const newCity = await response.json();
        setCities([...cities, newCity]);
      } else {
        throw new Error("Failed to add city");
      }
    } catch (error) {
      throw error;
    }
  };

  const handleInputChange = (field: keyof FacilitadorFormData, value: any) => {
    setFormData((prev: FacilitadorFormData) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    fileType: "signature",
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/gif",
      ];

      if (!allowedTypes.includes(file.type)) {
        alert("Por favor selecciona un archivo PNG, JPG o GIF");
        return;
      }

      // Validate file size (5MB max for signature)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        alert("El archivo es demasiado grande. Tamaño máximo: 5MB");
        return;
      }

      setSignatureFile(file);
    }
  };

  const { confirm: confirmUnsaved, dialog: confirmDialog } = useConfirmDialog();

  const handleCancel = () => {
    if (loading) return;

    // For new facilitators, check if any field has been filled
    if (!editId) {
      const hasChanges =
        formData.nombre_apellido !== "" ||
        formData.cedula !== "" ||
        formData.email !== "" ||
        formData.telefono !== "" ||
        formData.fuente !== "" ||
        formData.direccion !== "" ||
        formData.nivel_educacion !== "" ||
        formData.alcance !== "" ||
        formData.notas_observaciones !== "";

      if (hasChanges) {
        confirmUnsaved({
          title: "Cancelar cambios",
          message:
            "¿Estás seguro de que deseas cancelar? Los cambios no guardados se perderán.",
          confirmLabel: "Sí, cancelar",
          variant: "warning",
          onConfirm: () => onCancel?.(),
        });
      } else {
        onCancel?.();
      }
    } else {
      // For editing, always allow cancel since we're going back to the list
      onCancel?.();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.nombre_apellido ||
      !formData.cedula ||
      !formData.telefono ||
      !formData.id_estado_geografico ||
      !formData.id_ciudad
    ) {
      alert(
        "Por favor completa los campos obligatorios: Nombre, Cédula, Teléfono, Estado y Ciudad",
      );
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();

      // Add form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          formDataToSend.append(key, JSON.stringify(value));
        } else if (value !== undefined && value !== null) {
          formDataToSend.append(key, value.toString());
        }
      });

      // Add files if selected
      if (signatureFile) {
        formDataToSend.append("signature", signatureFile);
      }

      let result;
      if (editId) {
        // Update existing facilitator
        const updateData = {
          ...formData,
          fecha_ingreso: formData.fecha_ingreso || null,
          ano_ingreso: formData.fecha_ingreso
            ? new Date(formData.fecha_ingreso).getFullYear()
            : null,
        };

        result = await updateFacilitatorAction(editId, updateData);

        if (!result.error) {
          alert("Facilitador actualizado exitosamente");
          onFacilitatorSaved();
        } else {
          alert(`Error: ${result.error}`);
        }
      } else {
        // Create new facilitator
        result = await createFacilitatorAction(formDataToSend);

        if (!result.error) {
          alert("Facilitador creado exitosamente");
          onFacilitatorSaved();
        } else {
          alert(`Error: ${result.error}`);
        }
      }
    } catch (error) {
      alert("Error al guardar el facilitador. Por favor intenta nuevamente.");
      console.error("Save error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        {editId ? "Editar Facilitador" : "Registrar Nuevo Facilitador"}
      </h2>

      <FormActions
        position="top"
        onCancel={handleCancel}
        onSave={() => formRef.current?.requestSubmit()}
        loading={loading}
        saveText={editId ? "Actualizar Facilitador" : "Guardar Facilitador"}
        cancelText="Cancelar"
      />

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <PersonalInfoSection
          formData={formData}
          handleInputChange={handleInputChange}
        />

        <ProfessionalInfoSection
          formData={formData}
          handleInputChange={handleInputChange}
          states={states}
          loadingStates={loadingStates}
        />

        <LocationSection
          formData={formData}
          handleInputChange={handleInputChange}
          states={states}
          cities={cities}
          loadingStates={loadingStates}
          loadingCities={loadingCities}
          onAddCity={handleAddCity}
        />

        <CourseTopicsSection
          formData={formData}
          handleInputChange={handleInputChange}
          courseTopics={courseTopics}
          loadingCourseTopics={loadingCourseTopics}
        />

        <AdditionalInfoSection
          formData={formData}
          handleInputChange={handleInputChange}
        />

        <FileUploadSection
          signatureFile={signatureFile}
          onFileSelect={handleFileSelect}
          isEdit={!!editId}
        />

        {/* Bottom Actions */}
        <FormActions
          position="bottom"
          onCancel={handleCancel}
          loading={loading}
          saveText={editId ? "Actualizar Facilitador" : "Guardar Facilitador"}
          cancelText="Cancelar"
        />
      </form>
      {confirmDialog}
    </div>
  );
};
