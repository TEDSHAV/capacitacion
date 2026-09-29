"use client";

import { useState, useMemo, useRef } from "react";
import {
  X,
  Presentation,
  Sliders,
  Loader2,
  CheckCircle2,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  Download,
  UploadCloud,
  FileVideo,
  ShieldAlert,
  ListOrdered,
  BookOpen,
  HelpCircle,
  Video,
  Play,
  FileText,
  AlertTriangle,
  Lightbulb,
  FileUp,
  Search,
  Building2,
  Clock,
  Layers,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  generarEstructuraPresentacion,
  compilarYGuardarPresentacionAction,
} from "@/app/actions/presentation-generator";
import type {
  SlideDefinition,
  SlideLayoutType,
  StepItem,
} from "@/types/presentation-studio";
import type { Curso } from "@/types";

interface PresentationStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  cursoId?: number | null;
  cursoNombre?: string;
  contenidoCurso?: string;
  cargaHorariaStd?: number;
  cursosCatalogo?: Curso[];
  onSuccess?: () => void;
}

const LAYOUT_LABELS: Record<SlideLayoutType, { label: string; icon: string }> = {
  portada: { label: "Portada Oficial", icon: "🏛️" },
  modulo_divider: { label: "Separador de Unidad", icon: "📑" },
  objetivos: { label: "Objetivos de Aprendizaje", icon: "🎯" },
  normativa: { label: "Marco Normativo", icon: "⚖️" },
  concepto: { label: "Concepto Clave (2 Col.)", icon: "💡" },
  proceso_pasos: { label: "Flujo por Pasos", icon: "🔄" },
  alerta_seguridad: { label: "Alerta Crítica / SWA", icon: "⚠️" },
  caso_practico: { label: "Caso Práctico / Taller", icon: "🛠️" },
  video_recurso: { label: "Recurso en Video", icon: "🎬" },
  evaluacion: { label: "Evaluación y Cierre", icon: "📝" },
};

export default function PresentationStudioModal({
  isOpen,
  onClose,
  cursoId,
  cursoNombre,
  contenidoCurso,
  cargaHorariaStd,
  cursosCatalogo = [],
  onSuccess,
}: PresentationStudioModalProps) {
  // Step navigation: 1 = Config/Generate, 2 = Interactive Slide Editor
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Course Source Mode: "catalogo" or "nuevo"
  const [origenCurso, setOrigenCurso] = useState<"catalogo" | "nuevo">(
    cursoId || (cursosCatalogo && cursosCatalogo.length > 0) ? "catalogo" : "nuevo",
  );
  const [selectedCursoId, setSelectedCursoId] = useState<number | null>(cursoId || null);
  const [cursoNombreInput, setCursoNombreInput] = useState<string>(cursoNombre || "");
  const [cargaHorariaInput, setCargaHorariaInput] = useState<number>(cargaHorariaStd || 8);
  const [contenidoCursoInput, setContenidoCursoInput] = useState<string>(contenidoCurso || "");
  const [busquedaCurso, setBusquedaCurso] = useState<string>("");

  // Client-specific standard PDF
  const [pdfEstandarBase64, setPdfEstandarBase64] = useState<string | null>(null);
  const [pdfEstandarNombre, setPdfEstandarNombre] = useState<string | null>(null);
  const [pdfEstandarSizeBytes, setPdfEstandarSizeBytes] = useState<number | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Config State
  const [alcance, setAlcance] = useState<"curso_completo" | "modulo_especifico">("curso_completo");
  const [moduloNombre, setModuloNombre] = useState("");
  const [enfoqueNormativo, setEnfoqueNormativo] = useState("COVENIN / LOPCYMAT");
  const [audienciaNivel, setAudienciaNivel] = useState("Personal Operativo y Supervisores");
  const [directrices, setDirectrices] = useState("");

  // Editor State
  const [slides, setSlides] = useState<SlideDefinition[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Loading States
  const [generating, setGenerating] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const videoInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Filter catalog courses by search query
  const cursosFiltrados = (cursosCatalogo || []).filter((c) => {
    if (!busquedaCurso.trim()) return true;
    return c.nombre.toLowerCase().includes(busquedaCurso.toLowerCase());
  });

  // Effective course parameters based on selection mode
  const selectedCursoObj = selectedCursoId
    ? (cursosCatalogo || []).find((c) => c.id === selectedCursoId)
    : null;

  const effectiveCursoNombre =
    origenCurso === "catalogo"
      ? (selectedCursoObj?.nombre || cursoNombreInput)
      : cursoNombreInput;

  const effectiveCargaHoraria =
    origenCurso === "catalogo"
      ? (selectedCursoObj?.carga_horaria_std || cargaHorariaInput || 8)
      : (cargaHorariaInput || 8);

  const effectiveContenidoCurso =
    origenCurso === "catalogo"
      ? (selectedCursoObj?.contenido_curso || contenidoCursoInput)
      : contenidoCursoInput;

  // Extract detected modules from course syllabus
  const detectedModules: string[] = [];
  const moduleRegex = /(?:Modulo|Módulo)\s+[IVXLCDM\d]+[^\n<]+/gi;
  let match;
  while ((match = moduleRegex.exec(effectiveContenidoCurso)) !== null) {
    const text = match[0].replace(/<[^>]*>?/gm, "").trim();
    if (text && !detectedModules.includes(text)) {
      detectedModules.push(text);
    }
  }

  const activeSlide = slides[selectedIndex] || null;

  const handleSelectCursoCatalogo = (id: number) => {
    setSelectedCursoId(id);
    const found = (cursosCatalogo || []).find((c) => c.id === id);
    if (found) {
      setCursoNombreInput(found.nombre);
      setCargaHorariaInput(found.carga_horaria_std || 8);
      setContenidoCursoInput(found.contenido_curso || "");
    }
  };

  // PDF upload handler
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setErrorMsg("Por favor seleccione un archivo en formato PDF.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg("El archivo PDF no debe exceder los 25 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPdfEstandarBase64(reader.result as string);
      setPdfEstandarNombre(file.name);
      setPdfEstandarSizeBytes(file.size);
      setErrorMsg(null);
    };
    reader.onerror = () => {
      setErrorMsg("No se pudo leer el archivo PDF seleccionado.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePdf = () => {
    setPdfEstandarBase64(null);
    setPdfEstandarNombre(null);
    setPdfEstandarSizeBytes(null);
    if (pdfInputRef.current) {
      pdfInputRef.current.value = "";
    }
  };

  // Step 1: Request instructional structure generation
  const handleGenerarEstructura = async () => {
    try {
      if (!effectiveCursoNombre || !effectiveCursoNombre.trim()) {
        setErrorMsg("Por favor seleccione un curso del catálogo o indique el nombre del nuevo curso.");
        return;
      }

      setGenerating(true);
      setErrorMsg(null);

      const res = await generarEstructuraPresentacion({
        cursoId: origenCurso === "catalogo" ? selectedCursoId : null,
        cursoNombre: effectiveCursoNombre.trim(),
        contenidoCurso: effectiveContenidoCurso,
        cargaHorariaStd: effectiveCargaHoraria,
        alcance,
        moduloNombre: alcance === "modulo_especifico" ? moduloNombre : undefined,
        enfoqueNormativo,
        audienciaNivel,
        directricesAdicionales: directrices,
        pdfEstandarBase64: pdfEstandarBase64 || undefined,
        pdfEstandarNombre: pdfEstandarNombre || undefined,
      });

      if (res.success && res.slides && res.slides.length > 0) {
        setSlides(res.slides);
        setSelectedIndex(0);
        setCurrentStep(2);
      } else {
        setErrorMsg(res.error || "No se pudo generar la estructura de diapositivas.");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error al estructurar presentación.");
    } finally {
      setGenerating(false);
    }
  };

  // Slide Modification Helpers
  const updateActiveSlide = (fields: Partial<SlideDefinition>) => {
    setSlides((prev) =>
      prev.map((s, idx) => (idx === selectedIndex ? { ...s, ...fields } : s)),
    );
  };

  const handleAddSlide = (layout: SlideLayoutType = "concepto") => {
    const newSlide: SlideDefinition = {
      id: `slide-${Date.now()}`,
      layout,
      titulo: layout === "video_recurso" ? "Demostración Audiovisual" : "Nuevo Concepto Técnico",
      subtitulo: "Descripción detallada del contenido",
      badge: "UNIDAD TÉCNICA",
      bullets: ["Punto de aprendizaje 1", "Punto de aprendizaje 2"],
      notasFacilitador: "Puntos clave a discutir con el grupo.",
      tieneVideo: layout === "video_recurso",
    };
    setSlides((prev) => [...prev, newSlide]);
    setSelectedIndex(slides.length);
  };

  const handleDeleteSlide = (index: number) => {
    if (slides.length <= 1) return;
    const newSlides = slides.filter((_, idx) => idx !== index);
    setSlides(newSlides);
    if (selectedIndex >= newSlides.length) {
      setSelectedIndex(newSlides.length - 1);
    }
  };

  const handleMoveSlide = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= slides.length) return;
    const newSlides = [...slides];
    const temp = newSlides[index];
    newSlides[index] = newSlides[targetIdx];
    newSlides[targetIdx] = temp;
    setSlides(newSlides);
    setSelectedIndex(targetIdx);
  };

  // Video attachment handler for active slide
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 80 * 1024 * 1024) {
      alert("El video excede el límite recomendado de 80 MB. Para evitar sobrecargar la presentación, use clips cortos.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      updateActiveSlide({
        tieneVideo: true,
        videoFileName: file.name,
        videoFileBase64: base64,
        videoTitulo: file.name.replace(/\.[^/.]+$/, ""),
      });
    };
    reader.readAsDataURL(file);
  };

  // Compile and Save / Download
  const handleCompilar = async (guardarEnServidor: boolean) => {
    try {
      setCompiling(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const targetCursoId = origenCurso === "catalogo" ? selectedCursoId : null;

      const res = await compilarYGuardarPresentacionAction({
        cursoId: targetCursoId,
        cursoNombre: effectiveCursoNombre,
        tituloPresentacion: `${effectiveCursoNombre} - Presentación Oficial`,
        slides,
        guardarEnServidor,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Error al compilar presentación");
        return;
      }

      // Download file locally in browser
      if (res.base64Data) {
        const byteCharacters = atob(res.base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {
          type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.fileName || `${effectiveCursoNombre.replace(/\s+/g, "_")}_Presentacion.pptx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      if (guardarEnServidor) {
        if (targetCursoId) {
          setSuccessMsg(
            `¡Presentación compilada y guardada exitosamente en los recursos del curso! (${res.fileSizeFormatted})`,
          );
          onSuccess?.();
        } else {
          setSuccessMsg(
            `¡Presentación compilada y descargada exitosamente! (${res.fileSizeFormatted})`,
          );
        }
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error al procesar la presentación");
    } finally {
      setCompiling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-700 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Presentation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Estudio de Presentaciones Digitales
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                  Formato PPTX Nativo
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {effectiveCursoNombre || "Nueva Presentación"} •{" "}
                <span className="font-semibold text-slate-700">{effectiveCargaHoraria}h oficiales</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentStep === 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(1)}
                className="text-xs text-slate-600 hover:text-slate-900"
              >
                <Sliders className="w-3.5 h-3.5 mr-1" />
                Configurar Parámetros
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Feedback Notifications */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: CONFIGURATION & GENERATION */}
          {currentStep === 1 && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="text-center space-y-1.5 pb-1">
                <h4 className="text-lg font-bold text-slate-900">
                  Diseño de Diapositivas Corporativas
                </h4>
                <p className="text-xs text-slate-600">
                  Estructure automáticamente las láminas oficiales del curso siguiendo la paleta de identidad SHA de Venezuela, estándares normativos y secuencias pedagógicas de alto impacto.
                </p>
              </div>

              {/* CARD 1: ORIGIN / COURSE SELECTION */}
              <div className="p-5 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-sky-700" />
                    Selección del Curso
                  </Label>
                  <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setOrigenCurso("catalogo")}
                      className={`px-3 py-1 rounded-md font-semibold transition-all ${
                        origenCurso === "catalogo"
                          ? "bg-white text-sky-800 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Catálogo Oficial
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOrigenCurso("nuevo");
                        setSelectedCursoId(null);
                      }}
                      className={`px-3 py-1 rounded-md font-semibold transition-all ${
                        origenCurso === "nuevo"
                          ? "bg-white text-sky-800 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Nuevo Curso / A Medida
                    </button>
                  </div>
                </div>

                {/* Option A: Select from catalog */}
                {origenCurso === "catalogo" && (
                  <div className="space-y-3">
                    {cursosCatalogo && cursosCatalogo.length > 0 ? (
                      <div>
                        <div className="relative mb-2">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                          <Input
                            value={busquedaCurso}
                            onChange={(e) => setBusquedaCurso(e.target.value)}
                            placeholder="Buscar curso en el catálogo por nombre..."
                            className="h-9 pl-8 text-xs bg-white"
                          />
                        </div>
                        <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                          {cursosFiltrados.length > 0 ? (
                            cursosFiltrados.map((curso) => {
                              const isSelected = selectedCursoId === curso.id;
                              return (
                                <button
                                  key={curso.id}
                                  type="button"
                                  onClick={() => handleSelectCursoCatalogo(curso.id)}
                                  className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs transition-colors ${
                                    isSelected
                                      ? "bg-sky-50 text-sky-900 font-bold"
                                      : "hover:bg-slate-50 text-slate-700"
                                  }`}
                                >
                                  <div className="min-w-0 flex-1 pr-3">
                                    <span className="block truncate font-semibold">
                                      {curso.nombre}
                                    </span>
                                    {curso.categoria && (
                                      <span className="text-[10px] text-slate-400">
                                        Categoría: {curso.categoria}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[11px] text-slate-500 font-medium">
                                      {curso.carga_horaria_std || 8}h
                                    </span>
                                    {isSelected && (
                                      <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                                    )}
                                  </div>
                                </button>
                              );
                            })
                          ) : (
                            <div className="p-3 text-center text-xs text-slate-400">
                              No se encontraron cursos con ese nombre.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                        No hay cursos en el catálogo disponibles para selección inmediata. Puede ingresar el nombre en la opción &quot;Nuevo Curso / A Medida&quot;.
                      </div>
                    )}

                    {selectedCursoObj && (
                      <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between text-sky-900 font-bold">
                          <span>Curso Seleccionado:</span>
                          <span className="bg-sky-100 px-2 py-0.5 rounded-full text-[11px]">
                            {selectedCursoObj.carga_horaria_std || 8} Horas
                          </span>
                        </div>
                        <p className="text-slate-700 font-medium">{selectedCursoObj.nombre}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Option B: Input new custom course */}
                {origenCurso === "nuevo" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-3 space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700">
                          Título / Nombre del Nuevo Curso *
                        </Label>
                        <Input
                          value={cursoNombreInput}
                          onChange={(e) => setCursoNombreInput(e.target.value)}
                          placeholder="Ej. Seguridad en Trabajos de Izamiento Crítico y Grúas Móviles"
                          className="h-10 text-xs bg-white font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700">
                          Carga Horaria (Horas)
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={120}
                          value={cargaHorariaInput}
                          onChange={(e) => setCargaHorariaInput(Number(e.target.value) || 8)}
                          className="h-10 text-xs bg-white text-center font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">
                        Temario / Contenido Programático (Opcional)
                      </Label>
                      <textarea
                        value={contenidoCursoInput}
                        onChange={(e) => setContenidoCursoInput(e.target.value)}
                        rows={3}
                        placeholder="Módulo I: Normativa y Principios...&#10;Módulo II: Inspección de Equipos y Accesorios...&#10;Módulo III: Maniobras y Señalización..."
                        className="w-full text-xs rounded-xl border border-slate-300 bg-white p-3 text-slate-800 focus:ring-2 focus:ring-sky-500 resize-none font-normal"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* CARD 2: CLIENT STANDARD PDF ATTACHMENT */}
              <div className="p-5 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <FileUp className="w-4 h-4 text-emerald-700" />
                      Norma Técnica o Estándar del Cliente (PDF Opcional)
                    </Label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Si el cliente posee directrices o especificaciones propias (ej. Chevron HES, Repsol, PDVSA, etc.), adjunte el documento PDF. El contenido se adaptará a sus procedimientos obligatorios.
                    </p>
                  </div>
                  {pdfEstandarNombre && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                      Norma Adjunta
                    </span>
                  )}
                </div>

                {!pdfEstandarNombre ? (
                  <div className="border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-xl p-4 text-center bg-white transition-colors">
                    <input
                      ref={pdfInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={handlePdfUpload}
                      className="hidden"
                      id="pdf-standard-upload"
                    />
                    <label
                      htmlFor="pdf-standard-upload"
                      className="cursor-pointer flex flex-col items-center justify-center space-y-1.5"
                    >
                      <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 hover:text-sky-700">
                        Cargar documento PDF con el Estándar del Cliente
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Formatos aceptados: PDF (máx. 25 MB)
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="p-3 bg-white border border-emerald-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <FileCheck className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-slate-800 truncate">
                          {pdfEstandarNombre}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {pdfEstandarSizeBytes ? `${(pdfEstandarSizeBytes / 1024 / 1024).toFixed(2)} MB` : "Documento analizado"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePdf}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                      title="Quitar documento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* CARD 3: PEDAGOGICAL PARAMETERS */}
              <div className="p-5 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-4">
                <Label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-sky-700" />
                  Parámetros Pedagógicos y Normativos
                </Label>

                {/* Scope selector */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Alcance de la Presentación
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAlcance("curso_completo")}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        alcance === "curso_completo"
                          ? "border-sky-600 bg-sky-50/50 ring-2 ring-sky-500/20"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <span className="block text-xs font-bold text-slate-900">Curso Completo</span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        Genera todas las unidades temáticas ({effectiveCargaHoraria}h)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAlcance("modulo_especifico")}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        alcance === "modulo_especifico"
                          ? "border-sky-600 bg-sky-50/50 ring-2 ring-sky-500/20"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <span className="block text-xs font-bold text-slate-900">Módulo Específico</span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        Láminas enfocadas en una sola unidad temática
                      </span>
                    </button>
                  </div>
                </div>

                {/* Module selection dropdown (if modular scope) */}
                {alcance === "modulo_especifico" && (
                  <div className="space-y-1.5 animate-in fade-in">
                    <Label className="text-xs font-semibold text-slate-700">
                      Módulo a Desarrollar
                    </Label>
                    {detectedModules.length > 0 ? (
                      <select
                        value={moduloNombre}
                        onChange={(e) => setModuloNombre(e.target.value)}
                        className="w-full text-xs rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="">Selecciona un módulo detectado...</option>
                        {detectedModules.map((m, idx) => (
                          <option key={idx} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        value={moduloNombre}
                        onChange={(e) => setModuloNombre(e.target.value)}
                        placeholder="Ej. Módulo II: Maniobras y Equipos de Izamiento"
                        className="h-10 text-xs bg-white"
                      />
                    )}
                  </div>
                )}

                {/* Normative & Audience Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Marco Normativo Principal
                    </Label>
                    <select
                      value={enfoqueNormativo}
                      onChange={(e) => setEnfoqueNormativo(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="COVENIN / LOPCYMAT">COVENIN / LOPCYMAT (Venezuela)</option>
                      <option value="OSHA 1910 / 1926">OSHA 1910 General / 1926 Construcción</option>
                      <option value="Estándares IOGP Petróleo y Gas">IOGP (Petróleo y Gas / Offshore)</option>
                      <option value="ISO 45001 / Buenas Prácticas">ISO 45001 / Gestión HSEQ</option>
                      <option value="General Industrial">General Industrial / Técnico</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Nivel de la Audiencia
                    </Label>
                    <select
                      value={audienciaNivel}
                      onChange={(e) => setAudienciaNivel(e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="Personal Operativo y de Campo">Personal Operativo y de Campo</option>
                      <option value="Supervisores y Líderes de Seguridad">Supervisores y Líderes de Seguridad</option>
                      <option value="Técnicos Especialistas e Inspectores">Técnicos Especialistas e Inspectores</option>
                      <option value="Nivel Directivo y Gerencial">Nivel Directivo y Gerencial</option>
                    </select>
                  </div>
                </div>

                {/* Additional Guidelines */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Directrices o Énfasis Opcional
                  </Label>
                  <textarea
                    value={directrices}
                    onChange={(e) => setDirectrices(e.target.value)}
                    rows={2}
                    placeholder="Ej. Enfatizar la Autoridad para Detener el Trabajo (SWA), uso correcto de arnés y pruebas de atmósfera previa."
                    className="w-full text-xs rounded-xl border border-slate-300 bg-white p-3 text-slate-800 focus:ring-2 focus:ring-sky-500 resize-none font-normal"
                  />
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-center pt-2">
                <Button
                  onClick={handleGenerarEstructura}
                  disabled={generating}
                  className="h-12 px-8 rounded-xl font-bold bg-sky-700 hover:bg-sky-800 text-white shadow-lg shadow-sky-200 transition-all text-sm gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Estructurando secuencia pedagógica y láminas...</span>
                    </>
                  ) : (
                    <>
                      <Presentation className="w-5 h-5" />
                      <span>Diseñar Estructura de Diapositivas</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: INTERACTIVE SLIDE STUDIO */}
          {currentStep === 2 && (
            <div className="grid grid-cols-12 gap-6 h-[68vh]">
              {/* Left Column: Slide Navigator List */}
              <div className="col-span-12 md:col-span-4 flex flex-col border border-slate-200 rounded-2xl bg-slate-50/60 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase">
                    Láminas ({slides.length})
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleAddSlide("concepto")}
                      className="p-1.5 rounded-lg text-sky-700 hover:bg-sky-50 text-xs font-semibold flex items-center gap-1"
                      title="Agregar diapositiva estándar"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Lámina</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddSlide("video_recurso")}
                      className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 text-xs font-semibold flex items-center gap-1"
                      title="Agregar diapositiva con video"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Video</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {slides.map((s, idx) => (
                    <div
                      key={s.id || idx}
                      onClick={() => setSelectedIndex(idx)}
                      className={`group p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                        selectedIndex === idx
                          ? "bg-white border-sky-500 shadow-sm ring-1 ring-sky-500/20"
                          : "bg-white/80 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 text-xs font-bold">
                        {idx + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">
                            {LAYOUT_LABELS[s.layout]?.icon}
                          </span>
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {s.titulo}
                          </span>
                        </div>
                        <span className="block text-[10px] text-slate-500 truncate mt-0.5">
                          {s.subtitulo || s.badge || LAYOUT_LABELS[s.layout]?.label}
                        </span>
                      </div>

                      {/* Reorder controls */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveSlide(idx, "up");
                          }}
                          disabled={idx === 0}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveSlide(idx, "down");
                          }}
                          disabled={idx === slides.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSlide(idx);
                          }}
                          disabled={slides.length <= 1}
                          className="p-1 text-rose-400 hover:text-rose-600 disabled:opacity-30"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Center/Right Column: Slide Detail Editor */}
              <div className="col-span-12 md:col-span-8 flex flex-col border border-slate-200 rounded-2xl bg-white overflow-hidden">
                {activeSlide ? (
                  <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Header: Layout & Badge */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-slate-100">
                      <div>
                        <Label className="text-xs font-bold text-slate-600 uppercase mb-1 block">
                          Plantilla de Diseño
                        </Label>
                        <select
                          value={activeSlide.layout}
                          onChange={(e) =>
                            updateActiveSlide({ layout: e.target.value as SlideLayoutType })
                          }
                          className="w-full text-xs rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 font-semibold focus:ring-2 focus:ring-sky-500"
                        >
                          {Object.entries(LAYOUT_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v.icon} {v.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label className="text-xs font-bold text-slate-600 uppercase mb-1 block">
                          Etiqueta Superior / Módulo
                        </Label>
                        <Input
                          value={activeSlide.badge || ""}
                          onChange={(e) => updateActiveSlide({ badge: e.target.value })}
                          placeholder="Ej. MÓDULO I / SEGURIDAD"
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    {/* Title & Subtitle */}
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-bold text-slate-600 uppercase mb-1 block">
                          Título de la Diapositiva
                        </Label>
                        <Input
                          value={activeSlide.titulo}
                          onChange={(e) => updateActiveSlide({ titulo: e.target.value })}
                          className="h-10 text-sm font-bold text-slate-900"
                          placeholder="Título representativo"
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-bold text-slate-600 uppercase mb-1 block">
                          Subtítulo o Contexto Breve
                        </Label>
                        <Input
                          value={activeSlide.subtitulo || ""}
                          onChange={(e) => updateActiveSlide({ subtitulo: e.target.value })}
                          className="h-9 text-xs"
                          placeholder="Breve frase explicativa"
                        />
                      </div>
                    </div>

                    {/* BULLETS EDITOR (For layouts using bullet lists) */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-600 uppercase">
                          Puntos Clave / Párrafos de la Lámina
                        </Label>
                        <button
                          type="button"
                          onClick={() => {
                            const current = activeSlide.bullets || [];
                            updateActiveSlide({ bullets: [...current, "Nuevo punto clave"] });
                          }}
                          className="text-xs text-sky-700 hover:text-sky-800 font-semibold flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Agregar punto</span>
                        </button>
                      </div>

                      {(activeSlide.bullets || []).map((bullet, bIdx) => (
                        <div key={bIdx} className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                            •
                          </span>
                          <Input
                            value={bullet}
                            onChange={(e) => {
                              const updated = [...(activeSlide.bullets || [])];
                              updated[bIdx] = e.target.value;
                              updateActiveSlide({ bullets: updated });
                            }}
                            className="h-8 text-xs flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (activeSlide.bullets || []).filter((_, i) => i !== bIdx);
                              updateActiveSlide({ bullets: updated });
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* VIDEO ATTACHMENT SECTION (For video slides or when requested) */}
                    {(activeSlide.layout === "video_recurso" || activeSlide.tieneVideo) && (
                      <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 uppercase">
                            <Video className="w-4 h-4 text-emerald-700" />
                            Recurso de Video Integrado
                          </Label>
                          {activeSlide.videoFileName && (
                            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
                              Video Cargado
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                              Cargar Archivo MP4 / WebM
                            </label>
                            <input
                              ref={videoInputRef}
                              type="file"
                              accept="video/mp4,video/webm"
                              onChange={handleVideoFileChange}
                              className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                            />
                            <p className="text-[10px] text-emerald-700 mt-1">
                              Se integrará como reproductor nativo dentro de la diapositiva.
                            </p>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                              Título del Video
                            </label>
                            <Input
                              value={activeSlide.videoTitulo || ""}
                              onChange={(e) => updateActiveSlide({ videoTitulo: e.target.value })}
                              placeholder="Ej. Procedimiento de Bloqueo LOTO en Planta"
                              className="h-8 text-xs bg-white"
                            />
                          </div>
                        </div>

                        {/* Video Preview if Base64 exists */}
                        {activeSlide.videoFileBase64 && (
                          <div className="pt-2">
                            <video
                              src={activeSlide.videoFileBase64}
                              controls
                              className="w-full max-h-36 rounded-lg bg-black"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Highlight Note */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-600 uppercase">
                        Frase de Énfasis o Regla Crítica (Opcional)
                      </Label>
                      <Input
                        value={activeSlide.destacado || ""}
                        onChange={(e) => updateActiveSlide({ destacado: e.target.value })}
                        placeholder="Ej. SWA: Todo trabajador tiene la autoridad y el deber de suspender la tarea."
                        className="h-9 text-xs"
                      />
                    </div>

                    {/* Speaker Notes */}
                    <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1.5">
                      <Label className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                        Notas para el Facilitador (Privadas, se guardan en el archivo PPTX)
                      </Label>
                      <textarea
                        value={activeSlide.notasFacilitador || ""}
                        onChange={(e) => updateActiveSlide({ notasFacilitador: e.target.value })}
                        rows={3}
                        placeholder="Instrucciones para el orador, preguntas a formular a la clase y dinámicas recomendadas."
                        className="w-full text-xs rounded-lg border border-amber-200 bg-white p-2 text-slate-800 focus:ring-2 focus:ring-amber-500 resize-none font-medium"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                    Seleccione una diapositiva en la lista izquierda para editarla.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div>
            {currentStep === 2 && (
              <span className="text-xs text-slate-500 font-medium">
                {slides.length} diapositivas listas para compilar
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={generating || compiling}
              className="text-xs"
            >
              Cerrar
            </Button>

            {currentStep === 2 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCompilar(false)}
                  disabled={compiling || slides.length === 0}
                  className="text-xs text-sky-700 border-sky-300 hover:bg-sky-50 gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Archivo PPTX</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => handleCompilar(true)}
                  disabled={compiling || slides.length === 0}
                  className="text-xs font-bold bg-sky-700 hover:bg-sky-800 text-white shadow-md shadow-sky-200 gap-1.5"
                >
                  {compiling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Compilando presentación oficial...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Compilar y Guardar en Recursos</span>
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
