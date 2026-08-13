import { useState, useEffect, useRef } from "react";
import {
  Signature,
  CertificateGeneration,
  CertificateOSI,
  CourseTopic,
} from "@/types";
import {
  getCourseTemplatesByOSIAction,
} from "@/app/actions/dropdown-data";

interface UseCertificateFormProps {
  certificateData: CertificateGeneration;
  selectedOSI: CertificateOSI | null;
  selectedCourseTopic: CourseTopic | null;
  isEditMode: boolean;
  initialSignatures?: any[];
  onDataChange: (field: keyof CertificateGeneration, value: any) => void;
}

export function useCertificateForm({
  certificateData,
  selectedOSI,
  selectedCourseTopic,
  isEditMode,
  initialSignatures,
  onDataChange,
}: UseCertificateFormProps) {
  const [shaSignatures, setShaSignatures] = useState<Signature[]>(
    initialSignatures
      ? (initialSignatures.filter(
          (sig: any) => sig.tipo === "representante_sha",
        ) as Signature[])
      : [],
  );
  const [courseTemplates, setCourseTemplates] = useState<any[]>([]);
  const isInitialLoad = useRef(true);

  // Use server-provided signatures directly — no redundant POST needed
  useEffect(() => {
    if (initialSignatures) {
      const shaOnly = initialSignatures.filter(
        (sig: any) => sig.tipo === "representante_sha",
      );
      setShaSignatures(shaOnly as Signature[]);
    }
    onDataChange("generate_documents", true);
  }, []);

  // Auto-select the active SHA signature if not set (handles initial load and form reset)
  useEffect(() => {
    if (shaSignatures.length > 0 && !certificateData.sha_signature_id) {
      const activeShaSignature = shaSignatures.find(
        (sig: any) => sig.is_active,
      );
      if (activeShaSignature) {
        onDataChange("sha_signature_id", activeShaSignature.id.toString());
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

  // Resolve SHA signature data synchronously from initialSignatures (no POST needed)
  useEffect(() => {
    if (
      certificateData.sha_signature_id &&
      !certificateData.sha_signature_data &&
      shaSignatures.length > 0
    ) {
      const selected = shaSignatures.find(
        (sig: any) =>
          sig.id.toString() === certificateData.sha_signature_id,
      );
      if (selected) {
        onDataChange("sha_signature_data", {
          id: selected.id,
          nombre: selected.nombre,
          tipo: selected.tipo,
          url_imagen: selected.url_imagen,
          is_active: selected.is_active,
        });
      }
    }
  }, [certificateData.sha_signature_id, certificateData.sha_signature_data, shaSignatures]);

  // Effect to load course templates when course changes
  useEffect(() => {
    // Immediately clear stale templates to avoid mismatched value/options in dropdown
    setCourseTemplates([]);

    if (!selectedCourseTopic) return;

    let cancelled = false;

    const loadCourseTemplates = async () => {
      try {
        // Use id (catalogo_servicios.id) — plantillas_cursos.id_curso FK → catalogo_servicios
        const courseId = selectedCourseTopic?.id?.toString();
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
          let titleToUse = selectedCourseTopic?.nombre || "";

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
              // Prefer the plantilla's certificate title; fall back to the
              // original course name for backwards compatibility (existing
              // plantillas with titulo_certificado = NULL).
              titleToUse =
                companySpecificTemplate.titulo_certificado ||
                selectedCourseTopic?.nombre ||
                "";
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
            onDataChange("certificate_title", titleToUse);
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

  // Effect to default expiration date to 2 years when emission date changes
  useEffect(() => {
    if (selectedCourseTopic?.emite_carnet && certificateData.date) {
      const base = new Date(certificateData.date + "T12:00:00Z");
      const exp = new Date(base);
      exp.setFullYear(exp.getFullYear() + 2);
      const formattedExp = exp.toISOString().split("T")[0];

      // Only update if it's different to avoid loops, or if it's not set
      if (certificateData.fecha_vencimiento !== formattedExp) {
        onDataChange("fecha_vencimiento", formattedExp);
      }
    }
  }, [certificateData.date, selectedCourseTopic?.emite_carnet]);

  return { shaSignatures, courseTemplates };
}
