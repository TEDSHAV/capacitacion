"use client";

import { useState } from "react";
import { Facilitator } from "@/types";

interface FacilitatorFormProps {
  onFacilitatorSaved: () => void;
}

export const FacilitatorForm = ({ onFacilitatorSaved }: FacilitatorFormProps) => {
  const [formData, setFormData] = useState({
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
    id_estado_base: "" as string,
    id_ciudad_base: "" as string,
    id_estado_geografico: "" as string,
    id_estatus: 1, // Default active status
    temas_cursos: [] as string[],
    ficha_tecnica: "",
    calificacion: undefined as number | undefined,
    url_curriculum: "",
    firma_id: "" as string,
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [topicInput, setTopicInput] = useState("");

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const addTopic = () => {
    if (topicInput.trim() && !formData.temas_cursos.includes(topicInput.trim())) {
      setFormData(prev => ({
        ...prev,
        temas_cursos: [...prev.temas_cursos, topicInput.trim()],
      }));
      setTopicInput("");
    }
  };

  const removeTopic = (topicToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      temas_cursos: prev.temas_cursos.filter(topic => topic !== topicToRemove),
    }));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type (PDF, DOC, DOCX)
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        alert("Por favor selecciona un archivo PDF, DOC o DOCX");
        return;
      }
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert("El archivo es demasiado grande. Tamaño máximo: 10MB");
        return;
      }
      
      setResumeFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre_apellido || !formData.cedula || !formData.email || !formData.telefono) {
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
          id_estado_base: "",
          id_ciudad_base: "",
          id_estado_geografico: "",
          id_estatus: 1,
          temas_cursos: [],
          ficha_tecnica: "",
          calificacion: undefined,
          url_curriculum: "",
          firma_id: "",
        });
        setResumeFile(null);
        setTopicInput("");
        
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-900">Información Personal</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={formData.nombre_apellido}
                onChange={(e) => handleInputChange("nombre_apellido", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Juan Pérez"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cédula de Identidad *
              </label>
              <input
                type="text"
                value={formData.cedula}
                onChange={(e) => handleInputChange("cedula", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: V-12345678"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono *
              </label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => handleInputChange("telefono", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: 0414-1234567"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RIF
              </label>
              <input
                type="text"
                value={formData.rif}
                onChange={(e) => handleInputChange("rif", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: J-123456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Año de Ingreso
              </label>
              <input
                type="number"
                value={formData.ano_ingreso}
                onChange={(e) => handleInputChange("ano_ingreso", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: 2020"
                min="1900"
                max={new Date().getFullYear()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fuente
              </label>
              <input
                type="text"
                value={formData.fuente}
                onChange={(e) => handleInputChange("fuente", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Referencia, LinkedIn, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nivel Técnico
              </label>
              <input
                type="text"
                value={formData.nivel_tecnico}
                onChange={(e) => handleInputChange("nivel_tecnico", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Ingeniero, Técnico, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Formación Docente Certificada
              </label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.formacion_docente_certificada}
                  onChange={(e) => handleInputChange("formacion_docente_certificada", e.target.checked)}
                  className="mr-2"
                />
                <label className="text-sm text-gray-700">
                  Sí, tiene formación docente certificada
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Impacto
              </label>
              <select
                value={formData.tipo_impacto}
                onChange={(e) => handleInputChange("tipo_impacto", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar...</option>
                <option value="N">Nacional</option>
                <option value="R">Regional</option>
                <option value="L">Local</option>
              </select>
            </div>
          </div>

          {/* Location and Professional Info */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-900">Ubicación y Profesión</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID Estado Base
              </label>
              <input
                type="number"
                value={formData.id_estado_base}
                onChange={(e) => handleInputChange("id_estado_base", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ID Estado (ej: 1)"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID Ciudad *
              </label>
              <input
                type="number"
                value={formData.id_ciudad_base}
                onChange={(e) => handleInputChange("id_ciudad_base", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ID Ciudad (ej: 1)"
                required
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID Estado Geográfico
              </label>
              <input
                type="number"
                value={formData.id_estado_geografico}
                onChange={(e) => handleInputChange("id_estado_geografico", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ID Estado Geográfico (ej: 1)"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID Firma
              </label>
              <input
                type="number"
                value={formData.firma_id}
                onChange={(e) => handleInputChange("firma_id", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ID Firma (opcional)"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dirección
              </label>
              <textarea
                value={formData.direccion}
                onChange={(e) => handleInputChange("direccion", e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Calle 123, Urbanización XYZ"
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
        </div>

        {/* Course Topics */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Temas de Curso que puede Dictar
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic())}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: Manejo de Montacargas"
            />
            <button
              type="button"
              onClick={addTopic}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Agregar
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.temas_cursos.map((topic: string, index: number) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
              >
                {topic}
                <button
                  type="button"
                  onClick={() => removeTopic(topic)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Technical Knowledge */}
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

        {/* Notes and Observations */}
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

        {/* Resume Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Currículum Vitae (PDF, DOC, DOCX - Máx. 10MB)
          </label>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {resumeFile && (
            <p className="text-sm text-gray-600 mt-1">
              Archivo seleccionado: {resumeFile.name}
            </p>
          )}
        </div>

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
