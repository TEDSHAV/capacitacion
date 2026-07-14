"use client";

import dynamic from "next/dynamic";
import { CourseTopic, CertificateGeneration, CertificateOSI } from "@/types";

const RichTextEditor = dynamic(
  () => import("@/components/ui/rich-text-editor"),
  { ssr: false },
);

interface CourseTemplateSectionProps {
  courseTemplates: any[];
  courseTemplateId?: string;
  courseContent?: string;
  selectedCourseTopic: CourseTopic | null;
  selectedOSI: CertificateOSI | null;
  onDataChange: (field: keyof CertificateGeneration, value: any) => void;
}

export const CourseTemplateSection = ({
  courseTemplates,
  courseTemplateId,
  courseContent,
  selectedCourseTopic,
  selectedOSI,
  onDataChange,
}: CourseTemplateSectionProps) => {
  const selectedTemplate = courseTemplates.find(
    (t: any) => t.id.toString() === courseTemplateId?.toString(),
  );

  const handleTemplateChange = (templateId: string) => {
    onDataChange("course_template_id", templateId);

    if (templateId) {
      const template = courseTemplates.find(
        (t: any) => t.id.toString() === templateId,
      );
      onDataChange(
        "course_content",
        template
          ? template.contenido || ""
          : selectedCourseTopic?.contenido_curso || "",
      );
    } else {
      onDataChange(
        "course_content",
        selectedCourseTopic?.contenido_curso || "",
      );
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 mb-4">
        {/* Course Template Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar Plantilla
          </label>
          <select
            value={courseTemplateId || ""}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={!selectedOSI}
          >
            <option value="">Selecciona una plantilla...</option>
            {courseTemplates.map((template: any) => {
              let label =
                template.nombre ||
                template.descripcion ||
                `Plantilla ${template.id}`;

              if (template.id === "original-course") {
                label =
                  selectedCourseTopic?.nombre || "Contenido base del curso";
              } else if (template.empresas) {
                const courseName = selectedCourseTopic?.nombre || "";
                const companyName = template.empresas.razon_social || "";
                label = `${courseName} ${companyName}`;
              } else if (template.id_curso) {
                const courseName = selectedCourseTopic?.nombre || "";
                label = `${courseName} - ${template.descripcion}`;
              }

              return (
                <option
                  key={template.id.toString()}
                  value={template.id.toString()}
                >
                  {label}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Course Content (Editable) — always shown when a course is selected */}
      {selectedCourseTopic && (
        <div className="mb-4">
          <label
            htmlFor="course_content"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Contenido del Curso
            {courseTemplateId && courseTemplateId !== "original-course" && (
              <span className="ml-2 text-xs text-blue-600">
                (Desde plantilla:{" "}
                {selectedTemplate?.descripcion || selectedTemplate?.nombre})
              </span>
            )}
          </label>
          <RichTextEditor
            value={courseContent || ""}
            onChange={(html) => onDataChange("course_content", html)}
            rows={8}
          />
          {(() => {
            // Check if any row has too many characters (approximate check for PDF overflow)
            const MAX_CHARS_PER_ROW = 75;
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = courseContent || "";
            const rows = tempDiv.innerText.split("\n").filter((r) => r.trim());
            const longRows = rows.filter((r) => r.length > MAX_CHARS_PER_ROW);

            if (longRows.length > 0) {
              return (
                <div className="mt-2 text-xs text-orange-600 font-medium animate-pulse">
                  ⚠️ Atención: Hay {longRows.length} líneas que exceden los{" "}
                  {MAX_CHARS_PER_ROW} caracteres y podrían desbordarse en el
                  PDF.
                </div>
              );
            }
            return null;
          })()}
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-gray-500">
              {courseTemplateId
                ? "Puedes editar este contenido según sea necesario para esta capacitación específica"
                : "Este es el contenido predeterminado del curso. Puedes editarlo según sea necesario."}
            </p>
            <p
              className={`text-xs font-medium ${
                (courseContent?.length || 0) > 2000
                  ? "text-red-600"
                  : (courseContent?.length || 0) > 1800
                    ? "text-yellow-600"
                    : "text-gray-500"
              }`}
            >
              {courseContent?.length || 0} / 2000 caracteres
            </p>
          </div>
        </div>
      )}
    </>
  );
};
