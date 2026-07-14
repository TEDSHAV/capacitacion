"use client";

import { useState, useEffect } from "react";
import { FacilitadorFormData, State, CourseTopic } from "@/types";
import { PersonalInfoSection } from "./facilitator-form/PersonalInfoSection";
import { ProfessionalInfoSection } from "./facilitator-form/ProfessionalInfoSection";
import { LocationSection } from "./facilitator-form/LocationSection";
import { CourseTopicsSection } from "./facilitator-form/CourseTopicsSection";
import { FileUploadSection } from "./facilitator-form/FileUploadSection";

// Temporary inline component to bypass import issue
const AdditionalInfoSection = ({ formData, handleInputChange }: { formData: FacilitadorFormData; handleInputChange: (field: keyof FacilitadorFormData, value: any) => void; }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-md font-medium text-gray-900">Información Adicional</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Conocimientos Técnicos
        </label>
        <textarea
          value={formData.ficha_tecnica}
          onChange={(e) => handleInputChange("ficha_tecnica", e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Describe los conocimientos técnicos y experiencia del facilitador..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notas y Observaciones
        </label>
        <textarea
          value={formData.notas_observaciones}
          onChange={(e) => handleInputChange("notas_observaciones", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Notas adicionales sobre el facilitador..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rating (para implementación futura)
        </label>
        <input
          type="number"
          min="1"
          max="5"
          step="0.1"
          value={formData.calificacion || ""}
          onChange={(e) => handleInputChange("calificacion", e.target.value ? parseFloat(e.target.value) : undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="1-5"
          disabled
        />
        <p className="text-xs text-gray-500 mt-1">Esta funcionalidad se implementará próximamente</p>
      </div>
    </div>
  );
};

interface FacilitatorFormProps {
  onFacilitatorSaved: () => void;
}

export const FacilitatorForm = ({
  onFacilitatorSaved,
}: FacilitatorFormProps) => {
  const [formData, setFormData] = useState<FacilitadorFormData>({
    fuente: "",
    ano_ingreso: "" as string,
    nombre_apellido: "",
    cedula: "",
    rif: "",
    email: "",
    telefono: "",
    direccion: "",
    nivel_tecnico: "",
    formacion_docente_certificada: false,
    tipo_impacto: "",
    notas_observaciones: "",
    id_ciudad_base: "" as string,
    id_estado_geografico: "" as string,
    id_estatus: 1, // Default active status
    temas_cursos: [] as string[],
    ficha_tecnica: "",
    calificacion: undefined as number | undefined,
    url_curriculum: "",
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [states, setStates] = useState<State[]>([]);
  const [loadingStates, setLoadingStates] = useState(true);
  const [courseTopics, setCourseTopics] = useState<CourseTopic[]>([]);
  const [loadingCourseTopics, setLoadingCourseTopics] = useState(true);

  useEffect(() => {
    loadStates();
    loadCourseTopics();
  }, []);

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

    setUploading(true);
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

      // Add resume file if selected
      if (resumeFile) {
        formDataToSend.append("resume", resumeFile);
      }

      const response = await fetch("/api/facilitators", {
        method: "POST",
        body: formDataToSend,
      });

      if (response.ok) {
        alert("Facilitador guardado exitosamente");

        // Reset form
        setFormData({
          fuente: "",
          ano_ingreso: "",
          nombre_apellido: "",
          cedula: "",
          rif: "",
          email: "",
          telefono: "",
          direccion: "",
          nivel_tecnico: "",
          formacion_docente_certificada: false,
          tipo_impacto: "",
          notas_observaciones: "",
          id_ciudad_base: "",
          id_estado_geografico: "",
          id_estatus: 1,
          temas_cursos: [],
          ficha_tecnica: "",
          calificacion: undefined,
          url_curriculum: "",
        });
        setResumeFile(null);
        setSignatureFile(null);

        onFacilitatorSaved();
      } else {
        throw new Error("Error al guardar el facilitador");
      }
    } catch (error) {
      alert("Error al guardar el facilitador. Por favor intenta nuevamente.");
      console.error("Save error:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Registrar Nuevo Facilitador
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
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

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={uploading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {uploading ? "Guardando..." : "Guardar Facilitador"}
          </button>
        </div>
      </form>
    </div>
  );
};
