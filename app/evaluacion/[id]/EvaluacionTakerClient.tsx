"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Send,
  Loader2,
  Laptop,
  ShieldCheck,
  Check,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { EvaluacionPublicData } from "@/types/evaluacion";
import {
  submitOSIEvaluacion,
  getParticipantEvaluationStage,
} from "@/app/actions/evaluaciones-cursos";

interface EvaluacionTakerClientProps {
  evaluacion: EvaluacionPublicData;
  nroSesion: number;
  isKiosk: boolean;
}

type Phase = "IDENTITY_PROMPT" | "TAKING_EXAM" | "RESULT";

export default function EvaluacionTakerClient({
  evaluacion,
  nroSesion,
  isKiosk,
}: EvaluacionTakerClientProps) {
  const [phase, setPhase] = useState<Phase>("IDENTITY_PROMPT");

  // Identity state
  const [cedulaPrefix, setCedulaPrefix] = useState<"V" | "E">("V");
  const [cedulaNumber, setCedulaNumber] = useState("");
  const [nombreApellido, setNombreApellido] = useState("");
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [checkingStage, setCheckingStage] = useState(false);

  // Exam state
  const [selectedStage, setSelectedStage] = useState<"pre" | "post">("pre");
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> optionId
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Result state (scores are kept private from participants)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  // Kiosk countdown state
  const [countdown, setCountdown] = useState<number>(10);

  const fullCedula = `${cedulaPrefix}-${cedulaNumber.replace(/\D/g, "")}`;
  const isPrePost = evaluacion.tipoEvaluacion === "pre_post";
  const activeQuestions = isPrePost
    ? evaluacion.preguntas.filter((q) => (q.etapa || "post") === selectedStage)
    : evaluacion.preguntas;

  const totalQuestions = activeQuestions.length;
  const answeredCount = Object.keys(answers).length;
  const currentQ = activeQuestions[currentQuestionIdx];

  // Auto-reset in Kiosk mode once on the result screen
  useEffect(() => {
    if (phase !== "RESULT" || !isKiosk) return;

    setCountdown(10);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleResetKiosk();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, isKiosk]);

  const handleResetKiosk = () => {
    setCedulaNumber("");
    setNombreApellido("");
    setAnswers({});
    setCurrentQuestionIdx(0);
    setAlreadySubmitted(false);
    setSubmitError(null);
    setIdentityError(null);
    setShowConfirmModal(false);
    setShowSubmitConfirm(false);
    setSelectedStage("pre");
    setCheckingStage(false);
    setPhase("IDENTITY_PROMPT");
  };

  const handleStartExam = async () => {
    setIdentityError(null);
    const cleanNum = cedulaNumber.replace(/\D/g, "");
    if (!cleanNum || cleanNum.length < 5) {
      setIdentityError("Por favor ingresa un número de cédula válido.");
      return;
    }

    setCheckingStage(true);
    try {
      const stageRes = await getParticipantEvaluationStage(
        evaluacion.nroOsi || String(evaluacion.osiId),
        fullCedula,
      );

      if (!stageRes.success) {
        setIdentityError(stageRes.error || "No se pudo verificar el estado del participante.");
        setCheckingStage(false);
        return;
      }

      if (stageRes.alreadyCompletedAll) {
        setAlreadySubmitted(true);
        if (stageRes.participantName && !nombreApellido.trim()) {
          setNombreApellido(stageRes.participantName);
        }
        setPhase("RESULT");
        setCheckingStage(false);
        return;
      }

      // Auto-assign the stage detected by server
      setSelectedStage(stageRes.stage);

      // Auto-fill participant name if previously registered in pre-test
      if (stageRes.participantName && !nombreApellido.trim()) {
        setNombreApellido(stageRes.participantName);
      } else if (!nombreApellido.trim() || nombreApellido.trim().length < 3) {
        setIdentityError("Por favor ingresa tu nombre y apellido completos.");
        setCheckingStage(false);
        return;
      }

      const targetQuestions = isPrePost
        ? evaluacion.preguntas.filter((q) => (q.etapa || "post") === stageRes.stage)
        : evaluacion.preguntas;

      if (targetQuestions.length === 0) {
        setIdentityError(
          `No hay preguntas disponibles configuradas para la ${
            stageRes.stage === "pre" ? "Pre-Evaluación" : "Post-Evaluación"
          }.`
        );
        setCheckingStage(false);
        return;
      }

      setShowConfirmModal(true);
    } catch {
      setIdentityError("Error de conexión al verificar cédula. Intenta de nuevo.");
    } finally {
      setCheckingStage(false);
    }
  };

  const handleConfirmIdentity = () => {
    setShowConfirmModal(false);
    setCurrentQuestionIdx(0);
    setAnswers({});
    setPhase("TAKING_EXAM");
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSubmitExam = async () => {
    setShowSubmitConfirm(false);
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await submitOSIEvaluacion({
        identifier: evaluacion.nroOsi || String(evaluacion.osiId),
        nroSesion,
        cedula: fullCedula,
        nombre_apellido: nombreApellido.trim(),
        respuestas: answers,
        dispositivo: isKiosk ? "kiosk" : "mobile_qr",
        etapa: isPrePost ? selectedStage : "post",
      });

      if (!res.success) {
        setSubmitError(res.error || "Ocurrió un error al procesar la evaluación.");
        setSubmitting(false);
        return;
      }

      setAlreadySubmitted(res.alreadySubmitted ?? false);
      if (res.etapa) {
        setSelectedStage(res.etapa);
      }
      setPhase("RESULT");
    } catch {
      setSubmitError("Error de conexión al enviar respuestas. Intente de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col justify-between ${
        isKiosk ? "bg-slate-900 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Top Banner / Header */}
      <header
        className={`px-4 sm:px-8 py-3.5 border-b flex items-center justify-between ${
          isKiosk
            ? "bg-slate-800/90 border-slate-700"
            : "bg-white border-slate-200 shadow-sm"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-black text-sm shadow">
            SHA
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2 py-0.5 rounded">
                OSI: {evaluacion.nroOsi}
              </span>
              {isKiosk && (
                <span className="text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                  <Laptop className="w-3 h-3" />
                  Estación Kiosk Aula
                </span>
              )}
            </div>
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-sm sm:max-w-xl">
              {evaluacion.servicio}
            </h1>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <span className="text-xs text-slate-500 dark:text-slate-400 block truncate max-w-xs">
            {evaluacion.nombreEmpresa}
          </span>
          <span className="text-[11px] text-teal-600 font-semibold">
            Evaluación Digital SHA
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xl">
          {/* ─────────────────────────────────────────────────────────── */}
          {/* PHASE 1: IDENTITY INPUT                                    */}
          {/* ─────────────────────────────────────────────────────────── */}
          {phase === "IDENTITY_PROMPT" && (
            <div
              className={`rounded-2xl p-6 sm:p-8 shadow-xl border space-y-6 animate-in fade-in zoom-in-95 duration-200 ${
                isKiosk
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-white border-slate-200"
              }`}
            >
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center mx-auto mb-2 font-bold shadow-inner">
                  <ShieldCheck className="w-6 h-6 text-teal-700" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold">
                  Evaluación de Aprendizaje
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {evaluacion.titulo}
                </p>
              </div>

              {/* Requirement #6: Prominent Warning Banner */}
              <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1 shadow-sm">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Verificación obligatoria para tu certificado:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  El <strong>Nombre, Apellido y Cédula</strong> que ingreses a continuación se utilizarán textualmente para la emisión de tu <strong>Certificado Oficial y Carnet</strong>. Asegúrate de que no tengan errores de ortografía.
                </p>
              </div>

              {identityError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{identityError}</span>
                </div>
              )}

              {/* Input Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Cédula de Identidad *
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={cedulaPrefix}
                      onChange={(e) => setCedulaPrefix(e.target.value as "V" | "E")}
                      className={`text-xs sm:text-sm font-bold border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        isKiosk
                          ? "bg-slate-700 border-slate-600 text-white"
                          : "bg-white border-slate-300 text-slate-900"
                      }`}
                    >
                      <option value="V">V-</option>
                      <option value="E">E-</option>
                    </select>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cedulaNumber}
                      onChange={(e) => setCedulaNumber(e.target.value)}
                      placeholder="Ej. 18452123"
                      className={`flex-1 text-xs sm:text-sm border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        isKiosk
                          ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                          : "bg-white border-slate-300 text-slate-900"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Nombre y Apellido Completos *
                  </label>
                  <input
                    type="text"
                    value={nombreApellido}
                    onChange={(e) => setNombreApellido(e.target.value)}
                    placeholder="Ej. Carlos Eduardo Mendoza Pérez"
                    className={`w-full text-xs sm:text-sm border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      isKiosk
                        ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                        : "bg-white border-slate-300 text-slate-900"
                    }`}
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Tal como aparece en tu documento de identidad oficial.
                  </span>
                </div>

                {/* Pre / Post Automatic Detection Notice */}
                {isPrePost && (
                  <div className="p-3 bg-teal-50/60 dark:bg-slate-700/50 rounded-xl border border-teal-200/60 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="text-[11px] leading-relaxed">
                      El sistema detectará automáticamente si corresponde tu <strong>Pre-Evaluación (Diagnóstico)</strong> o <strong>Post-Evaluación (Examen Final)</strong> según el registro de tu cédula.
                    </span>
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={handleStartExam}
                    disabled={checkingStage}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {checkingStage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verificando estado...</span>
                      </>
                    ) : (
                      <>
                        <span>Comenzar Evaluación</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* CONFIRMATION MODAL (Point #6)                              */}
          {/* ─────────────────────────────────────────────────────────── */}
          {showConfirmModal && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
              <div className="bg-white text-slate-900 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
                <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6 text-teal-600" />
                </div>

                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    Confirma tus datos
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verifica que tus datos estén bien escritos para la emisión del certificado:
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Nombre Completo:
                    </span>
                    <strong className="text-slate-900 text-sm">
                      {nombreApellido.trim().toUpperCase()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Cédula de Identidad:
                    </span>
                    <strong className="text-teal-700 text-sm font-mono">
                      {fullCedula}
                    </strong>
                  </div>
                  {isPrePost && (
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Fase Asignada Automáticamente:
                      </span>
                      <strong className="text-teal-800 text-xs font-bold flex items-center gap-1.5 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                        {selectedStage === "pre"
                          ? "1. Pre-Evaluación (Diagnóstico Inicial)"
                          : "2. Post-Evaluación (Evaluación Final)"}
                      </strong>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 text-xs"
                  >
                    ✏️ Corregir
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirmIdentity}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
                  >
                    ✅ Correcto, iniciar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* PHASE 2: TAKING THE EVALUATION                             */}
          {/* ─────────────────────────────────────────────────────────── */}
          {phase === "TAKING_EXAM" && currentQ && (
            <div
              className={`rounded-2xl p-5 sm:p-7 shadow-xl border space-y-5 animate-in fade-in duration-150 ${
                isKiosk
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-white border-slate-200"
              }`}
            >
              {/* Progress Bar & Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-teal-600 uppercase tracking-wider">
                      Pregunta {currentQuestionIdx + 1} de {totalQuestions}
                    </span>
                    {isPrePost && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          selectedStage === "pre"
                            ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                            : "bg-teal-500/20 text-teal-300 border-teal-500/40"
                        }`}
                      >
                        {selectedStage === "pre" ? "Pre-Evaluación" : "Post-Evaluación"}
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400">
                    {answeredCount} de {totalQuestions} respondidas
                  </span>
                </div>

                {/* Progress track */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${((currentQuestionIdx + 1) / totalQuestions) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Question Statement */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                    Pregunta {currentQuestionIdx + 1}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-semibold leading-snug">
                  {currentQ.enunciado}
                </h3>
              </div>

              {/* Options (Point #3: Single choice with 3 standard options) */}
              <div className="space-y-2.5 pt-1">
                {currentQ.opciones.map((opt, optIdx) => {
                  const isSelected = answers[currentQ.id] === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectOption(currentQ.id, opt.id)}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? isKiosk
                            ? "bg-teal-950/40 border-teal-500 shadow-md"
                            : "bg-teal-50/70 border-teal-600 shadow-sm"
                          : isKiosk
                            ? "bg-slate-700/50 border-slate-700 hover:border-slate-600"
                            : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-bold text-xs mt-0.5 border ${
                          isSelected
                            ? "bg-teal-600 text-white border-teal-600"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </div>

                      <div className="text-xs sm:text-sm font-medium flex-1 pt-0.5 leading-snug">
                        {opt.texto}
                      </div>

                      {isSelected && (
                        <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      )}
                    </div>
                  );
                })}
              </div>

              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Navigation Bar */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentQuestionIdx((p) => Math.max(0, p - 1))}
                  disabled={currentQuestionIdx === 0}
                  className="text-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Anterior
                </Button>

                {currentQuestionIdx < totalQuestions - 1 ? (
                  <Button
                    type="button"
                    onClick={() =>
                      setCurrentQuestionIdx((p) => Math.min(totalQuestions - 1, p + 1))
                    }
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold"
                  >
                    Siguiente
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setShowSubmitConfirm(true)}
                    disabled={submitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Finalizar y Enviar
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Questions Pagination Strip */}
              <div className="flex items-center justify-center gap-1.5 pt-2 flex-wrap">
                {activeQuestions.map((q, idx) => {
                  const hasAnswer = Boolean(answers[q.id]);
                  const isCurrent = idx === currentQuestionIdx;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentQuestionIdx(idx)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                        isCurrent
                          ? "ring-2 ring-teal-500 bg-teal-600 text-white"
                          : hasAnswer
                            ? "bg-teal-100 text-teal-800"
                            : isKiosk
                              ? "bg-slate-700 text-slate-400"
                              : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Confirm Submit Dialog */}
          {showSubmitConfirm && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
              <div className="bg-white text-slate-900 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                  <Send className="w-5 h-5 text-emerald-600" />
                </div>

                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    ¿Enviar tu evaluación?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Has respondido <strong>{answeredCount}</strong> de{" "}
                    <strong>{totalQuestions}</strong> preguntas.
                  </p>
                  {answeredCount < totalQuestions && (
                    <p className="text-[11px] text-amber-700 font-semibold bg-amber-50 p-2 rounded-lg mt-2">
                      ⚠️ Tienes {totalQuestions - answeredCount} preguntas sin responder.
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSubmitConfirm(false)}
                    className="flex-1 text-xs"
                  >
                    Revisar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmitExam}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                  >
                    Sí, enviar ahora
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────── */}
          {/* PHASE 3: CONFIRMATION & REVIEW SCREEN (NO SCORES DISPLAYED) */}
          {/* ─────────────────────────────────────────────────────────── */}
          {phase === "RESULT" && (
            <div
              className={`rounded-2xl p-6 sm:p-8 shadow-2xl border text-center space-y-6 animate-in fade-in zoom-in-95 duration-200 ${
                isKiosk
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-white border-slate-200"
              }`}
            >
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-inner bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-black">
                    {alreadySubmitted
                      ? "Evaluación Registrada Previamente"
                      : isPrePost && selectedStage === "pre"
                      ? "¡Diagnóstico Pre-Capacitación Enviado!"
                      : "¡Evaluación Enviada con Éxito!"}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    {alreadySubmitted
                      ? "Tus respuestas para este curso ya fueron recibidas y se encuentran bajo revisión académica."
                      : isPrePost && selectedStage === "pre"
                      ? "Tus respuestas iniciales han sido registradas para el análisis comparativo del curso."
                      : "Tus respuestas han sido recibidas y guardadas exitosamente en el sistema de Capacitación SHA."}
                  </p>
                </div>
              </div>

              {/* Status Confirmation Card - Scores are kept confidential */}
              <div className="p-5 rounded-2xl border text-center space-y-2 bg-slate-50 dark:bg-slate-700/40 border-slate-200 dark:border-slate-700">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>RESPUESTAS GUARDADAS PARA REVISIÓN</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed pt-1">
                  La evaluación ha sido enviada para su procesamiento. Las calificaciones y certificados oficiales serán gestionados y comunicados a través de tu empresa y el facilitador del curso.
                </p>
              </div>

              {/* Student & Course Summary */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-xs space-y-2 text-left border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Participante:</span>
                  <strong className="text-slate-900 dark:text-white uppercase">{nombreApellido}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Cédula:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{fullCedula}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Curso:</span>
                  <span className="text-slate-800 dark:text-slate-200 truncate max-w-xs">{evaluacion.servicio}</span>
                </div>
                {isPrePost && (
                  <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-600">
                    <span className="text-slate-500 dark:text-slate-400">Fase:</span>
                    <span className="font-semibold text-teal-700 dark:text-teal-300">
                      {selectedStage === "pre"
                        ? "Pre-Evaluación (Diagnóstico Inicial)"
                        : "Post-Evaluación (Evaluación Final)"}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-600">
                  <span className="text-slate-500 dark:text-slate-400">Estado:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Enviado y registrado
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Tus datos y respuestas han sido sincronizados en tiempo real con el registro del facilitador. No es necesario realizar ningún trámite adicional.
              </div>

              {/* Kiosk Mode Reset Action */}
              {isKiosk && (
                <div className="pt-3 border-t border-slate-700 space-y-3">
                  <div className="text-xs text-amber-300 font-semibold flex items-center justify-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Reiniciando estación en {countdown} segundos...</span>
                  </div>
                  <Button
                    type="button"
                    onClick={handleResetKiosk}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 text-xs rounded-xl shadow"
                  >
                    Finalizar y preparar para el siguiente participante
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 px-4 text-center text-[11px] text-slate-400">
        SHA de Venezuela, C.A. • Sistema de Certificación y Capacitación
      </footer>
    </div>
  );
}

