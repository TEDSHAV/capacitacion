"use client";

import {
  CertificateGeneration,
  OSI,
  CourseTopic,
  CertificateParticipant,
  CertificateFormProps,
} from "@/types";
import { LocationSearch } from "./LocationSearch";
import { ParticipantsSection } from "./ParticipantsSection";

export const CertificateForm = ({
  certificateData,
  selectedOSI,
  selectedCourseTopic,
  courseTopics,
  onDataChange,
  onParticipantsChange,
  onGenerate,
}: CertificateFormProps) => {
  const handleGenerateCertificate = () => {
    // Validation
    if (
      !certificateData.certificate_title ||
      !certificateData.osi_id ||
      !certificateData.course_topic_id ||
      certificateData.participants.length === 0 ||
      !certificateData.location ||
      !certificateData.date
    ) {
      alert("Por favor completa todos los campos obligatorios");
      return;
    }

    onGenerate();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Detalles del Certificado
      </h2>

      {/* OSI Information Display */}
      {selectedOSI && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Información de la OSI
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Cliente:</span>
              <input
                type="text"
                value={selectedOSI.cliente_nombre_empresa || ""}
                readOnly
                className="ml-2 px-2 py-1 bg-white border border-gray-300 rounded text-gray-600 w-full sm:w-auto"
              />
            </div>
            <div>
              <span className="font-medium">Tema:</span>
              <input
                type="text"
                value={selectedOSI.tema || ""}
                readOnly
                className="ml-2 px-2 py-1 bg-white border border-gray-300 rounded text-gray-600 w-full sm:w-auto"
              />
            </div>
          </div>
        </div>
      )}

      {/* Certificate Title */}
      <div className="mb-4">
        <label
          htmlFor="certificate_title"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Título del Certificado *
        </label>
        <input
          type="text"
          id="certificate_title"
          value={certificateData.certificate_title}
          onChange={(e) => onDataChange("certificate_title", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Ej: Manejo de Montacargas"
        />
      </div>

      {/* Certificate Subtitle */}
      <div className="mb-4">
        <label
          htmlFor="certificate_subtitle"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Subtítulo (Opcional)
        </label>
        <input
          type="text"
          id="certificate_subtitle"
          value={certificateData.certificate_subtitle || ""}
          onChange={(e) => onDataChange("certificate_subtitle", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Ej: 5 toneladas"
        />
      </div>

      {/* Passing Grade */}
      <div className="mb-4">
        <label
          htmlFor="passing_grade"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Calificación Aprobatoria (Mínimo para aprobar)
        </label>
        <input
          type="number"
          id="passing_grade"
          value={certificateData.passing_grade || 0}
          onChange={(e) =>
            onDataChange("passing_grade", parseInt(e.target.value) || 0)
          }
          min="0"
          max="20"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Los participantes con calificación mayor o igual a este valor serán
          marcados como "Aprobado"
        </p>
      </div>

      {/* Course Template Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Seleccionar Plantilla
        </label>
        <select
          value={certificateData.course_topic_id || ""}
          onChange={(e) => onDataChange("course_topic_id", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Selecciona una plantilla...</option>
          {courseTopics.map((topic: CourseTopic) => (
            <option key={topic.id} value={topic.id}>
              {topic.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Selecciona una plantilla de curso existente
        </p>
      </div>

      {/* Course Content */}
      <div className="mb-4">
        <label
          htmlFor="course_content"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Contenido del Curso
        </label>
        <textarea
          id="course_content"
          value={certificateData.course_content || ""}
          onChange={(e) => onDataChange("course_content", e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="El contenido del curso se prellenará automáticamente desde la información de la OSI..."
        />
        <p className="text-xs text-gray-500 mt-1">
          Este campo se prellena automáticamente con el detalle de capacitación o tema de la OSI seleccionada
        </p>
      </div>

      {/* Location Search */}
      <LocationSearch
        value={certificateData.location}
        onChange={(value) => onDataChange("location", value)}
      />

      {/* Date */}
      <div className="mb-6">
        <label
          htmlFor="date"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Fecha *
        </label>
        <input
          type="date"
          id="date"
          value={certificateData.date}
          onChange={(e) => onDataChange("date", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Participants */}
      <ParticipantsSection
        participants={certificateData.participants}
        onChange={onParticipantsChange}
        passing_grade={certificateData.passing_grade}
      />

      {/* Generate Button */}
      <button
        type="button"
        onClick={handleGenerateCertificate}
        disabled={
          !certificateData.certificate_title ||
          !certificateData.osi_id ||
          !certificateData.course_topic_id ||
          certificateData.participants.length === 0 ||
          !certificateData.location ||
          !certificateData.date
        }
        className="w-full py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
      >
        Generar Certificado(s)
      </button>

      {/* Validation Message */}
      {(!certificateData.certificate_title ||
        !certificateData.osi_id ||
        !certificateData.course_topic_id ||
        certificateData.participants.length === 0 ||
        !certificateData.location ||
        !certificateData.date) && (
        <p className="mt-2 text-sm text-red-600">
          Por favor completa todos los campos obligatorios
        </p>
      )}
    </div>
  );
};
