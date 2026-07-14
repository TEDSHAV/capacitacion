"use client";

import { useState } from "react";
import { CertificateFormProps } from "@/types";
import { ParticipantsSection } from "./ParticipantsSection";
import { CertificatePreview } from "./CertificatePreview";
import { CourseTemplateSection } from "./CourseTemplateSection";
import { SignatureSection } from "./SignatureSection";
import { FormActionButtons } from "./FormActionButtons";
import { useCertificateForm } from "./use-certificate-form";

export const CertificateForm = ({
  certificateData,
  selectedOSI,
  selectedCourseTopic,
  courseTopics,
  isGenerating = false,
  isEditMode = false,
  generationProgress,
  onDataChange,
  onParticipantsChange,
  onGenerate,
}: CertificateFormProps) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const { shaSignatures, courseTemplates } = useCertificateForm({
    certificateData,
    selectedOSI,
    selectedCourseTopic,
    isEditMode,
    onDataChange,
  });

  const isBaseFormValid =
    !!certificateData.certificate_title &&
    !!certificateData.osi_id &&
    !!certificateData.course_topic_id &&
    certificateData.participants.length > 0 &&
    !!certificateData.date;

  const isCarnetValid =
    !selectedCourseTopic?.emite_carnet || !!certificateData.fecha_vencimiento;

  const handleGenerateCertificate = () => {
    if (!isBaseFormValid) {
      alert("Por favor completa todos los campos obligatorios");
      return;
    }
    if (!isCarnetValid) {
      alert(
        "Este curso emite carnet, por lo que la fecha de vencimiento es requerida",
      );
      return;
    }
    onGenerate();
  };

  const handlePreview = () => {
    if (!isBaseFormValid) {
      alert(
        "Por favor completa todos los campos obligatorios para generar la vista previa",
      );
      return;
    }
    if (!isCarnetValid) {
      alert(
        "Este curso emite carnet, por lo que la fecha de vencimiento es requerida para la vista previa",
      );
      return;
    }
    setIsPreviewOpen(true);
  };

  return (
    <div
      className={`bg-white border rounded-lg p-6 ${isEditMode ? "border-orange-300 shadow-sm" : "border-gray-200"}`}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Detalles del Certificado
        </h2>
        {isEditMode && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 border border-orange-200">
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Modo Edición
          </span>
        )}
      </div>

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
          placeholder="Ej: Manejo de Montacargas (se autocompletará con el nombre del curso seleccionado)"
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

      <CourseTemplateSection
        courseTemplates={courseTemplates}
        courseTemplateId={certificateData.course_template_id}
        courseContent={certificateData.course_content}
        contentFont={certificateData.content_font}
        selectedCourseTopic={selectedCourseTopic}
        selectedOSI={selectedOSI}
        onDataChange={onDataChange}
      />

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
            onDataChange(
              "horas_estimadas",
              e.target.value ? parseFloat(e.target.value) : undefined,
            )
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

      {/* Date */}
      <div className="mb-4">
        <label
          htmlFor="date"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Fecha de Emisión *
        </label>
        <input
          type="date"
          id="date"
          value={certificateData.date}
          onChange={(e) => onDataChange("date", e.target.value)}
          className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Selecciona la fecha haciendo clic en el campo
        </p>
      </div>

      {/* Expiration Date - Only show if course emits card */}
      {selectedCourseTopic?.emite_carnet && (
        <div className="mb-4">
          <label
            htmlFor="fecha_vencimiento_years"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Vigencia del Carnet (Requerido para carnet)
          </label>
          <select
            id="fecha_vencimiento_years"
            value={(() => {
              if (!certificateData.fecha_vencimiento) return "";
              const base = certificateData.date
                ? new Date(certificateData.date + "T00:00:00")
                : new Date();
              for (let y = 1; y <= 5; y++) {
                const exp = new Date(base);
                exp.setFullYear(exp.getFullYear() + y);
                if (
                  exp.toISOString().slice(0, 10) ===
                  certificateData.fecha_vencimiento
                )
                  return String(y);
              }
              return "";
            })()}
            onChange={(e) => {
              const years = Number(e.target.value);
              if (!years) {
                onDataChange("fecha_vencimiento", undefined);
                return;
              }
              const base = certificateData.date
                ? new Date(certificateData.date + "T00:00:00")
                : new Date();
              const exp = new Date(base);
              exp.setFullYear(exp.getFullYear() + years);
              onDataChange("fecha_vencimiento", exp.toISOString().slice(0, 10));
            }}
            className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Seleccionar vigencia</option>
            {[1, 2, 3, 4, 5].map((y) => (
              <option key={y} value={y}>
                {y} {y === 1 ? "año" : "años"}
              </option>
            ))}
          </select>
          {certificateData.fecha_vencimiento && (
            <p className="text-xs text-gray-500 mt-1">
              Vence el:{" "}
              {new Date(
                certificateData.fecha_vencimiento + "T00:00:00",
              ).toLocaleDateString("es-VE", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      )}

      <SignatureSection
        shaSignatures={shaSignatures}
        facilitatorId={certificateData.facilitator_id}
        shaSignatureId={certificateData.sha_signature_id}
        onDataChange={onDataChange}
      />

      {/* Participants */}
      <ParticipantsSection
        participants={certificateData.participants}
        onChange={onParticipantsChange}
        passing_grade={certificateData.passing_grade}
        isEditMode={isEditMode}
      />

      <FormActionButtons
        isGenerating={isGenerating}
        isEditMode={isEditMode}
        isDisabled={!isBaseFormValid}
        generationProgress={generationProgress}
        onPreview={handlePreview}
        onGenerate={handleGenerateCertificate}
      />

      {/* Certificate Preview Modal */}
      <CertificatePreview
        certificateData={certificateData}
        selectedOSI={selectedOSI}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        selectedCourse={selectedCourseTopic}
      />
    </div>
  );
};
