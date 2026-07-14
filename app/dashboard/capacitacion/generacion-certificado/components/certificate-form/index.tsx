"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { CourseTopic, CertificateFormProps, Signature } from "@/types";

const RichTextEditor = dynamic(() => import("@/components/ui/rich-text-editor"), { ssr: false });

import { ParticipantsSection } from "./ParticipantsSection";
import { CertificatePreview } from "./CertificatePreview";
import { getSignaturesForDropdownAction, getCourseTemplatesByOSIAction } from "@/app/actions/dropdown-data";
import { FacilitatorSelection } from "@/app/dashboard/capacitacion/participantes/gestion-de-facilitadores/components/facilitator-selection";

export const CertificateForm = ({
  certificateData,
  selectedOSI,
  selectedCourseTopic,
  courseTopics,
  isGenerating = false,
  generationProgress,
  onDataChange,
  onParticipantsChange,
  onGenerate,
}: CertificateFormProps) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [shaSignatures, setShaSignatures] = useState<Signature[]>([]);
  const [courseTemplates, setCourseTemplates] = useState<any[]>([]);
  
  useEffect(() => {
    const loadFormData = async () => {
      try {
        // Load SHA signatures
        const signaturesResult = await getSignaturesForDropdownAction();
        if (signaturesResult.data) {
          const shaOnly = signaturesResult.data.filter(
            (sig: any) => sig.tipo === "representante_sha",
          );
          setShaSignatures(shaOnly as Signature[]);

          // Auto-select the active SHA signature
          const activeShaSignature = shaOnly.find(
            (sig: any) => sig.is_active,
          );

          if (activeShaSignature) {
            // Always set the SHA signature ID, even if one is already selected
            onDataChange("sha_signature_id", activeShaSignature.id.toString());
          }
        }

        // Load course templates (all active templates initially)
        const courseTemplatesResult = await getCourseTemplatesByOSIAction();
        if (courseTemplatesResult.data) {
          const courseTemplates = courseTemplatesResult.data;
          setCourseTemplates(courseTemplates);
        }

        // Set generate_documents to true by default
        onDataChange("generate_documents", true);
      } catch (error) {
        // Error loading form data
      }
    };

    loadFormData();
  }, []); // Only run once on mount

  // Separate effect to handle SHA signature data when certificateData changes
  useEffect(() => {
    const ensureSHASignatureData = async () => {
      if (certificateData.sha_signature_id && !certificateData.sha_signature_data) {
        try {
          const signaturesResult = await getSignaturesForDropdownAction();
          if (signaturesResult.data) {
            const shaSignatures = signaturesResult.data.filter((sig: any) => sig.tipo === 'representante_sha');
            const selectedSHASignature = shaSignatures.find((sig: any) => sig.id.toString() === certificateData.sha_signature_id);
            if (selectedSHASignature) {
              onDataChange("sha_signature_data", selectedSHASignature);
            }
          }
        } catch (error) {
        }
      }
    };

    ensureSHASignatureData();
  }, [certificateData.sha_signature_id, certificateData.sha_signature_data]);

  // Effect to load course templates when course changes
  useEffect(() => {
    const loadCourseTemplates = async () => {
      try {
        // Use cursos_id (cursos.id) not id (catalogo_servicios.id) — plantillas_cursos.id_curso FK → cursos
        const courseId = selectedCourseTopic?.cursos_id?.toString();
        // Get empresaId from selectedOSI to filter by company-specific templates
        const empresaId = selectedOSI?.empresa_id?.toString();

        const templatesResult = await getCourseTemplatesByOSIAction(courseId, empresaId);

        if (templatesResult.data) {
          const templates = templatesResult.data;

          // Add original course content as first option if course exists
          const allOptions = selectedCourseTopic ? [
            {
              id: 'original-course',
              descripcion: selectedCourseTopic.nombre || 'Contenido base del curso',
              contenido: selectedCourseTopic.contenido_curso || ''
            },
            ...templates
          ] : templates;

          setCourseTemplates(allOptions);
          
          // Logic for auto-selecting the best template
          let templateToSelect = 'original-course';
          let contentToUse = selectedCourseTopic?.contenido_curso || '';

          // Check if there's a specific template for this course and company
          if (courseId && empresaId) {
            const companySpecificTemplate = templates.find(
              (t: any) => t.id_curso?.toString() === courseId && t.id_empresa?.toString() === empresaId
            );
            
            if (companySpecificTemplate) {
              templateToSelect = companySpecificTemplate.id.toString();
              contentToUse = companySpecificTemplate.contenido || '';
            }
          }

          // Update the form data
          onDataChange("course_template_id", templateToSelect);
          onDataChange("course_content", contentToUse);
        }
      } catch (error) {
        // Continue without templates
      }
    };

    loadCourseTemplates();
  }, [selectedCourseTopic?.id, selectedCourseTopic?.contenido_curso, selectedCourseTopic?.name, selectedOSI?.empresa_id]);

  // Effect to set default course content when course topic changes (but no template selected)
  useEffect(() => {
    if (selectedCourseTopic && !certificateData.course_template_id) {
      // Use course's default content if available
      if (selectedCourseTopic.contenido_curso) {
        onDataChange("course_content", selectedCourseTopic.contenido_curso);
      }
    }
  }, [selectedCourseTopic?.id, selectedCourseTopic?.contenido_curso, certificateData.course_template_id]);

  // Effect to sync id_estado from selectedOSI
  useEffect(() => {
    if (selectedOSI?.id_estado) {
      onDataChange("id_estado", selectedOSI.id_estado);
    }
  }, [selectedOSI?.id]);

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
    if (
      selectedCourseTopic?.emite_carnet &&
      !certificateData.fecha_vencimiento
    ) {
      alert(
        "Este curso emite carnet, por lo que la fecha de vencimiento es requerida",
      );
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
      alert(
        "Por favor completa todos los campos obligatorios para generar la vista previa",
      );
      return;
    }

    // Additional validation for expiration date if course emits card
    if (
      selectedCourseTopic?.emite_carnet &&
      !certificateData.fecha_vencimiento
    ) {
      alert(
        "Este curso emite carnet, por lo que la fecha de vencimiento es requerida para la vista previa",
      );
      return;
    }

    setIsPreviewOpen(true);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Detalles del Certificado
      </h2>

      
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

      {/* Course Template Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Seleccionar Plantilla
        </label>
        <select
          value={certificateData.course_template_id || ""}
          onChange={(e) => {
            const templateId = e.target.value;
            onDataChange("course_template_id", templateId);
            
            if (templateId) {
              // Find selected template and load its content
              const selectedTemplate = courseTemplates.find(
                (template: any) => template.id.toString() === templateId,
              );
              
              if (selectedTemplate) {
                onDataChange("course_content", selectedTemplate.contenido || '');
              } else {
                // Fallback to course content if template not found
                onDataChange("course_content", selectedCourseTopic?.contenido_curso || '');
              }
            } else {
              // No template selected, use course's default content
              onDataChange("course_content", selectedCourseTopic?.contenido_curso || '');
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={!selectedOSI}
        >
          <option value="">Selecciona una plantilla...</option>
          {courseTemplates.map((template: any) => {
            let label = template.nombre || template.descripcion || `Plantilla ${template.id}`;
            
            if (template.id === 'original-course') {
              label = selectedCourseTopic?.nombre || 'Contenido base del curso';
            } else if (template.empresas) {
              const courseName = selectedCourseTopic?.nombre || '';
              const companyName = template.empresas.razon_social || '';
              label = `${courseName} ${companyName}`;
            } else if (template.id_curso) {
              const courseName = selectedCourseTopic?.nombre || '';
              label = `${courseName} - ${template.descripcion}`;
            }
            
            return (
              <option key={template.id} value={template.id}>
                {label}
              </option>
            );
          })}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {!selectedOSI 
            ? 'Selecciona una OSI primero para ver las plantillas disponibles'
            : courseTemplates.length === 0
              ? 'No hay plantillas disponibles para este curso/cliente'
              : `Plantillas disponibles para el curso seleccionado`
          }
        </p>
      </div>

      {/* Course Content (Editable) — always shown when a course is selected */}
      {selectedCourseTopic && (
        <div className="mb-4">
          <label
            htmlFor="course_content"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Contenido del Curso
            {certificateData.course_template_id && certificateData.course_template_id !== 'original-course' && (
              <span className="ml-2 text-xs text-blue-600">
                (Desde plantilla: {courseTemplates.find((t: any) => t.id.toString() === certificateData.course_template_id?.toString())?.descripcion || courseTemplates.find((t: any) => t.id.toString() === certificateData.course_template_id?.toString())?.nombre})
              </span>
            )}
          </label>
          <RichTextEditor
            value={certificateData.course_content || ""}
            onChange={(html) => onDataChange("course_content", html)}
            rows={8}
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-gray-500">
              {certificateData.course_template_id
                ? 'Puedes editar este contenido según sea necesario para esta capacitación específica'
                : 'Este es el contenido predeterminado del curso. Puedes editarlo según sea necesario.'
              }
            </p>
            <p className={`text-xs font-medium ${(certificateData.course_content?.length || 0) > 2000 ? 'text-red-600' : (certificateData.course_content?.length || 0) > 1800 ? 'text-yellow-600' : 'text-gray-500'}`}>
              {certificateData.course_content?.length || 0} / 2000 caracteres
            </p>
          </div>
        </div>
      )}

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
              const base = certificateData.date ? new Date(certificateData.date + "T00:00:00") : new Date();
              for (let y = 1; y <= 5; y++) {
                const exp = new Date(base);
                exp.setFullYear(exp.getFullYear() + y);
                if (exp.toISOString().slice(0, 10) === certificateData.fecha_vencimiento) return String(y);
              }
              return "";
            })()}
            onChange={(e) => {
              const years = Number(e.target.value);
              if (!years) {
                onDataChange("fecha_vencimiento", undefined);
                return;
              }
              const base = certificateData.date ? new Date(certificateData.date + "T00:00:00") : new Date();
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
              Vence el: {new Date(certificateData.fecha_vencimiento + "T00:00:00").toLocaleDateString("es-VE", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
        </div>
      )}


      {/* Signature Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Firmas del Certificado
        </h3>

        {/* Facilitator Selection */}
        <div className="mb-4">
          <FacilitatorSelection
            selectedFacilitatorId={certificateData.facilitator_id}
            onFacilitatorChange={async (id: string) => {
              onDataChange("facilitator_id", id);
              
              // Fetch facilitator data when selected
              if (id) {
                try {
                  const { getFacilitatorData } = await import("@/app/actions/facilitators");
                  const facilitatorData = await getFacilitatorData(id);
                  onDataChange("facilitator_data", facilitatorData);
                } catch (error) {
                  // Continue without facilitator data
                }
              } else {
                onDataChange("facilitator_data", null);
              }
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
              // First try to find the selected signature by ID
              if (certificateData.sha_signature_id) {
                const selectedSignature = shaSignatures.find(
                  (sig: Signature) => sig.id.toString() === certificateData.sha_signature_id,
                );
                if (selectedSignature) {
                  return selectedSignature.nombre;
                }
              }
              // Fallback to active signature
              const activeSignature = shaSignatures.find(
                (sig: Signature) => sig.is_active,
              );
              return activeSignature?.nombre || "No hay firma SHA activa";
            })()}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
            placeholder="No hay firma SHA activa"
          />
          <p className="text-xs text-gray-500 mt-1">
            Las firmas SHA se gestionan en el módulo de Gestión de Firmas.
            <a
              href="/dashboard/capacitacion/gestion-de-firmas"
              className="text-blue-600 hover:underline ml-1"
            >
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
      <div className="flex space-x-3 mb-4 mt-6">
        {/* Preview Button */}
        <button
          type="button"
          onClick={handlePreview}
          disabled={
            isGenerating ||
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
          disabled={
            isGenerating ||
            !certificateData.certificate_title ||
            !certificateData.osi_id ||
            !certificateData.course_topic_id ||
            certificateData.participants.length === 0 ||
            !certificateData.date
          }
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <div className="flex items-center">
              <svg
                className="animate-spin h-4 w-4 mr-2 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v16m1.414 0l3.586-3.586a2 2 0 013.414 3.414L20 8.586a2 2 0 01-3.414-3.414L12 15.414a2 2 0 01-3.414-3.414L4 8.586a2 2 0 013.414 3.414z"
                />
              </svg>
              <span>Generando...</span>
            </div>
          ) : (
            "Generar Certificados"
          )}
        </button>
      </div>

      {/* Progress Indicator */}
      {isGenerating && generationProgress && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">
              {generationProgress.currentPhase}
            </span>
            <span className="text-sm text-blue-700">
              {generationProgress.percentage}%
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${generationProgress.percentage}%` }}
            />
          </div>
          {generationProgress.totalCertificates > 0 && (
            <div className="mt-2 text-xs text-blue-700">
              Procesados: {generationProgress.currentCertificate} / {generationProgress.totalCertificates} certificados
            </div>
          )}
        </div>
      )}

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
