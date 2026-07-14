"use client";

import { useState, useEffect } from "react";
import { CourseTopic, CertificateFormProps, Signature } from "@/types";

import { ParticipantsSection } from "./ParticipantsSection";
import { CertificatePreview } from "./CertificatePreview";
import { getSignaturesForDropdownAction, getCertificateTemplatesAction, getVenezuelanStatesAction, getCertificateTemplatesByCourseAction, getCarnetTemplatesAction, getActiveTemplateAction, getCourseTemplatesByOSIAction, getCourseTemplatesTestAction } from "@/app/actions/dropdown-data";
import { FacilitatorSelection } from "@/app/dashboard/capacitacion/participantes/gestion-de-facilitadores/components/facilitator-selection";

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
  const [shaSignatures, setShaSignatures] = useState<Signature[]>([]);
  const [certificateTemplates, setCertificateTemplates] = useState<any[]>([]);
  const [courseTemplates, setCourseTemplates] = useState<any[]>([]);
  const [carnetTemplates, setCarnetTemplates] = useState<any[]>([]);
  const [activeCarnetTemplate, setActiveCarnetTemplate] = useState<any>(null);
  const [venezuelanStates, setVenezuelanStates] = useState<any[]>([]);

  useEffect(() => {
    const loadFormData = async () => {
      try {
        // Load SHA signatures
        const signaturesResult = await getSignaturesForDropdownAction();
        console.log('Signatures Result:', signaturesResult); // Debug log
        
        if (signaturesResult.data) {
          const shaOnly = signaturesResult.data.filter(
            (sig: any) => sig.tipo === "representante_sha",
          );
          console.log('SHA Only signatures:', shaOnly); // Debug log
          setShaSignatures(shaOnly as Signature[]);

          // Auto-select the active SHA signature
          const activeShaSignature = shaOnly.find(
            (sig: any) => sig.is_active,
          );
          console.log('Active SHA signature:', activeShaSignature); // Debug log

          if (activeShaSignature) {
            // Always set the SHA signature ID, even if one is already selected
            onDataChange("sha_signature_id", activeShaSignature.id.toString());
            console.log('Auto-selected SHA signature ID:', activeShaSignature.id); // Debug log
          }
        }

        // Load certificate templates
        const templatesResult = await getCertificateTemplatesAction();
        if (templatesResult.data) {
          const templates = templatesResult.data;
          setCertificateTemplates(templates);
          // Note: Template selection will be handled by course-based effect
        }

        // Load course templates (all active templates initially)
        const courseTemplatesResult = await getCourseTemplatesByOSIAction();
        if (courseTemplatesResult.data) {
          const courseTemplates = courseTemplatesResult.data;
          setCourseTemplates(courseTemplates);
        }

        // Load carnet templates
        const carnetTemplatesResult = await getCarnetTemplatesAction();
        if (carnetTemplatesResult.data) {
          setCarnetTemplates(carnetTemplatesResult.data);
        }

        // Load active carnet template
        const activeCarnetResult = await getActiveTemplateAction('carnet');
        if (activeCarnetResult.success && activeCarnetResult.data) {
          setActiveCarnetTemplate(activeCarnetResult.data);
          // Auto-set the active template in certificate data
          onDataChange("id_plantilla_carnet", activeCarnetResult.data.id);
        }

        // Load Venezuelan states
        const statesResult = await getVenezuelanStatesAction();
        console.log('States Result:', statesResult); // Debug log
        
        if (statesResult.data) {
          console.log('Setting Venezuelan states:', statesResult.data); // Debug log
          setVenezuelanStates(statesResult.data);
        }
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
              console.log('Fetched missing SHA signature data:', selectedSHASignature);
            }
          }
        } catch (error) {
          console.error('Could not fetch SHA signature data:', error);
        }
      }
    };

    ensureSHASignatureData();
  }, [certificateData.sha_signature_id, certificateData.sha_signature_data]);

  // Effect to load filtered templates when course changes
  useEffect(() => {
    const loadFilteredTemplates = async () => {
      if (selectedCourseTopic?.id) {
        try {
          // Load templates filtered by course
          const templatesResult = await getCertificateTemplatesByCourseAction(selectedCourseTopic.id);
          if (templatesResult.data) {
            const templates = templatesResult.data;
            setCertificateTemplates(templates);

            // Auto-select template if course has a preferred one
            if (selectedCourseTopic.id_plantilla_certificado) {
              const courseTemplate = templates.find(
                (template: any) => template.id === selectedCourseTopic.id_plantilla_certificado
              );
              if (courseTemplate) {
                onDataChange("id_plantilla_certificado", courseTemplate.id);
                console.log('Auto-selected course-specific template:', courseTemplate);
              }
            } else if (templates.length > 0 && !certificateData.id_plantilla_certificado) {
              // Fallback to first template if no course preference and no template selected
              onDataChange("id_plantilla_certificado", templates[0].id);
            }
          }
        } catch (error) {
          console.error('Error loading filtered templates:', error);
        }
      } else {
        // Load all templates when no course is selected
        try {
          const templatesResult = await getCertificateTemplatesAction();
          if (templatesResult.data) {
            const templates = templatesResult.data;
            setCertificateTemplates(templates);

            // Auto-select default template (first active template) if none selected
            if (templates.length > 0 && !certificateData.id_plantilla_certificado) {
              onDataChange("id_plantilla_certificado", templates[0].id);
            }
          }
        } catch (error) {
          console.error('Error loading all templates:', error);
        }
      }
    };

    loadFilteredTemplates();
  }, [selectedCourseTopic?.id, selectedCourseTopic?.id_plantilla_certificado]);

  // Effect to load course templates when OSI or course changes
  useEffect(() => {
    const loadCourseTemplates = async () => {
      try {
        const courseId = selectedCourseTopic?.id;
        const osiCompanyId = selectedOSI?.empresa_id;
        
        const templatesResult = await getCourseTemplatesByOSIAction(courseId, osiCompanyId);
        if (templatesResult.data) {
          const templates = templatesResult.data;
          setCourseTemplates(templates);
          console.log('Course templates loaded:', templates);
          
          // If no templates exist for this course, use the course's default content
          if (templates.length === 0 && selectedCourseTopic?.contenido_curso) {
            onDataChange("course_content", selectedCourseTopic.contenido_curso);
            console.log('Using default course content since no templates available');
          }
        }
      } catch (error) {
        console.error('Error loading course templates:', error);
      }
    };

    loadCourseTemplates();
  }, [selectedOSI?.empresa_id, selectedCourseTopic?.id, selectedCourseTopic?.contenido_curso]);

  // Effect to set default course content when course topic changes (but no template selected)
  useEffect(() => {
    if (selectedCourseTopic && !certificateData.course_template_id) {
      // Use course's default content if available
      if (selectedCourseTopic.contenido_curso) {
        onDataChange("course_content", selectedCourseTopic.contenido_curso);
        console.log('Setting default course content:', selectedCourseTopic.contenido_curso);
      }
    }
  }, [selectedCourseTopic?.id, selectedCourseTopic?.contenido_curso, certificateData.course_template_id]);

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
              // Find the selected template and load its content
              const selectedTemplate = courseTemplates.find(
                (template: any) => template.id === templateId,
              );
              
              if (selectedTemplate) {
                onDataChange("course_content", selectedTemplate.contenido || '');
                console.log('Course template selected, using template content:', selectedTemplate.descripcion);
              } else {
                // Fallback to course content if template not found
                onDataChange("course_content", selectedCourseTopic?.contenido_curso || '');
                console.log('Template not found, using course default content');
              }
            } else {
              // No template selected, use course's default content
              onDataChange("course_content", selectedCourseTopic?.contenido_curso || '');
              console.log('Template deselected, using course default content');
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={!selectedOSI}
        >
          <option value="">Selecciona una plantilla...</option>
          {courseTemplates.map((template: any) => (
            <option key={template.id} value={template.id}>
              {template.descripcion || `Plantilla ${template.id}`}
            </option>
          ))}
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

      {/* Course Content (Editable) */}
      {certificateData.course_content && (
        <div className="mb-4">
          <label
            htmlFor="course_content"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Contenido del Curso
            {certificateData.course_template_id && (
              <span className="ml-2 text-xs text-blue-600">
                (Desde plantilla: {courseTemplates.find((t: any) => t.id === certificateData.course_template_id)?.descripcion})
              </span>
            )}
          </label>
          <textarea
            id="course_content"
            value={certificateData.course_content || ""}
            onChange={(e) => onDataChange("course_content", e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="El contenido del curso se cargará desde la plantilla seleccionada..."
          />
          <p className="text-xs text-gray-500 mt-1">
            {certificateData.course_template_id 
              ? 'Puedes editar este contenido según sea necesario para esta capacitación específica'
              : 'Este es el contenido predeterminado del curso. Puedes editarlo según sea necesario.'
            }
          </p>
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
          Este campo se prellena automáticamente con el detalle de capacitación
          o tema de la OSI seleccionada
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
            htmlFor="fecha_vencimiento"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Fecha de Vencimiento (Requerido para carnet)
          </label>
          <input
            type="date"
            id="fecha_vencimiento"
            value={certificateData.fecha_vencimiento || ""}
            onChange={(e) =>
              onDataChange("fecha_vencimiento", e.target.value || undefined)
            }
            className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Selecciona la fecha haciendo clic en el campo
          </p>
        </div>
      )}

      {/* Carne Template - Only show if course emits card */}
      {selectedCourseTopic?.emite_carnet && (
        <div className="mb-4">
          <label
            htmlFor="id_plantilla_carnet"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Plantilla de Carnet
          </label>
          {activeCarnetTemplate ? (
            <div className="p-3 border border-green-300 bg-green-50 rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-green-800">{activeCarnetTemplate.nombre}</p>
                  <p className="text-sm text-green-600">Plantilla activa seleccionada automáticamente</p>
                </div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Activa
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 border border-yellow-300 bg-yellow-50 rounded-md">
              <p className="text-sm text-yellow-800">
                No hay una plantilla de carnet activa. 
                <a href="/dashboard/capacitacion/plantillas-carnets" className="underline hover:text-yellow-900 ml-1">
                  Configurar plantilla activa
                </a>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Certificate Template */}
      <div className="mb-4">
        <label
          htmlFor="id_plantilla_certificado"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Plantilla de Certificado
          {selectedCourseTopic && (
            <span className="ml-2 text-xs text-blue-600">
              (Filtradas por curso: {selectedCourseTopic.name})
            </span>
          )}
        </label>
        <select
          id="id_plantilla_certificado"
          value={certificateData.id_plantilla_certificado || ""}
          onChange={(e) =>
            onDataChange(
              "id_plantilla_certificado",
              e.target.value ? parseInt(e.target.value) : undefined,
            )
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Seleccionar plantilla...</option>
          {certificateTemplates.map((template: any) => (
            <option key={template.id} value={template.id}>
              {template.nombre}
              {selectedCourseTopic?.id_plantilla_certificado === template.id && (
                " (Recomendada para este curso)"
              )}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {selectedCourseTopic 
            ? `Plantillas disponibles para el curso seleccionado. ${selectedCourseTopic.id_plantilla_certificado ? 'Se recomienda usar la plantilla marcada.' : 'Puedes seleccionar cualquier plantilla disponible.'}`
            : 'Selecciona la plantilla a utilizar para este certificado'
          }
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
          onChange={(e) =>
            onDataChange(
              "id_estado",
              e.target.value ? parseInt(e.target.value) : undefined,
            )
          }
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
          Seleccionar el estado en el que se ejecutó el servicio para fines
          administrativos
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
            onFacilitatorChange={async (id: string) => {
              onDataChange("facilitator_id", id);
              
              // Fetch facilitator data when selected
              if (id) {
                try {
                  const { getFacilitatorData } = await import("@/app/actions/facilitators");
                  const facilitatorData = await getFacilitatorData(id);
                  onDataChange("facilitator_data", facilitatorData);
                } catch (error) {
                  console.error("Error fetching facilitator data:", error);
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

      {/* Certificate Preview Modal */}
      <CertificatePreview
        certificateData={certificateData}
        selectedOSI={selectedOSI}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        selectedCourse={selectedCourseTopic}
        carnetTemplates={carnetTemplates}
      />
    </div>
  );
};
