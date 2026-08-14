import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Curso } from "@/types";
import {
  BookOpen,
  Target,
  Users,
  Award,
  FileDown,
  X,
  Loader2,
} from "lucide-react";

const RichTextEditor = dynamic(
  () => import("@/components/ui/rich-text-editor"),
  { ssr: false },
);

interface CourseFormProps {
  curso: Curso | null;
  onSubmit: (formData: any) => void;
  onCancel: () => void;
  isEdit: boolean;
}

export default function CourseForm({
  curso,
  onSubmit,
  onCancel,
  isEdit,
}: CourseFormProps) {
  const [datosFormulario, setDatosFormulario] = useState({
    titulo: curso?.nombre || "",
    subtitulo: curso?.subtitulo || "",
    contenido: curso?.contenido_curso || "",
    horas_estimadas: curso?.carga_horaria_std || 0,
    tipo_certificado:
      curso?.nota_aprobatoria === 0 ? "participacion" : "calificacion", // Certificate type
    nota_aprobatoria: curso?.nota_aprobatoria || 14, // Default to 14 for graded courses
    emite_carnet: curso?.emite_carnet || false, // Default to false
    para_quien: curso?.para_quien || "",
    modalidad: curso?.modalidad || "Presencial",
    objetivo_general: curso?.objetivo_general || "",
    objetivo_especifico: curso?.objetivo_especifico || "",
  });

  const [error, setError] = useState<string | null>(null);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle ESC key press
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [onCancel]);

  // Handle click outside modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onCancel();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onCancel]);

  const manejarCambioInput = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setDatosFormulario((prev) => ({
      ...prev,
      [name]:
        name === "horas_estimadas" || name === "nota_aprobatoria"
          ? value === ""
            ? 0
            : Number(value.replace(/^0+/, ""))
          : name === "titulo"
            ? value.toUpperCase()
            : value,
    }));
  };

  const handleTipoCertificadoChange = (tipo: string) => {
    setDatosFormulario((prev) => ({
      ...prev,
      tipo_certificado: tipo,
      nota_aprobatoria:
        tipo === "participacion" ? 0 : prev.nota_aprobatoria || 14, // Set to 0 for participation, keep existing or default for graded
    }));
  };

  const manejarEnvio = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate content length
    if ((datosFormulario.contenido?.length || 0) > 2000) {
      alert(
        "El contenido excede el límite de 2000 caracteres. Por favor, reduce el contenido.",
      );
      return;
    }

    // Create FormData properly
    const formData = new FormData();
    formData.append("titulo", datosFormulario.titulo.toUpperCase());
    formData.append("subtitulo", datosFormulario.subtitulo.toUpperCase());
    formData.append("contenido", datosFormulario.contenido);
    formData.append(
      "horas_estimadas",
      datosFormulario.horas_estimadas.toString(),
    );
    formData.append(
      "nota_aprobatoria",
      datosFormulario.nota_aprobatoria.toString(),
    );
    formData.append("emite_carnet", datosFormulario.emite_carnet.toString());
    formData.append("para_quien", datosFormulario.para_quien);
    formData.append("modalidad", datosFormulario.modalidad);
    formData.append("objetivo_general", datosFormulario.objetivo_general);
    formData.append(
      "objetivo_especifico",
      datosFormulario.objetivo_especifico,
    );

    // Note: empresa_id is no longer stored in database as cliente_asociado column doesn't exist
    // if (datosFormulario.empresa_id) {
    //   formData.append('cliente_asociado', datosFormulario.empresa_id.toString());
    // }

    onSubmit(formData);
  };

  const handleDescargarPdf = async () => {
    if (!datosFormulario.titulo.trim()) {
      alert("El título del curso es requerido para generar la ficha técnica.");
      return;
    }

    setGenerandoPdf(true);
    try {
      const response = await fetch("/api/generate-ficha-tecnica-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: datosFormulario.titulo,
          subtitulo: datosFormulario.subtitulo,
          horas_estimadas: datosFormulario.horas_estimadas,
          para_quien: datosFormulario.para_quien,
          modalidad: datosFormulario.modalidad,
          objetivo_general: datosFormulario.objetivo_general,
          objetivo_especifico: datosFormulario.objetivo_especifico,
          contenido: datosFormulario.contenido,
          nota_aprobatoria:
            datosFormulario.tipo_certificado === "participacion"
              ? 0
              : datosFormulario.nota_aprobatoria,
          emite_carnet: datosFormulario.emite_carnet,
          cursoId: curso?.id ?? null,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `ficha_tecnica_${datosFormulario.titulo
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errData = await response.json().catch(() => null);
        alert(
          errData?.error ||
            "Error al generar la ficha técnica. Intenta nuevamente.",
        );
      }
    } catch (err) {
      alert("Error al generar la ficha técnica. Intenta nuevamente.");
    } finally {
      setGenerandoPdf(false);
    }
  };

  return (
    <div
      ref={modalRef}
      className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl"
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center" style={{ backgroundColor: "rgba(12, 63, 105, 0.1)" }}>
            <BookOpen className="w-5 h-5" style={{ color: "var(--primary-blue)" }} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEdit ? "Editar Curso" : "Crear Nuevo Curso"}
            </h2>
            <p className="text-sm text-gray-500">
              Completa la información del curso y su ficha técnica
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <form onSubmit={manejarEnvio} className="px-6 py-6 space-y-6">
        {/* Section 1: Información General */}
        <section className="bg-gray-50/50 rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-blue-600" style={{ color: "var(--primary-blue)" }} />
            </div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
              Información General
            </h3>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label
                htmlFor="titulo"
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                Título del Curso <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="titulo"
                name="titulo"
                value={datosFormulario.titulo}
                onChange={manejarCambioInput}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                placeholder="Ej: Introducción a la Seguridad Industrial"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label
                htmlFor="subtitulo"
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                Subtítulo del Curso
              </label>
              <input
                type="text"
                id="subtitulo"
                name="subtitulo"
                value={datosFormulario.subtitulo}
                onChange={manejarCambioInput}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                placeholder="Ej: 5 Toneladas"
              />
              <p className="text-xs text-gray-500 mt-1">
                Subtítulo opcional que aparecerá en certificados y carnets
              </p>
            </div>

            {/* Hours + Modality — 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="horas_estimadas"
                  className="block text-sm font-semibold text-gray-700 mb-1"
                >
                  Horas Estimadas
                </label>
                <input
                  type="number"
                  id="horas_estimadas"
                  name="horas_estimadas"
                  value={datosFormulario.horas_estimadas}
                  onChange={manejarCambioInput}
                  min="2"
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  placeholder="Ej: 40"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Duración estimada del curso en horas
                </p>
              </div>

              <div>
                <label
                  htmlFor="modalidad"
                  className="block text-sm font-semibold text-gray-700 mb-1"
                >
                  Modalidad
                </label>
                <select
                  id="modalidad"
                  name="modalidad"
                  value={datosFormulario.modalidad}
                  onChange={manejarCambioInput}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                >
                  <option value="Presencial">Presencial</option>
                  <option value="Virtual">Virtual</option>
                  <option value="Híbrido">Híbrido</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Modalidad de impartición del curso
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Objetivos */}
        <section className="bg-gray-50/50 rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Target className="w-4 h-4 text-blue-600" style={{ color: "var(--primary-blue)" }} />
            </div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
              Objetivos
            </h3>
          </div>

          <div className="space-y-4">
            {/* Objetivo General */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Objetivo General
              </label>
              <RichTextEditor
                value={datosFormulario.objetivo_general}
                onChange={(html) =>
                  setDatosFormulario((prev) => ({
                    ...prev,
                    objetivo_general: html,
                  }))
                }
                rows={4}
                placeholder="Describe el objetivo general del curso..."
                highlightOverflow={false}
              />
              <p className="text-xs text-gray-500 mt-1">
                Propósito principal del curso. Aparecerá en la ficha técnica.
              </p>
            </div>

            {/* Objetivos Específicos */}
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Objetivos Específicos
              </label>
              <RichTextEditor
                value={datosFormulario.objetivo_especifico}
                onChange={(html) =>
                  setDatosFormulario((prev) => ({
                    ...prev,
                    objetivo_especifico: html,
                  }))
                }
                rows={6}
                placeholder="Lista los objetivos específicos del curso..."
                highlightOverflow={false}
              />
              <p className="text-xs text-gray-500 mt-1">
                Usa listas numeradas o viñetas para estructurar los objetivos.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Audiencia y Contenido */}
        <section className="bg-gray-50/50 rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" style={{ color: "var(--primary-blue)" }} />
            </div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
              Audiencia y Contenido
            </h3>
          </div>

          <div className="space-y-4">
            {/* Para Quien */}
            <div>
              <label
                htmlFor="para_quien"
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                ¿Para Quién Es?
              </label>
              <textarea
                id="para_quien"
                name="para_quien"
                value={datosFormulario.para_quien}
                onChange={manejarCambioInput}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-y"
                placeholder="Ej: Operadores de Montacargas, Personal de Seguridad..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Público objetivo del curso
              </p>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Contenido del Curso <span className="text-red-500">*</span>
              </label>
              <RichTextEditor
                value={datosFormulario.contenido}
                onChange={(html) =>
                  setDatosFormulario((prev) => ({ ...prev, contenido: html }))
                }
                rows={8}
              />
              <div className="flex justify-between items-center mt-1">
                <p
                  className={`text-xs font-medium ${(datosFormulario.contenido?.length || 0) > 2000 ? "text-red-600" : (datosFormulario.contenido?.length || 0) > 1800 ? "text-yellow-600" : "text-gray-500"}`}
                >
                  {datosFormulario.contenido?.length || 0} / 2000 caracteres
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Certificación */}
        <section className="bg-gray-50/50 rounded-xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Award className="w-4 h-4 text-blue-600" style={{ color: "var(--primary-blue)" }} />
            </div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
              Certificación
            </h3>
          </div>

          <div className="space-y-4">
            {/* Certificate Type */}
            <div>
              <label
                htmlFor="tipo_certificado"
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                Tipo de Certificado <span className="text-red-500">*</span>
              </label>
              <select
                id="tipo_certificado"
                name="tipo_certificado"
                value={datosFormulario.tipo_certificado}
                onChange={(e) => handleTipoCertificadoChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
              >
                <option value="calificacion">Certificado con Calificación</option>
                <option value="participacion">Certificado de Participación</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {datosFormulario.tipo_certificado === "calificacion"
                  ? "Los participantes recibirán una calificación y necesitarán aprobar para obtener el certificado"
                  : "Todos los participantes recibirán el certificado por asistir, sin calificación"}
              </p>
            </div>

            {/* Passing Grade - Only show for graded courses */}
            {datosFormulario.tipo_certificado === "calificacion" && (
              <div className="sm:w-1/2">
                <label
                  htmlFor="nota_aprobatoria"
                  className="block text-sm font-semibold text-gray-700 mb-1"
                >
                  Calificación Aprobatoria
                </label>
                <input
                  type="number"
                  id="nota_aprobatoria"
                  name="nota_aprobatoria"
                  value={datosFormulario.nota_aprobatoria}
                  onChange={manejarCambioInput}
                  min="1"
                  max="20"
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  placeholder="Ej: 14"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Nota mínima para aprobar el curso (escala 1-20)
                </p>
              </div>
            )}

            {/* Emitir Carnet Checkbox */}
            <div className="flex items-start space-x-3 pt-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="emite_carnet"
                  checked={datosFormulario.emite_carnet || false}
                  onChange={(e) =>
                    setDatosFormulario((prev) => ({
                      ...prev,
                      emite_carnet: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Emite Carnet
                </span>
              </label>
              <p className="text-xs text-gray-500 pt-0.5">
                Marca esta opción si el curso emite carnet además del certificado
              </p>
            </div>
          </div>
        </section>

        {/* Sticky Footer with action buttons */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 -mx-6 -mb-6 flex justify-between items-center gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 rounded-md text-white font-medium transition-colors shadow-md hover:opacity-90"
            style={{ backgroundColor: "var(--primary-gray)" }}
          >
            Cancelar
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDescargarPdf}
              disabled={generandoPdf}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-md font-medium border-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-50"
              style={{
                borderColor: "rgb(12, 63, 105)",
                color: "rgb(12, 63, 105)",
                backgroundColor: "white",
              }}
            >
              {generandoPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  Descargar Ficha Técnica
                </>
              )}
            </button>

            <button
              type="submit"
              className="px-6 py-2 rounded-md text-white font-medium transition-colors shadow-md hover:opacity-90"
              style={{ backgroundColor: "var(--primary-blue)" }}
            >
              {isEdit ? "Actualizar Curso" : "Crear Curso"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
