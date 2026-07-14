"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { FacilitadorFormData, State, CourseTopic } from "@/types";
import { PersonalInfoSection } from "./facilitator-form/PersonalInfoSection";
import { ProfessionalInfoSection } from "./facilitator-form/ProfessionalInfoSection";
import { LocationSection } from "./facilitator-form/LocationSection";
import { CourseTopicsSection } from "./facilitator-form/CourseTopicsSection";
import { FileUploadSection } from "./facilitator-form/FileUploadSection";
import { AdditionalInfoSection } from "./facilitator-form/AdditionalInfoSection";
import { FormActions } from "./facilitator-form/FormActions";

interface FacilitatorFormProps {
  onFacilitatorSaved: () => void;
  onCancel?: () => void;
  editId?: string | null;
}

export const FacilitatorForm = ({ onFacilitatorSaved, onCancel, editId }: FacilitatorFormProps) => {
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
    nivel_tecnico: "",
    formacion_docente_certificada: false,
    alcance: "",
    notas_observaciones: "",
    id_estado_base: null,
    id_ciudad_base: null,
    id_estado_geografico: null,
    id_estatus: null,
    temas_cursos: [],
    ficha_tecnica: "",
    calificacion: null,
    url_curriculum: "",
    firma_id: null,
    tiene_curriculum: false,
    tiene_certificaciones: false,
    tiene_foto_perfil: false,
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [states, setStates] = useState<State[]>([]);
  const [loadingStates, setLoadingStates] = useState(true);
  const [courseTopics, setCourseTopics] = useState<CourseTopic[]>([]);
  const [loadingCourseTopics, setLoadingCourseTopics] = useState(true);

  useEffect(() => {
    loadStates();
    loadCourseTopics();
  }, []);

  // Load facilitator data if in edit mode
  useEffect(() => {
    if (editId) {
      const loadFacilitator = async () => {
        try {
          const response = await fetch(`/api/facilitators/${editId}`);
          if (response.ok) {
            const facilitator = await response.json();
            setFormData({
              fuente: facilitator.fuente || "",
              fecha_ingreso: facilitator.fecha_ingreso || (facilitator.ano_ingreso ? `${facilitator.ano_ingreso}-01-01` : ""),
              nombre_apellido: facilitator.nombre_apellido || "",
              cedula: facilitator.cedula || "",
              rif: facilitator.rif || "",
              email: facilitator.email || "",
              telefono: facilitator.telefono || "",
              direccion: facilitator.direccion || "",
              nivel_tecnico: facilitator.nivel_tecnico || "",
              formacion_docente_certificada: facilitator.formacion_docente_certificada || false,
              alcance: facilitator.alcance || "",
              notas_observaciones: facilitator.notas_observaciones || "",
              id_estado_base: facilitator.id_estado_base,
              id_ciudad_base: facilitator.id_ciudad_base,
              id_estado_geografico: facilitator.id_estado_geografico,
              id_estatus: facilitator.id_estatus,
              temas_cursos: facilitator.temas_cursos || [],
              ficha_tecnica: facilitator.ficha_tecnica || "",
              calificacion: facilitator.calificacion,
              url_curriculum: facilitator.url_curriculum || "",
              firma_id: facilitator.firma_id,
              tiene_curriculum: facilitator.tiene_curriculum || false,
              tiene_certificaciones: facilitator.tiene_certificaciones || false,
              tiene_foto_perfil: facilitator.tiene_foto_perfil || false,
            });
          }
        } catch (error) {
          console.error('Error loading facilitator:', error);
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

  const handleInputChange = (field: keyof FacilitadorFormData, value: any) => {
    setFormData((prev: FacilitadorFormData) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    fileType: "resume" | "signature",
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes =
        fileType === "resume"
          ? [
              "application/pdf",
              "application/msword",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ]
          : ["image/png", "image/jpeg", "image/jpg", "image/gif"];

      if (!allowedTypes.includes(file.type)) {
        const fileTypeText =
          fileType === "resume" ? "PDF, DOC o DOCX" : "PNG, JPG o GIF";
        alert(`Por favor selecciona un archivo ${fileTypeText}`);
        return;
      }

      // Validate file size (10MB max for resume, 5MB max for signature)
      const maxSize =
        fileType === "resume" ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        const sizeText = fileType === "resume" ? "10MB" : "5MB";
        alert(`El archivo es demasiado grande. Tamaño máximo: ${sizeText}`);
        return;
      }

      if (fileType === "resume") {
        setResumeFile(file);
      } else {
        setSignatureFile(file);
      }
    }
  };

  const handleCancel = () => {
    if (loading) return;
    
    // For new facilitators, check if any field has been filled
    if (!editId) {
      const hasChanges = formData.nombre_apellido !== "" || 
                        formData.cedula !== "" || 
                        formData.email !== "" || 
                        formData.telefono !== "" ||
                        formData.fuente !== "" ||
                        formData.direccion !== "" ||
                        formData.nivel_tecnico !== "" ||
                        formData.alcance !== "" ||
                        formData.notas_observaciones !== "";
      
      if (hasChanges) {
        if (confirm("¿Estás seguro de que deseas cancelar? Los cambios no guardados se perderán.")) {
          onCancel?.();
        }
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
      !formData.email ||
      !formData.telefono
    ) {
      alert("Por favor completa los campos obligatorios");
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
      if (resumeFile) {
        formDataToSend.append("resume", resumeFile);
      }
      if (signatureFile) {
        formDataToSend.append("signature", signatureFile);
      }

      let response;
      if (editId) {
        // Update existing facilitator - send as JSON
        const updateData = {
          ...formData,
          fecha_ingreso: formData.fecha_ingreso || null,
          ano_ingreso: formData.fecha_ingreso ? new Date(formData.fecha_ingreso).getFullYear() : null,
        };
        
                
        response = await fetch(`/api/facilitators/${editId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        });
        
        if (response.ok) {
          alert('Facilitador actualizado exitosamente');
          onFacilitatorSaved();
        } else {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || 'Error al actualizar el facilitador';
                    alert(`Error: ${errorMessage}`);
        }
      } else {
        // Create new facilitator - send as FormData for file upload
        response = await fetch('/api/facilitators/', {
          method: 'POST',
          body: formDataToSend,
        });
        
        if (response.ok) {
          alert('Facilitador creado exitosamente');
          onFacilitatorSaved();
        } else {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || 'Error al crear el facilitador';
          alert(`Error: ${errorMessage}`);
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
          loadingStates={loadingStates}
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
          resumeFile={resumeFile}
          signatureFile={signatureFile}
          onFileSelect={handleFileSelect}
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
    </div>
  );
};
