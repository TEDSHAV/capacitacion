import { useState, useEffect, useRef } from "react";
import {
  Signature,
  CertificateGeneration,
  CertificateOSI,
  CourseTopic,
} from "@/types";
import {
  getSignaturesForDropdownAction,
  getCourseTemplatesByOSIAction,
} from "@/app/actions/dropdown-data";

interface UseCertificateFormProps {
  certificateData: CertificateGeneration;
  selectedOSI: CertificateOSI | null;
  selectedCourseTopic: CourseTopic | null;
  isEditMode: boolean;
  onDataChange: (field: keyof CertificateGeneration, value: any) => void;
}

export function useCertificateForm({
  certificateData,
  selectedOSI,
  selectedCourseTopic,
  isEditMode,
  onDataChange,
}: UseCertificateFormProps) {
  const [shaSignatures, setShaSignatures] = useState<Signature[]>([]);
  const [courseTemplates, setCourseTemplates] = useState<any[]>([]);
  const isInitialLoad = useRef(true);

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
        }

        // Load course templates (all active templates initially)
        const courseTemplatesResult = await getCourseTemplatesByOSIAction();
        if (courseTemplatesResult.data) {
          setCourseTemplates(courseTemplatesResult.data);
        }

        // Set generate_documents to true by default
        onDataChange("generate_documents", true);
      } catch (error) {
        // Error loading form data
      }
    };

    loadFormData();
  }, []); // Only run once on mount

  // Auto-select the active SHA signature if not set (handles initial load and form reset)
  useEffect(() => {
    if (shaSignatures.length > 0 && !certificateData.sha_signature_id) {
      const activeShaSignature = shaSignatures.find(
        (sig: any) => sig.is_active,
      );
      if (activeShaSignature) {
        onDataChange("sha_signature_id", activeShaSignature.id.toString());
        // Also set sha_signature_data immediately to avoid a second API call
        onDataChange("sha_signature_data", {
          id: activeShaSignature.id,
          nombre: (activeShaSignature as any).nombre,
          tipo: (activeShaSignature as any).tipo,
          url_imagen: (activeShaSignature as any).url_imagen,
          is_active: activeShaSignature.is_active,
        });
      }
    }
  }, [shaSignatures, certificateData.sha_signature_id]);

  // Separate effect to handle SHA signature data when certificateData changes
  useEffect(() => {
    const ensureSHASignatureData = async () => {
      if (
        certificateData.sha_signature_id &&
        !certificateData.sha_signature_data
      ) {
        try {
          const signaturesResult = await getSignaturesForDropdownAction();
          if (signaturesResult.data) {
            const sigs = signaturesResult.data.filter(
              (sig: any) => sig.tipo === "representante_sha",
            );
            const selected = sigs.find(
              (sig: any) =>
                sig.id.toString() === certificateData.sha_signature_id,
            );
            if (selected) {
              // Ensure we pass the full signature object with url_imagen
              onDataChange("sha_signature_data", {
                id: selected.id,
                nombre: selected.nombre,
                tipo: selected.tipo,
                url_imagen: selected.url_imagen,
                is_active: selected.is_active,
              });
            }
          }
        } catch (error) {
          console.error("Error loading SHA signature data:", error);
        }
      }
    };

    ensureSHASignatureData();
  }, [certificateData.sha_signature_id, certificateData.sha_signature_data]);

  // Effect to load course templates when course changes
  useEffect(() => {
    // Immediately clear stale templates to avoid mismatched value/options in dropdown
    setCourseTemplates([]);

    if (!selectedCourseTopic) return;

    let cancelled = false;

    const loadCourseTemplates = async () => {
      try {
        // Use cursos_id (cursos.id) not id (catalogo_servicios.id) — plantillas_cursos.id_curso FK → cursos
        const courseId = selectedCourseTopic?.cursos_id?.toString();
        // Get empresaId from selectedOSI to filter by company-specific templates
        const empresaId = selectedOSI?.empresa_id?.toString();

        const templatesResult = await getCourseTemplatesByOSIAction(
          courseId,
          empresaId,
        );

        if (cancelled) return; // Discard stale response if OSI/course changed again

        if (templatesResult.data) {
          const templates = templatesResult.data;

          // Add original course content as first option if course exists
          const allOptions = selectedCourseTopic
            ? [
                {
                  id: "original-course",
                  descripcion:
                    selectedCourseTopic.nombre || "Contenido base del curso",
                  contenido: selectedCourseTopic.contenido_curso || "",
                },
                ...templates,
              ]
            : templates;

          // Logic for auto-selecting the best template
          let templateToSelect = "original-course";
          let contentToUse = selectedCourseTopic?.contenido_curso || "";

          // Check if there's a specific template for this course and company
          if (courseId && empresaId) {
            const companySpecificTemplate = templates.find(
              (t: any) =>
                t.id_curso?.toString() === courseId &&
                t.id_empresa?.toString() === empresaId,
            );

            if (companySpecificTemplate) {
              templateToSelect = companySpecificTemplate.id.toString();
              contentToUse = companySpecificTemplate.contenido || "";
            }
          }

          // Set templates and selection atomically to avoid mismatched state
          setCourseTemplates(allOptions);

          // In Edit Mode, if it's the initial load, we don't want to overwrite the loaded state
          if (isEditMode && isInitialLoad.current) {
            isInitialLoad.current = false;
            // Just update the templates list, don't change selection or content
          } else {
            // Normal behavior or user-triggered course change
            onDataChange("course_template_id", templateToSelect);
            onDataChange("course_content", contentToUse);
          }
        }
      } catch (error) {
        // Continue without templates
      }
    };

    loadCourseTemplates();

    return () => {
      cancelled = true; // Cancel stale request on cleanup
    };
  }, [
    selectedCourseTopic?.id,
    selectedCourseTopic?.contenido_curso,
    selectedCourseTopic?.name,
    selectedOSI?.empresa_id,
  ]);

  // Effect to sync id_estado from selectedOSI
  useEffect(() => {
    if (selectedOSI?.id_estado) {
      onDataChange("id_estado", selectedOSI.id_estado);
    }
  }, [selectedOSI?.id]);

  return { shaSignatures, courseTemplates };
}
