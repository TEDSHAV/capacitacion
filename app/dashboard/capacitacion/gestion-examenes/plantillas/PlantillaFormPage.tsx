"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Sparkles,
} from "lucide-react";
import type {
  EvaluacionPlantilla,
  EvaluacionPregunta,
  TipoEvaluacionCurso,
  EtapaEvaluacion,
} from "@/types/evaluacion";
import { saveEvaluacionPlantilla } from "@/app/actions/evaluaciones-cursos";

interface CourseOption {
  id: number;
  nombre: string;
  nota_aprobatoria?: number | null;
}

interface PlantillaFormPageProps {
  initialTemplate?: EvaluacionPlantilla | null;
  courses: CourseOption[];
}

export default function PlantillaFormPage({
  initialTemplate,
  courses,
}: PlantillaFormPageProps) {
  const router = useRouter();
  const isEditing = Boolean(initialTemplate?.id);

  // General template fields
  const [titulo, setTitulo] = useState(initialTemplate?.titulo || "");
  const [idCurso, setIdCurso] = useState<number | null>(initialTemplate?.id_curso ?? null);
  const [descripcion, setDescripcion] = useState(initialTemplate?.descripcion || "");
  const [notaAprobatoria, setNotaAprobatoria] = useState<number>(
    initialTemplate?.nota_aprobatoria ?? 14
  );
  const [duracionMinutos, setDuracionMinutos] = useState<number | string>(
    initialTemplate?.duracion_minutos ?? ""
  );
  const [tipoEvaluacion, setTipoEvaluacion] = useState<TipoEvaluacionCurso>(
    initialTemplate?.tipo_evaluacion || "standard"
  );

  // Active sub-tab for Pre/Post evaluation questions
  const [activeStageTab, setActiveStageTab] = useState<EtapaEvaluacion>("pre");

  // Questions state
  const [questions, setQuestions] = useState<EvaluacionPregunta[]>(() => {
    if (initialTemplate?.preguntas && initialTemplate.preguntas.length > 0) {
      return initialTemplate.preguntas;
    }
    // Default initial 10 questions template (2 pts each = 20 pts)
    return Array.from({ length: 10 }, (_, i) => ({
      id: `new_${Date.now()}_${i}`,
      enunciado: "",
      tipo: "single_choice" as const,
      puntos: 2,
      orden: i + 1,
      etapa: "post" as const,
      opciones: [
        { id: "opt_a", texto: "", es_correcta: true },
        { id: "opt_b", texto: "", es_correcta: false },
        { id: "opt_c", texto: "", es_correcta: false },
      ],
    }));
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Questions filtered by active stage
  const currentStageQuestions =
    tipoEvaluacion === "pre_post"
      ? questions.filter((q) => (q.etapa || "post") === activeStageTab)
      : questions;

  // Points calculation
  const totalStandardPoints = questions.reduce((sum, q) => sum + (Number(q.puntos) || 0), 0);
  const prePoints = questions
    .filter((q) => (q.etapa || "post") === "pre")
    .reduce((sum, q) => sum + (Number(q.puntos) || 0), 0);
  const postPoints = questions
    .filter((q) => (q.etapa || "post") === "post")
    .reduce((sum, q) => sum + (Number(q.puntos) || 0), 0);

  // Handle course select: auto-set passing score if course has one
  const handleCourseChange = (courseId: number | null) => {
    setIdCurso(courseId);
    if (courseId) {
      const selected = courses.find((c) => c.id === courseId);
      if (selected && selected.nota_aprobatoria != null) {
        setNotaAprobatoria(selected.nota_aprobatoria);
      }
      if (!titulo.trim() && selected) {
        setTitulo(`Evaluación de ${selected.nombre}`);
      }
    }
  };

  // Add question
  const handleAddQuestion = (stage: EtapaEvaluacion = "post") => {
    const targetStage = tipoEvaluacion === "pre_post" ? stage : "post";
    const stageQuestions = questions.filter((q) => (q.etapa || "post") === targetStage);
    const newQ: EvaluacionPregunta = {
      id: `new_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      enunciado: "",
      tipo: "single_choice",
      puntos: 2,
      orden: stageQuestions.length + 1,
      etapa: targetStage,
      opciones: [
        { id: "opt_a", texto: "", es_correcta: true },
        { id: "opt_b", texto: "", es_correcta: false },
        { id: "opt_c", texto: "", es_correcta: false },
      ],
    };
    setQuestions([...questions, newQ]);
  };

  // Remove question
  const handleRemoveQuestion = (questionId: string) => {
    setQuestions(questions.filter((q) => q.id !== questionId));
  };

  // Update question
  const handleUpdateQuestion = (
    questionId: string,
    field: keyof EvaluacionPregunta,
    value: any
  ) => {
    setQuestions(
      questions.map((q) => (q.id === questionId ? { ...q, [field]: value } : q))
    );
  };

  // Option operations
  const handleUpdateOption = (
    questionId: string,
    optionIndex: number,
    texto: string
  ) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== questionId) return q;
        const newOptions = [...q.opciones];
        newOptions[optionIndex] = { ...newOptions[optionIndex], texto };
        return { ...q, opciones: newOptions };
      })
    );
  };

  const handleSetCorrectOption = (questionId: string, optionIndex: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== questionId) return q;
        const newOptions = q.opciones.map((opt, i) => ({
          ...opt,
          es_correcta: i === optionIndex,
        }));
        return { ...q, opciones: newOptions };
      })
    );
  };

  const handleAddOption = (questionId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== questionId) return q;
        const nextLetter = String.fromCharCode(65 + q.opciones.length).toLowerCase();
        return {
          ...q,
          opciones: [
            ...q.opciones,
            { id: `opt_${nextLetter}_${Date.now()}`, texto: "", es_correcta: false },
          ],
        };
      })
    );
  };

  const handleRemoveOption = (questionId: string, optionIndex: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== questionId || q.opciones.length <= 2) return q;
        const wasCorrect = q.opciones[optionIndex].es_correcta;
        const newOptions = q.opciones.filter((_, i) => i !== optionIndex);
        if (wasCorrect && newOptions.length > 0) {
          newOptions[0].es_correcta = true;
        }
        return { ...q, opciones: newOptions };
      })
    );
  };

  // Move question up/down
  const handleMoveQuestion = (questionId: string, direction: "up" | "down") => {
    const stageQuestions = currentStageQuestions;
    const idx = stageQuestions.findIndex((q) => q.id === questionId);
    if (idx < 0) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === stageQuestions.length - 1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    const targetQ = stageQuestions[targetIdx];

    // Swap order
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) return { ...q, orden: targetIdx + 1 };
        if (q.id === targetQ.id) return { ...q, orden: idx + 1 };
        return q;
      })
    );
  };

  // Save
  const handleSave = async () => {
    setError(null);

    if (!titulo.trim()) {
      setError("El título de la evaluación es obligatorio.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (tipoEvaluacion === "pre_post") {
      const preList = questions.filter((q) => (q.etapa || "post") === "pre");
      const postList = questions.filter((q) => (q.etapa || "post") === "post");
      if (preList.length === 0) {
        setError("Debes agregar al menos 1 pregunta para la Pre-Evaluación.");
        setActiveStageTab("pre");
        return;
      }
      if (postList.length === 0) {
        setError("Debes agregar al menos 1 pregunta para la Post-Evaluación.");
        setActiveStageTab("post");
        return;
      }
    } else {
      if (questions.length === 0) {
        setError("Debes agregar al menos una pregunta a la evaluación.");
        return;
      }
    }

    // Validate that questions have statements and options with text
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.enunciado.trim()) {
        setError(`La pregunta #${i + 1} no tiene enunciado.`);
        return;
      }
      const hasCorrect = q.opciones.some((o) => o.es_correcta);
      if (!hasCorrect) {
        setError(`La pregunta #${i + 1} debe tener una opción correcta marcada.`);
        return;
      }
      for (let j = 0; j < q.opciones.length; j++) {
        if (!q.opciones[j].texto.trim()) {
          setError(`La opción ${String.fromCharCode(65 + j)} de la pregunta #${i + 1} está vacía.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const res = await saveEvaluacionPlantilla({
        id: initialTemplate?.id,
        id_curso: idCurso,
        titulo: titulo.trim(),
        descripcion: descripcion?.trim() || null,
        nota_aprobatoria: notaAprobatoria,
        duracion_minutos: duracionMinutos ? Number(duracionMinutos) : null,
        tipo_evaluacion: tipoEvaluacion,
        preguntas: questions.map((q, idx) => ({
          ...q,
          orden: idx + 1,
          etapa: tipoEvaluacion === "pre_post" ? q.etapa || "post" : "post",
        })),
      });

      if (res.error) {
        setError(res.error);
      } else {
        router.push("/dashboard/capacitacion/gestion-examenes");
      }
    } catch (err: any) {
      console.error("Error saving template:", err);
      setError(err?.message || "Error al guardar la plantilla.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Back button and title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/dashboard/capacitacion/gestion-examenes"
            className="inline-flex items-center text-xs text-slate-500 hover:text-teal-700 font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Volver a Evaluaciones Digitales
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <span>{isEditing ? "Editar Plantilla de Examen" : "Nueva Plantilla de Examen"}</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/capacitacion/gestion-examenes")}
            disabled={saving}
            className="text-xs sm:text-sm"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Guardando..." : "Guardar Plantilla"}</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm flex items-start gap-2.5 shadow-2xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* CARD 1: INFORMACIÓN GENERAL */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
          <Layers className="w-4 h-4 text-teal-600" />
          <span>Configuración General del Examen</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Título de la Plantilla de Examen *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Evaluación de Manejo Seguro de Montacargas"
              className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Curso del Catálogo Activo (Opcional)
            </label>
            <select
              value={idCurso ?? ""}
              onChange={(e) => handleCourseChange(e.target.value ? Number(e.target.value) : null)}
              className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">-- Sin curso predeterminado --</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Muestra únicamente los cursos activos del catálogo de Capacitación.
            </p>
          </div>
        </div>

        {/* Tipo de Evaluación: Standard vs Pre/Post */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Modalidad de Evaluación *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTipoEvaluacion("standard")}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                tipoEvaluacion === "standard"
                  ? "bg-teal-50/80 border-teal-500 ring-2 ring-teal-500/20"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900">Examen Regular Único</span>
                {tipoEvaluacion === "standard" && (
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Un único examen final de conocimientos aplicado a los participantes al concluir la capacitación.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTipoEvaluacion("pre_post")}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                tipoEvaluacion === "pre_post"
                  ? "bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900">Evaluación Pre y Post (Diagnóstica y Final)</span>
                {tipoEvaluacion === "pre_post" && (
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Aplica dos evaluaciones con preguntas distintas: un diagnóstico inicial (Pre) y un examen de aprendizaje final (Post).
              </p>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nota Aprobatoria (Escala 0–20) *
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={notaAprobatoria}
              onChange={(e) => setNotaAprobatoria(Number(e.target.value))}
              className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tiempo Límite en Minutos (Opcional)
            </label>
            <input
              type="number"
              min="1"
              max="180"
              value={duracionMinutos}
              onChange={(e) => setDuracionMinutos(e.target.value)}
              placeholder="Ej. 30 (deja vacío si no hay límite)"
              className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descripción o Instrucciones (Opcional)
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Instrucciones breves para el alumno..."
              className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </section>

      {/* CARD 2: BANCO DE PREGUNTAS */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
        {/* Stage sub-tabs if Pre/Post */}
        {tipoEvaluacion === "pre_post" && (
          <div className="flex border-b border-slate-200 pb-3 gap-3">
            <button
              type="button"
              onClick={() => setActiveStageTab("pre")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeStageTab === "pre"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>1. Evaluación Pre-Capacitación (Inicial)</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">
                {questions.filter((q) => (q.etapa || "post") === "pre").length} preg
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStageTab("post")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeStageTab === "post"
                  ? "bg-teal-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>2. Evaluación Post-Capacitación (Final)</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">
                {questions.filter((q) => (q.etapa || "post") === "post").length} preg
              </span>
            </button>
          </div>
        )}

        {/* Section Header with 20-Point Balance Pill */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>
                {tipoEvaluacion === "pre_post"
                  ? activeStageTab === "pre"
                    ? "Preguntas Pre-Evaluación (Diagnóstico Inicial)"
                    : "Preguntas Post-Evaluación (Evaluación Final)"
                  : "Preguntas de la Evaluación"}
              </span>
              <span className="text-xs text-slate-400 font-normal">
                ({currentStageQuestions.length} preguntas)
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Por defecto cada pregunta tiene 3 opciones (A, B, C) con una opción correcta obligatoria.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Scale Indicator */}
            {(() => {
              const pts =
                tipoEvaluacion === "pre_post"
                  ? activeStageTab === "pre"
                    ? prePoints
                    : postPoints
                  : totalStandardPoints;
              const is20 = pts === 20;
              return (
                <div
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold border flex items-center gap-1.5 ${
                    is20
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-amber-50 text-amber-900 border-amber-300"
                  }`}
                >
                  {is20 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  <span>
                    Total: {pts} / 20 pts {is20 ? "(Perfecto)" : "(Sugerido: 20 pts)"}
                  </span>
                </div>
              );
            })()}

            <Button
              type="button"
              size="sm"
              onClick={() => handleAddQuestion(activeStageTab)}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Agregar Pregunta</span>
            </Button>
          </div>
        </div>

        {/* Questions list */}
        {currentStageQuestions.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-3">
            <p className="text-xs sm:text-sm text-slate-500">
              No hay preguntas registradas para esta sección.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => handleAddQuestion(activeStageTab)}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1" />
              Crear primera pregunta
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {currentStageQuestions.map((q, idx) => (
              <div
                key={q.id}
                className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-3"
              >
                {/* Question Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      Pregunta #{idx + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Points selector */}
                    <div className="flex items-center gap-1">
                      <label className="text-[11px] text-slate-500 font-semibold">
                        Puntos:
                      </label>
                      <input
                        type="number"
                        min="0.5"
                        max="20"
                        step="0.5"
                        value={q.puntos}
                        onChange={(e) =>
                          handleUpdateQuestion(q.id, "puntos", Number(e.target.value))
                        }
                        className="w-16 text-xs text-center border border-slate-300 rounded px-1.5 py-1 bg-white font-bold"
                      />
                    </div>

                    {/* Move up / down */}
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveQuestion(q.id, "up")}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                      title="Subir posición"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === currentStageQuestions.length - 1}
                      onClick={() => handleMoveQuestion(q.id, "down")}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                      title="Bajar posición"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(q.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer transition-colors"
                      title="Eliminar pregunta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Statement Input */}
                <div>
                  <textarea
                    rows={2}
                    value={q.enunciado}
                    onChange={(e) => handleUpdateQuestion(q.id, "enunciado", e.target.value)}
                    placeholder="Escribe el enunciado de la pregunta aquí..."
                    className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Options List */}
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                    <span>Opciones de respuesta (Selecciona el botón radial para indicar la respuesta correcta):</span>
                    <button
                      type="button"
                      onClick={() => handleAddOption(q.id)}
                      className="text-[11px] text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Agregar Opción
                    </button>
                  </div>

                  {q.opciones.map((opt, optIdx) => (
                    <div
                      key={opt.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                        opt.es_correcta
                          ? "bg-emerald-50/70 border-emerald-300"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      {/* Radio for correct answer */}
                      <input
                        type="radio"
                        name={`correct_${q.id}`}
                        checked={opt.es_correcta}
                        onChange={() => handleSetCorrectOption(q.id, optIdx)}
                        className="w-4 h-4 text-emerald-600 accent-emerald-600 cursor-pointer ml-1"
                        title="Marcar como respuesta correcta"
                      />

                      <span className="font-bold text-xs text-slate-700 w-5">
                        {String.fromCharCode(65 + optIdx)})
                      </span>

                      <input
                        type="text"
                        value={opt.texto}
                        onChange={(e) => handleUpdateOption(q.id, optIdx, e.target.value)}
                        placeholder={`Texto de la opción ${String.fromCharCode(65 + optIdx)}...`}
                        className="flex-1 text-xs border border-transparent hover:border-slate-300 focus:border-teal-500 rounded px-2 py-1 bg-transparent focus:bg-white focus:outline-none"
                      />

                      {opt.es_correcta && (
                        <span className="text-[10px] font-bold uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded whitespace-nowrap">
                          Correcta
                        </span>
                      )}

                      {q.opciones.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(q.id, optIdx)}
                          className="text-slate-300 hover:text-red-500 p-1 cursor-pointer"
                          title="Eliminar opción"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 flex justify-between items-center border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddQuestion(activeStageTab)}
            className="text-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Agregar otra pregunta</span>
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Guardando..." : "Guardar Plantilla"}</span>
          </Button>
        </div>
      </section>
    </div>
  );
}

