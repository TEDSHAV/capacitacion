"use client";

import {
  CertificateGeneration,
  OSI,
  CourseTopic,
  CertificateParticipant,
  CertificateFormProps,
} from "@/types";

import { ParticipantsSection } from "./ParticipantsSection";
import { CertificatePreview } from "./CertificatePreview";
import { useState } from "react";

export const CertificateForm = ({
  certificateData,
  selectedOSI,
  selectedCourseTopic,
  courseTopics,
  isGenerating = false,
  onDataChange,
  onParticipantsChange,
  onGenerate,
}: CertificateFormProps) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleGenerateCertificate = () => {
    // Validation
    if (
      !certificateData.certificate_title ||
      !certificateData.osi_id ||
      !certificateData.course_topic_id ||
      certificateData.participants.length === 0 ||
      !certificateData.date
    ) {
      alert("Por favor completa todos los campos obligatorios");
      return;
    }

    onGenerate();
  };

  const handlePreview = () => {
    // Validation for preview
    if (
      !certificateData.certificate_title ||
      !certificateData.osi_id ||
      !certificateData.course_topic_id ||
      certificateData.participants.length === 0 ||
      !certificateData.date
    ) {
      alert("Por favor completa todos los campos obligatorios para generar la vista previa");
      return;
    }

    setIsPreviewOpen(true);
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
          onChange={(e) => {
            const topicId = e.target.value;
            onDataChange("course_topic_id", topicId);
            const selectedTopic = courseTopics.find(topic => topic.id === topicId);
            onDataChange("horas_estimadas", selectedTopic?.horas_estimadas || undefined);
          }}
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

      {/* Course Duration */}
      <div className="mb-4">
        <label
          htmlFor="horas_estimadas"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Duración del Curso (horas)
        </label>
        <input
          type="number"
          id="horas_estimadas"
          value={certificateData.horas_estimadas || ""}
          onChange={(e) =>
            onDataChange("horas_estimadas", e.target.value ? parseFloat(e.target.value) : undefined)
          }
          min="0"
          step="1"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Ej: 8"
        />
        <p className="text-xs text-gray-500 mt-1">
          Duración total del curso en horas (se puede editar si es necesario)
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

      {/* Action Buttons */}
      <div className="flex space-x-3 mb-4">
        {/* Preview Button */}
        <button
          type="button"
          onClick={handlePreview}
          disabled={
            !certificateData.certificate_title ||
            !certificateData.osi_id ||
            !certificateData.course_topic_id ||
            certificateData.participants.length === 0 ||
                  !certificateData.date
          }
          className="flex-1 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          Vista Previa
        </button>

        {/* Generate Button */}
        <button
          type="button"
          onClick={handleGenerateCertificate}
          disabled={
            isGenerating ||
            !certificateData.certificate_title ||
            !certificateData.osi_id ||
            !certificateData.course_topic_id ||
            certificateData.participants.length === 0 ||
                  !certificateData.date
          }
          className="flex-1 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Generando Certificados...
            </>
          ) : (
            'Generar Certificado(s)'
          )}
        </button>
      </div>

      {/* Validation Message */}
      {(!certificateData.certificate_title ||
        !certificateData.osi_id ||
        !certificateData.course_topic_id ||
        certificateData.participants.length === 0 ||
          !certificateData.date) && (
        <p className="mt-2 text-sm text-red-600">
          Por favor completa todos los campos obligatorios
        </p>
      )}

      {/* Certificate Preview Modal */}
      <CertificatePreview
        certificateData={certificateData}
        selectedOSI={selectedOSI}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};
