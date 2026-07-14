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
import { useState, useEffect } from "react";
import { FacilitatorSelection } from "../../../gestion-de-facilitadores/components/facilitator-selection";
import { SignatureSelection } from "../../../gestion-de-firmas/components/signature-selection";

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
  const [shaSignatures, setShaSignatures] = useState([]);
  const [certificateTemplates, setCertificateTemplates] = useState([]);
  const [venezuelanStates, setVenezuelanStates] = useState([]);

  useEffect(() => {
    const loadFormData = async () => {
      try {
        // Load SHA signatures
        const signaturesResponse = await fetch("/api/signatures");
        if (signaturesResponse.ok) {
          const data = await signaturesResponse.json();
          const shaOnly = data.filter((sig: any) => sig.tipo === 'representante_sha');
          setShaSignatures(shaOnly);
          
          // Auto-select the active SHA signature
          const activeShaSignature = shaOnly.find((sig: any) => sig.is_active);
          if (activeShaSignature && !certificateData.sha_signature_id) {
            onDataChange("sha_signature_id", activeShaSignature.id.toString());
          }
        }

        // Load certificate templates
        const templatesResponse = await fetch("/api/certificate-templates");
        if (templatesResponse.ok) {
          const templates = await templatesResponse.json();
          setCertificateTemplates(templates);
          
          // Auto-select default template (first active template)
          if (templates.length > 0 && !certificateData.id_plantilla_certificado) {
            onDataChange("id_plantilla_certificado", templates[0].id);
          }
        }

        // Load Venezuelan states
        const statesResponse = await fetch("/api/venezuelan-states");
        if (statesResponse.ok) {
          const states = await statesResponse.json();
          setVenezuelanStates(states);
        }
      } catch (error) {
        console.error("Error loading form data:", error);
      }
    };

    loadFormData();
  }, []);

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

    // Additional validation for expiration date if course emits card
    if (selectedCourseTopic?.emite_carnet && !certificateData.fecha_vencimiento) {
      alert("Este curso emite carnet, por lo que la fecha de vencimiento es requerida");
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

    // Additional validation for expiration date if course emits card
    if (selectedCourseTopic?.emite_carnet && !certificateData.fecha_vencimiento) {
      alert("Este curso emite carnet, por lo que la fecha de vencimiento es requerida para la vista previa");
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Expiration Date - Only show if course emits card */}
      {selectedCourseTopic?.emite_carnet && (
        <div className="mb-4">
          <label
            htmlFor="fecha_vencimiento"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Fecha de Vencimiento (Requerido para carnet)
          </label>
          <input
            type="date"
            id="fecha_vencimiento"
            value={certificateData.fecha_vencimiento || ""}
            onChange={(e) => onDataChange("fecha_vencimiento", e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Este curso emite carnet, por lo que la fecha de vencimiento es requerida
          </p>
        </div>
      )}

      {/* Certificate Template */}
      <div className="mb-4">
        <label
          htmlFor="id_plantilla_certificado"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Plantilla de Certificado
        </label>
        <select
          id="id_plantilla_certificado"
          value={certificateData.id_plantilla_certificado || ""}
          onChange={(e) => onDataChange("id_plantilla_certificado", e.target.value ? parseInt(e.target.value) : undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Seleccionar plantilla...</option>
          {certificateTemplates.map((template: any) => (
            <option key={template.id} value={template.id}>
              {template.nombre}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Selecciona la plantilla a utilizar para este certificado
        </p>
      </div>

      {/* Venezuelan State */}
      <div className="mb-6">
        <label
          htmlFor="id_estado"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Estado
        </label>
        <select
          id="id_estado"
          value={certificateData.id_estado || ""}
          onChange={(e) => onDataChange("id_estado", e.target.value ? parseInt(e.target.value) : undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Seleccionar estado...</option>
          {venezuelanStates.map((state: any) => (
            <option key={state.id} value={state.id}>
              {state.nombre_estado}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Seleccionar Estado para fines administrativos
        </p>
      </div>

      {/* Signature Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Firmas del Certificado
        </h3>
        
        {/* Facilitator Selection */}
        <div className="mb-4">
          <FacilitatorSelection
            selectedFacilitatorId={certificateData.facilitator_id}
            onFacilitatorChange={(id: string) => {
              onDataChange("facilitator_id", id);
            }}
          />
        </div>
        
        {/* SHA Representative Signature */}
        <div>
          <label
            htmlFor="sha-signature"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Firma del Representante SHA
          </label>
          <input
            type="text"
            id="sha-signature"
            value={(() => {
              const activeSignature = shaSignatures.find((sig: any) => sig.is_active);
              return activeSignature?.nombre || "No hay firma SHA activa";
            })()}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
            placeholder="No hay firma SHA activa"
          />
          <p className="text-xs text-gray-500 mt-1">
            Las firmas SHA se gestionan en el módulo de Gestión de Firmas. 
            <a href="/dashboard/capacitacion/gestion-de-firmas" className="text-blue-600 hover:underline ml-1">
              Gestionar firmas SHA
            </a>
          </p>
        </div>
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
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Vista Previa
        </button>

        {/* Generate Button */}
        <button
          type="button"
          onClick={handleGenerateCertificate}
          disabled={isGenerating || 
            !certificateData.certificate_title ||
            !certificateData.osi_id ||
            !certificateData.course_topic_id ||
            certificateData.participants.length === 0 ||
            !certificateData.date
          }
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generando Certificados...
            </>
          ) : (
            "Generar Certificados"
          )}
        </button>
      </div>

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
