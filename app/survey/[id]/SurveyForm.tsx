"use client";

import React, { useState, useEffect } from "react";
import { SurveyOSIData, SurveyFormData } from "@/types";
import { submitSurvey } from "@/app/actions/surveys";
import { enqueueOp } from "@/lib/offline/sync-queue";
import { initSyncQueue } from "@/lib/offline/sync-queue";
import { Check, Loader2, Send } from "lucide-react";
import Image from "next/image";

interface SurveyFormProps {
  osiData: SurveyOSIData;
}

const QUESTIONS = [
  { id: 1, text: "¿Fue responsable y puntual?", section: "FACILITADOR" },
  { id: 2, text: "¿Proyectó una imagen adecuada?", section: "FACILITADOR" },
  { id: 3, text: "¿Domina el tema?", section: "FACILITADOR" },
  { id: 4, text: "¿El lenguaje utilizado fue fácil de entender?", section: "FACILITADOR" },
  { id: 5, text: "¿Estimula la participación e intercambio de ideas?", section: "FACILITADOR" },
  { id: 6, text: "¿El material didáctico utilizado fue fácil de entender?", section: "ASPECTOS DE LA CAPACITACIÓN" },
  { id: 7, text: "¿Las dinámicas, ejercicios, demostraciones y demás actividades hechas en el curso, fueron comprensibles y útiles?", section: "ASPECTOS DE LA CAPACITACIÓN" },
  { id: 8, text: "¿El contenido del curso cumplió sus expectativas?", section: "ASPECTOS DE LA CAPACITACIÓN" },
  { id: 9, text: "¿Cómo calificarías el curso?", section: "ASPECTOS DE LA CAPACITACIÓN" },
  { id: 10, text: "¿Las condiciones ambientales (aula, mobiliario, recursos didácticos si aplica) han sido adecuados?", section: "ENTORNO" },
];

const ATTENDANCE_OPTIONS = [
  { id: "company_requirement", label: "Requerimiento de la empresa" },
  { id: "job_growth", label: "Crecimiento laboral" },
  { id: "personal_development", label: "Desarrollo personal" },
];

const SCALE = [
  { value: 1, label: "MALO" },
  { value: 2, label: "POCO ACEPTABLE" },
  { value: 3, label: "BUENO" },
  { value: 4, label: "MUY BUENO" },
  { value: 5, label: "EXCELENTE" },
];

export default function SurveyForm({ osiData }: SurveyFormProps) {
  const [formData, setFormData] = useState<SurveyFormData>({
    q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, q8: 0, q9: 0, q10: 0,
    attendance_reasons: {
      company_requirement: false,
      job_growth: false,
      personal_development: false,
    },
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    
    // For YYYY-MM-DD strings (common in DB), splitting is safer to avoid TZ shifts
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "N/A";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleRatingChange = (qId: number, value: number) => {
    setFormData((prev) => ({ ...prev, [`q${qId}`]: value }));
  };

  const handleCheckboxChange = (id: keyof typeof formData.attendance_reasons) => {
    setFormData((prev) => ({
      ...prev,
      attendance_reasons: {
        ...prev.attendance_reasons,
        [id]: !prev.attendance_reasons[id],
      },
    }));
  };

  const isFormValid = () => {
    // Check if all questions are answered
    for (let i = 1; i <= 10; i++) {
      if (formData[`q${i}` as keyof SurveyFormData] === 0) return false;
    }
    // Check if at least one attendance reason is selected
    const { company_requirement, job_growth, personal_development } = formData.attendance_reasons;
    if (!company_requirement && !job_growth && !personal_development) return false;
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) {
      setError("Por favor, responda todas las preguntas y seleccione al menos un motivo de asistencia.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const reasons = Object.entries(formData.attendance_reasons)
      .filter(([, value]) => value)
      .map(([key]) => {
        if (key === "company_requirement") return "Requerimiento de la empresa";
        if (key === "job_growth") return "Crecimiento laboral";
        if (key === "personal_development") return "Desarrollo personal";
        return "";
      });

    const surveyData = {
      id_osi: osiData.id_osi,
      nro_sesion: osiData.nro_sesion ?? 1,
      q1: formData.q1,
      q2: formData.q2,
      q3: formData.q3,
      q4: formData.q4,
      q5: formData.q5,
      q6: formData.q6,
      q7: formData.q7,
      q8: formData.q8,
      q9: formData.q9,
      q10: formData.q10,
      attendance_reasons: reasons,
    };

    // Offline path: enqueue for later sync
    if (!navigator.onLine) {
      try {
        await enqueueOp(
          "submitSurvey",
          `survey_${osiData.id_osi}_s${osiData.nro_sesion ?? 1}_${Date.now()}`,
          surveyData
        );
        setSubmitted(true);
      } catch (err) {
        setError("Error al guardar la encuesta offline: " + (err as Error).message);
      }
      setSubmitting(false);
      return;
    }

    // Online path: use server action
    const result = await submitSurvey(surveyData);

    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error || "Ocurrió un error al enviar la encuesta. Inténtelo de nuevo.");
    }
    setSubmitting(false);
  };

  // Initialize sync queue on mount so surveys can auto-sync
  useEffect(() => {
    const cleanup = initSyncQueue();
    return cleanup;
  }, []);

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-xl shadow-lg text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-green-100 p-4 rounded-full">
            <Check className="w-12 h-12 text-green-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">¡Muchas gracias!</h1>
        <p className="text-gray-600 mb-8">
          Su opinión es muy valiosa para nosotros y nos ayuda a mejorar continuamente nuestros servicios.
        </p>
        <div className="border-t pt-8">
          <Image src="/logo.png" alt="SHA Logo" width={120} height={40} className="mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto my-6 p-4 md:p-8 bg-gray-50 rounded-xl shadow-sm border">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 pb-6 border-b">
        <Image src="/logo.png" alt="SHA Logo" width={150} height={50} priority />
        <div className="text-center md:text-right">
          <h1 className="text-xl font-bold text-gray-800">ENCUESTA DE SATISFACCIÓN</h1>
          {/* <p className="text-sm text-gray-500 uppercase tracking-wider">Código: SHA-RG-CAP-003</p> */}
        </div>
      </div>

      {/* OSI Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 bg-white p-4 rounded-lg border shadow-sm">
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-tight">Empresa</label>
          <p className="font-medium text-gray-700">{osiData.nombre_empresa}</p>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-tight">Curso</label>
          <p className="font-medium text-gray-700">{osiData.servicio}</p>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-tight">Facilitador</label>
          <p className="font-medium text-gray-700">{osiData.facilitador_nombre || "No asignado"}</p>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-tight">Fecha</label>
          <p className="font-medium text-gray-700">
            {mounted && osiData.fecha_inicio_real ? formatDate(osiData.fecha_inicio_real) : "..."}
          </p>
        </div>
        {osiData.nro_sesion && osiData.nro_sesion > 1 && (
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-tight">Sesión</label>
            <p className="font-medium text-gray-700">Sesión {osiData.nro_sesion}</p>
          </div>
        )}
      </div>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
        <p className="font-bold mb-1">Escala de evaluación:</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {SCALE.map((s) => (
            <span key={s.value}><strong>{s.value}</strong> = {s.label}</span>
          ))}
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-8">
        {["FACILITADOR", "ASPECTOS DE LA CAPACITACIÓN", "ENTORNO"].map((section) => (
          <div key={section} className="space-y-4">
            <h3 className="text-sm font-black text-blue-900 border-b-2 border-blue-200 pb-1">{section}</h3>
            {QUESTIONS.filter((q) => q.section === section).map((q) => (
              <div key={q.id} className="bg-white p-4 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors">
                <p className="text-gray-800 mb-4 font-medium">{q.id}. {q.text}</p>
                <div className="flex justify-between items-center max-w-sm mx-auto">
                  {SCALE.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => handleRatingChange(q.id, s.value)}
                      className={`
                        w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all
                        ${formData[`q${q.id}` as keyof SurveyFormData] === s.value
                          ? "!bg-blue-600 !border-blue-600 !text-white scale-110 shadow-md"
                          : "!bg-transparent border-gray-200 !text-gray-400 hover:border-blue-300 hover:!text-blue-500"
                        }
                      `}
                    >
                      {s.value}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Attendance Reason */}
        <div className="space-y-4 pt-4">
          <h3 className="text-sm font-black text-blue-900 border-b-2 border-blue-200 pb-1 uppercase">
            ¿Por qué asististe al curso? <span className="text-xs font-normal normal-case text-gray-500">(Marque con una X)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ATTENDANCE_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className={`
                  flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all
                  ${formData.attendance_reasons[opt.id as keyof typeof formData.attendance_reasons]
                    ? "bg-blue-50 border-blue-200 ring-2 ring-blue-100"
                    : "bg-transparent border-gray-200 hover:border-gray-300"
                  }
                `}
              >
                <div className={`
                  w-6 h-6 border-2 rounded flex items-center justify-center transition-colors
                  ${formData.attendance_reasons[opt.id as keyof typeof formData.attendance_reasons]
                    ? "bg-blue-600 border-blue-600"
                    : "bg-transparent border-gray-300"
                  }
                `}>
                  {formData.attendance_reasons[opt.id as keyof typeof formData.attendance_reasons] && (
                    <span className="text-white font-black">X</span>
                  )}
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={formData.attendance_reasons[opt.id as keyof typeof formData.attendance_reasons]}
                  onChange={() => handleCheckboxChange(opt.id as keyof typeof formData.attendance_reasons)}
                />
                <span className="text-sm text-gray-700 font-medium">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 animate-pulse">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <div className="mt-12 flex justify-center">
        <button
          type="submit"
          disabled={submitting || !isFormValid()}
          className={`
            flex items-center gap-2 px-10 py-4 rounded-full font-bold text-lg transition-all
            ${submitting || !isFormValid()
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl active:scale-95"
            }
          `}
        >
          {submitting ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="w-6 h-6" />
              Enviar Encuesta
            </>
          )}
        </button>
      </div>

      <div className="mt-12 pt-8 border-t flex flex-col items-center">
        <Image src="/docs_footer.png" alt="Footer Icons" width={700} height={26} className="w-full h-auto mb-4" />
        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">SHA DE VENEZUELA, C.A.</p>
      </div>
    </form>
  );
}
