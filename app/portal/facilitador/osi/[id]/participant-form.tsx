"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
  AlertTriangle,
  X,
  ShieldCheck,
  ClipboardCheck,
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  FileSpreadsheet,
  Users,
  Camera,
  CheckCheck,
  Sparkles,
  Award,
  BookOpen,
  GraduationCap,
  Building2,
  Check,
} from "lucide-react";
import { saveParticipants } from "@/app/actions/facilitador-portal";
import { enqueueOp } from "@/lib/offline/sync-queue";
import { AttachmentUploadSection } from "./attachment-upload-section";
import { SeniatVerificationPopover } from "@/app/dashboard/capacitacion/generacion-certificado/components/certificate-form/SeniatVerificationPopover";
import { ParticipantScannerModal } from "@/app/dashboard/capacitacion/generacion-certificado/components/certificate-form/ParticipantScannerModal";
import {
  ParticipantVerificationResult,
  ExtractedParticipant,
  CertificateParticipant,
  OSIAttachment,
} from "@/types";
import type { MaterialKitInfo } from "@/types/material-didactico";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import ISOComplianceBanner from "./ISOComplianceBanner";
import FacilitadorMaterialKit from "./FacilitadorMaterialKit";
import OSIWorkflowStepper, { WizardStepId, getWizardSteps } from "./OSIWorkflowStepper";
import Link from "next/link";

export interface Participant {
  nombre_apellido: string;
  cedula: string;
  score: string | number;
  nationality?: "venezolano" | "extranjero";
  seniatVerification?: ParticipantVerificationResult;
}

export interface ParticipantFormProps {
  osiId: number;
  facilitadorId: number;
  facilitadorNombre?: string;
  initialParticipants: Participant[];
  materialKit?: MaterialKitInfo | null;
  osi?: any;
  /** Specific session assigned to this facilitador, or null if they need to pick */
  assignedSession?: number | null;
  /** True if facilitador is assigned to all/multiple sessions and must choose per upload */
  needsSessionPicker?: boolean;
  /** Total number of sessions for this OSI */
  sessionCount?: number;
  /** List of specific session numbers the facilitador is assigned to (empty if all-sessions only) */
  assignedSessions?: number[];
  /** True if facilitador has an all-sessions (NULL nro_sesion) assignment */
  hasAllSessionsAssignment?: boolean;
  isFinal?: boolean;
  notaAprobatoria?: number | null;
}

const DISCLAIMER_TEXT =
  "Declaro bajo mi responsabilidad que he revisado exhaustivamente las calificaciones y datos de los participantes, y que la información aquí suministrada es veraz y ha sido contrastada con la lista de asistencia firmada.";

const OSI_TOUR_KEY = "facilitador-osi-tour";

const osiTourSteps = [
  {
    element: "#tour-stepper",
    popover: {
      title: "Flujo Guiado Paso a Paso",
      description: "Sigue los pasos para completar el registro del servicio. El material didáctico digital se muestra aquí cuando está disponible en plataforma (también puede ser enviado previamente por correo por Capacitación).",
    },
  },
  {
    element: "#tour-upload-section",
    popover: {
      title: "Paso: Cargar Lista de Asistencia",
      description: "Sube una foto o PDF de la lista de asistencia firmada por los participantes.",
    },
  },
  {
    element: "#tour-scan-button",
    popover: {
      title: "Escanear con OCR (IA)",
      description: "Extrae automáticamente los participantes mediante inteligencia artificial.",
    },
  },
  {
    element: "#tour-participant-list",
    popover: {
      title: "Registro y Calificaciones",
      description: "Revisa los nombres, verifica cédulas con el CNE e ingresa las notas (0 a 20).",
    },
  },
  {
    element: "#tour-submit-button",
    popover: {
      title: "Revisión y Envío",
      description: "Acepta la declaración de responsabilidad y finaliza el servicio.",
    },
  },
];

export const ParticipantForm = ({
  osiId,
  facilitadorId,
  facilitadorNombre = "Facilitador",
  initialParticipants,
  materialKit,
  osi,
  assignedSession = null,
  needsSessionPicker = false,
  sessionCount = 1,
  assignedSessions = [],
  hasAllSessionsAssignment = false,
  isFinal: initialIsFinal = false,
  notaAprobatoria = 14,
}: ParticipantFormProps) => {
  const passingGrade = typeof notaAprobatoria === "number" ? notaAprobatoria : 14;
  const isParticipationOnly = passingGrade === 0;

  const hasMaterial = Boolean(materialKit && materialKit.materiales && materialKit.materiales.length > 0);
  const steps = useMemo(() => getWizardSteps(hasMaterial), [hasMaterial]);

  // Wizard active step state
  const [activeStep, setActiveStep] = useState<WizardStepId>(
    hasMaterial ? "material" : "asistencia"
  );

  const [participants, setParticipants] = useState<Participant[]>(
    initialParticipants.length > 0
      ? initialParticipants.map((p) => ({
          nombre_apellido: p.nombre_apellido,
          cedula: p.cedula,
          score: p.score || "",
          nationality: p.nationality || "venezolano",
        }))
      : [{ nombre_apellido: "", cedula: "", score: "", nationality: "venezolano" }]
  );

  const [isFinal, setIsFinal] = useState(initialIsFinal);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);
  const [hojaCalificacionCount, setHojaCalificacionCount] = useState(0);

  const [activeVerificationIndex, setActiveVerificationIndex] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<number>(assignedSession ?? 1);
  const [showAttachmentWarning, setShowAttachmentWarning] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedPortalFile, setSelectedPortalFile] = useState<File | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanningAttachment, setIsScanningAttachment] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const disclaimerRef = useRef<HTMLDivElement>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingSync, setPendingSync] = useState(false);

  // Network offline listener
  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const goOnline = () => {
      setIsOffline(false);
      setPendingSync(false);
    };
    const goOffline = () => setIsOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Derived statistics
  const hasOnlyEmptyRow =
    participants.length === 1 && !participants[0].nombre_apellido && !participants[0].cedula;
  const validParticipants = participants.filter((p) => p.nombre_apellido.trim() && p.cedula.trim());
  const hasValidParticipants = validParticipants.length > 0;

  const validCedulasCount = participants.filter((p) => p.cedula.trim()).length;

  const isPassing = (scoreVal: string | number) => {
    if (scoreVal === "" || scoreVal === null || scoreVal === undefined) return false;
    const num = Number(scoreVal);
    if (isNaN(num) || num < 0 || num > 20) return false;
    return isParticipationOnly ? true : num >= passingGrade;
  };

  const isFailing = (scoreVal: string | number) => {
    if (scoreVal === "" || scoreVal === null || scoreVal === undefined) return false;
    const num = Number(scoreVal);
    if (isNaN(num) || num < 0 || num > 20) return false;
    return isParticipationOnly ? false : num < passingGrade;
  };

  const aprobadosCount = participants.filter((p) => isPassing(p.score)).length;
  const reprobadosCount = participants.filter((p) => isFailing(p.score)).length;
  const sinNotaCount = participants.filter((p) => p.score === "" || p.score === null).length;

  // Step completion status for indicators
  const completedSteps: Partial<Record<WizardStepId, boolean>> = {
    material: hasMaterial,
    asistencia: attendanceCount > 0,
    participantes: hasValidParticipants && sinNotaCount === 0,
    evidencias: photoCount > 0 || hojaCalificacionCount > 0,
    envio: isFinal,
  };

  const currentStepIndex = steps.findIndex((s) => s.id === activeStep);
  const nextStep = steps[currentStepIndex + 1]?.id;
  const prevStep = steps[currentStepIndex - 1]?.id;

  const goToStep = (stepId: WizardStepId) => {
    setActiveStep(stepId);
    window.scrollTo({ top: 120, behavior: "smooth" });
  };

  const addParticipant = () => {
    setParticipants([
      ...participants,
      { nombre_apellido: "", cedula: "", score: "", nationality: "venezolano" },
    ]);
    setSuccess(null);
  };

  const removeParticipant = (index: number) => {
    const newParticipants = [...participants];
    newParticipants.splice(index, 1);
    setParticipants(newParticipants);
    setSuccess(null);
  };

  const handleClearAll = () => {
    setParticipants([{ nombre_apellido: "", cedula: "", score: "", nationality: "venezolano" }]);
    setSuccess(null);
    setError(null);
    setUploadStatus(null);
    setShowClearConfirm(false);
  };

  const updateParticipant = (index: number, field: keyof Participant, value: string) => {
    const newParticipants = [...participants];
    newParticipants[index] = { ...newParticipants[index], [field]: value };
    setParticipants(newParticipants);
    setSuccess(null);
    setError(null);
  };

  const handleSave = async (status: "draft" | "final" = "draft") => {
    if (status === "final") {
      const emptyRows = participants.some((p) => !p.nombre_apellido || !p.cedula);
      if (emptyRows) {
        setError("Por favor completa el nombre y cédula de todos los participantes");
        goToStep("participantes");
        return;
      }

      if (!hasAcknowledged) {
        setError("Debes confirmar la declaración para finalizar el envío.");
        goToStep("envio");
        disclaimerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      if (attendanceCount === 0) {
        setShowAttachmentWarning(true);
        return;
      }
    }

    setShowAttachmentWarning(false);
    setSaving(true);
    setError(null);
    setSuccess(null);

    const participantsToSave =
      status === "draft"
        ? participants.filter((p) => p.nombre_apellido && p.cedula)
        : participants;

    const mappedParticipants = participantsToSave.map((p) => ({
      nombre_apellido: p.nombre_apellido,
      cedula: p.cedula,
      score: p.score === "" ? null : Number(p.score),
    }));

    if (!navigator.onLine) {
      try {
        await enqueueOp(
          "saveParticipants",
          `osi_${osiId}_participants`,
          {
            osiId,
            facilitadorId,
            participants: mappedParticipants,
            status,
            acknowledged: status === "final" ? hasAcknowledged : false,
            disclaimerText: status === "final" ? DISCLAIMER_TEXT : undefined,
          }
        );
        setPendingSync(true);
        if (status === "final") setIsFinal(true);
        setSuccess(
          status === "final"
            ? "Listado finalizado — pendiente de sincronización"
            : "Guardado — pendiente de sincronización"
        );
      } catch (err) {
        setError("Error al guardar offline: " + (err as Error).message);
      }
      setSaving(false);
      return;
    }

    const result = await saveParticipants(
      osiId,
      facilitadorId,
      mappedParticipants,
      status,
      status === "final" ? hasAcknowledged : false,
      status === "final" ? DISCLAIMER_TEXT : undefined
    );

    if (result.success) {
      if (status === "final") setIsFinal(true);
      setSuccess(
        status === "final"
          ? "¡Listado finalizado y enviado exitosamente a Capacitación!"
          : "Guardado correctamente"
      );
    } else {
      setError(result.error || "Error al guardar el listado");
    }
    setSaving(false);
  };

  const handleConfirmFinalizeAnyway = async () => {
    setShowAttachmentWarning(false);
    setSaving(true);
    setError(null);
    setSuccess(null);

    const mappedParticipants = participants.map((p) => ({
      nombre_apellido: p.nombre_apellido,
      cedula: p.cedula,
      score: p.score === "" ? null : Number(p.score),
    }));

    const result = await saveParticipants(
      osiId,
      facilitadorId,
      mappedParticipants,
      "final",
      hasAcknowledged,
      DISCLAIMER_TEXT
    );

    if (result.success) {
      setIsFinal(true);
      setSuccess("Listado finalizado y enviado exitosamente");
    } else {
      setError(result.error || "Error al guardar el listado");
    }
    setSaving(false);
  };

  const handleVerificationComplete = (
    index: number,
    result: ParticipantVerificationResult
  ) => {
    const newParticipants = [...participants];
    newParticipants[index] = { ...newParticipants[index], seniatVerification: result };
    setParticipants(newParticipants);
    setActiveVerificationIndex(null);
  };

  const handleFileReadyToScan = (file: File, attachment: OSIAttachment) => {
    setScanError(null);
    setUploadStatus(null);
    setSelectedPortalFile(file);
    setIsScannerOpen(true);
  };

  const handleSelectAttachment = async (attachment: OSIAttachment) => {
    setIsScanningAttachment(true);
    setScanError(null);
    try {
      if (!attachment.publicUrl) throw new Error("Public URL missing");
      const response = await fetch(attachment.publicUrl);
      if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`);
      const blob = await response.blob();
      const file = new File([blob], attachment.file_name, { type: attachment.file_type });

      setSelectedPortalFile(file);
      setIsScannerOpen(true);
    } catch (e) {
      console.error("[handleSelectAttachment] Error:", e);
      setScanError("Error al cargar el archivo para escanear. Intenta usar el botón 'Escanear' manualmente.");
    } finally {
      setIsScanningAttachment(false);
    }
  };

  const handleAddScannedParticipants = (scanned: CertificateParticipant[]) => {
    const mapped: Participant[] = scanned.map((p) => ({
      nombre_apellido: p.name,
      cedula: p.idNumber,
      score: p.score ?? "",
      nationality: p.nationality || "venezolano",
      seniatVerification: p.seniatVerification,
    }));

    if (hasOnlyEmptyRow) {
      setParticipants(mapped);
    } else {
      setParticipants([...participants, ...mapped]);
    }
    setSelectedPortalFile(null);
    setSuccess(null);
    setUploadStatus(mapped.length > 0 ? `✅ ${mapped.length} participante(s) extraídos correctamente con OCR` : null);
    goToStep("participantes");
  };

  return (
    <div className="space-y-6 pb-28 md:pb-8">
      {/* ─── 1. TOP INTERACTIVE STEPPER ─── */}
      <div id="tour-stepper">
        <OSIWorkflowStepper
          currentStepId={activeStep}
          onStepSelect={goToStep}
          hasMaterial={hasMaterial}
          isFinal={isFinal}
          completedSteps={completedSteps}
        />
      </div>

      {/* Global Alerts / Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Atención requerida</p>
            <p className="text-red-700 mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="shrink-0 text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-900 text-xs sm:text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Operación Exitosa</p>
            <p className="text-emerald-800 mt-0.5">{success}</p>
          </div>
          <button onClick={() => setSuccess(null)} className="shrink-0 text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── 2. ACTIVE STEP CONTAINER ─── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden transition-all">
        {/* STEP 1: MATERIAL DIDACTICO (IF APPLICABLE) */}
        {activeStep === "material" && materialKit && (
          <div className="p-4 sm:p-6 space-y-6">
            <FacilitadorMaterialKit
              kit={materialKit}
              facilitadorId={facilitadorId}
              facilitadorNombre={facilitadorNombre}
              onContinue={() => goToStep("asistencia")}
            />
          </div>
        )}

        {/* STEP 2: LISTA DE ASISTENCIA & OCR */}
        {activeStep === "asistencia" && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Step Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold">
                    {hasMaterial ? "2" : "1"}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Cargar Lista de Asistencia Firmada
                  </h2>
                  <span className="text-[10px] font-bold uppercase text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                    Requerido
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600">
                  Sube fotos legibles o el PDF de la lista física firmada por los participantes.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsScannerOpen(true)}
                className="h-10 text-sky-700 bg-sky-50 border-sky-200 hover:bg-sky-100 font-bold self-start sm:self-auto cursor-pointer"
                id="tour-scan-button"
              >
                <Sparkles className="w-4 h-4 mr-1.5 text-sky-600" />
                <span>Escanear con OCR (IA)</span>
              </Button>
            </div>

            {/* Session picker (if multi-session) */}
            {sessionCount > 1 && (
              <div className="p-4 bg-sky-50/70 border border-sky-200/80 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-sky-950 uppercase tracking-wide">
                  Selección de Sesión
                </label>
                <p className="text-xs text-sky-800">
                  {assignedSession !== null
                    ? `Estás asignado a la Sesión ${assignedSession}. Los documentos se cargarán para esa sesión.`
                    : "Selecciona para qué sesión estás subiendo los documentos:"}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(() => {
                    const selectableSessions =
                      assignedSession !== null
                        ? [assignedSession]
                        : hasAllSessionsAssignment && assignedSessions.length === 0
                        ? Array.from({ length: sessionCount }, (_, i) => i + 1)
                        : [...assignedSessions].sort((a, b) => a - b);
                    const isReadOnly = assignedSession !== null;

                    return selectableSessions.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => !isReadOnly && setSelectedSession(n)}
                        disabled={isReadOnly}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          selectedSession === n
                            ? "bg-sky-600 text-white shadow-xs"
                            : isReadOnly
                            ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                            : "bg-white text-sky-800 border border-sky-200 hover:bg-sky-100"
                        }`}
                      >
                        Sesión {n}
                      </button>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Upload Area */}
            <div id="tour-upload-section">
              <AttachmentUploadSection
                osiId={osiId}
                facilitadorId={facilitadorId}
                category="lista_asistencia"
                nroSesion={selectedSession}
                title="Lista de Asistencia Física"
                description="Formatos JPG, PNG o PDF. Las imágenes se optimizan y comprimen automáticamente."
                badge="Requerido"
                badgeColor="red"
                onAttachmentCountChange={setAttendanceCount}
                onScanAttachment={handleSelectAttachment}
                onFileReadyToScan={handleFileReadyToScan}
                onStatusChange={setUploadStatus}
                showScanButton
                tourId="tour-upload-button"
              />
            </div>

            {uploadStatus && (
              <div
                className={`flex items-center gap-2 text-xs px-3.5 py-2.5 rounded-xl border ${
                  uploadStatus.startsWith("✅")
                    ? "text-emerald-800 bg-emerald-50 border-emerald-200"
                    : uploadStatus.startsWith("❌") || uploadStatus.toLowerCase().includes("error")
                    ? "text-red-800 bg-red-50 border-red-200"
                    : "text-sky-800 bg-sky-50 border-sky-200"
                }`}
              >
                {uploadStatus.startsWith("✅") ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : uploadStatus.startsWith("❌") || uploadStatus.toLowerCase().includes("error") ? (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0 text-sky-600" />
                )}
                <span className="flex-1 font-medium">{uploadStatus}</span>
                <button onClick={() => setUploadStatus(null)} className="shrink-0 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Bottom step navigation callout */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                {attendanceCount > 0 ? (
                  <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> {attendanceCount} lista(s) física(s) cargada(s).
                  </span>
                ) : (
                  <span className="text-slate-500">
                    💡 Sube la lista física para habilitar el escaneo automático.
                  </span>
                )}
              </div>

              <Button
                type="button"
                onClick={() => goToStep("participantes")}
                className="w-full sm:w-auto h-11 px-6 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs cursor-pointer"
              >
                <span>Continuar a Participantes</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: PARTICIPANTES Y CALIFICACIONES */}
        {activeStep === "participantes" && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Step Header & Live Metrics Strip */}
            <div className="space-y-4 pb-4 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold">
                      {hasMaterial ? "3" : "2"}
                    </span>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      Registro de Participantes y Notas
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Ingresa los datos de los asistentes, valida su cédula con el CNE y califica (0 a 20).
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsScannerOpen(true)}
                    className="h-10 text-sky-700 bg-sky-50 border-sky-200 hover:bg-sky-100 font-bold cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 mr-1.5 text-sky-600" />
                    <span>Escanear OCR</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={addParticipant}
                    className="h-10 bg-sky-600 hover:bg-sky-700 text-white font-bold cursor-pointer"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    <span>Agregar Fila</span>
                  </Button>
                </div>
              </div>

              {/* Real-time KPI Metric Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Total Registrados
                  </span>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">{participants.length}</p>
                </div>
                <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                    {isParticipationOnly ? "Asistieron" : `Aprobados (≥${passingGrade})`}
                  </span>
                  <p className="text-lg font-bold text-emerald-800 mt-0.5">{aprobadosCount}</p>
                </div>
                {!isParticipationOnly && reprobadosCount > 0 ? (
                  <div className="p-3 bg-red-50/70 rounded-xl border border-red-200 text-left">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 block">
                      Reprobados (&lt;{passingGrade})
                    </span>
                    <p className="text-lg font-bold text-red-800 mt-0.5">{reprobadosCount}</p>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-left">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                      Sin Nota Asignada
                    </span>
                    <p className="text-lg font-bold text-amber-800 mt-0.5">{sinNotaCount}</p>
                  </div>
                )}
                <div className="p-3 bg-sky-50/70 rounded-xl border border-sky-200 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 block">
                    Cédulas Válidas
                  </span>
                  <p className="text-lg font-bold text-sky-800 mt-0.5">{validCedulasCount}</p>
                </div>
              </div>
            </div>

            {/* Clear All Confirmation Box */}
            {showClearConfirm && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-900 text-xs sm:text-sm animate-in fade-in duration-150">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">¿Deseas vaciar la lista de participantes?</p>
                  <p className="text-red-700 text-xs mt-0.5">
                    Se borrarán todos los registros de la tabla actual. Esta acción no se puede deshacer.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={handleClearAll}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                    >
                      Sí, vaciar lista
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowClearConfirm(false)}
                      className="text-xs"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Participant Cards / Rows */}
            <div className="space-y-3" id="tour-participant-list">
              {participants.map((p, index) => {
                const isGradeValid = p.score !== "" && Number(p.score) >= 0 && Number(p.score) <= 20;
                const isAprobado = isGradeValid && (isParticipationOnly ? true : Number(p.score) >= passingGrade);

                return (
                  <div
                    key={index}
                    className="p-3.5 sm:p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 hover:border-sky-300 hover:bg-white transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs">
                        #{index + 1}
                      </span>

                      {/* Score status pill */}
                      {p.score !== "" && (
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                            isAprobado
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-red-50 text-red-800 border-red-200"
                          }`}
                        >
                          {isParticipationOnly
                            ? `Nota: ${p.score}/20 (Participación)`
                            : isAprobado
                            ? `Aprobado (${p.score}/20)`
                            : `Reprobado (${p.score}/20 - Mín. ${passingGrade})`}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                      {/* Name input */}
                      <div className="sm:col-span-5 space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400">
                          Nombre y Apellido
                        </label>
                        <Input
                          value={p.nombre_apellido}
                          onChange={(e) => updateParticipant(index, "nombre_apellido", e.target.value)}
                          placeholder="Ej: Carlos Eduardo Pérez"
                          className="bg-white border-slate-200 text-sm font-medium"
                        />
                        {/* SENIAT verification status */}
                        {p.seniatVerification && (
                          <div className="mt-1">
                            {p.seniatVerification.status === "verified" ? (
                              <span className="inline-flex items-center text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                                <span className="truncate max-w-[220px]" title={p.seniatVerification.seniatName}>
                                  {p.seniatVerification.seniatName}
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                <AlertCircle className="h-3 w-3 mr-1" /> No verificado en CNE
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Nationality & Cedula input */}
                      <div className="sm:col-span-4 space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400">
                          Cédula de Identidad
                        </label>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={p.nationality || "venezolano"}
                            onChange={(e) => updateParticipant(index, "nationality", e.target.value)}
                            className="w-16 h-10 px-2 border border-slate-200 rounded-lg bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                          >
                            <option value="venezolano">V-</option>
                            <option value="extranjero">E-</option>
                          </select>
                          <Input
                            value={p.cedula}
                            onChange={(e) => updateParticipant(index, "cedula", e.target.value)}
                            placeholder="12345678"
                            className="bg-white border-slate-200 font-mono text-sm flex-1"
                          />
                        </div>
                      </div>

                      {/* Score input */}
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400">
                          Nota (0-20){!isParticipationOnly ? ` • Mín ${passingGrade}` : ""}
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          value={p.score}
                          onChange={(e) => updateParticipant(index, "score", e.target.value)}
                          placeholder="0-20"
                          className={`bg-white text-center font-bold text-sm ${
                            isAprobado ? "text-emerald-700 border-emerald-300" : ""
                          }`}
                        />
                      </div>

                      {/* Verification and Delete Actions */}
                      <div className="sm:col-span-1 flex items-center justify-end gap-1 pt-6">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setActiveVerificationIndex(index)}
                            disabled={activeVerificationIndex !== null}
                            className="p-2 rounded-lg text-sky-700 hover:bg-sky-100 transition-colors border border-sky-200 bg-white"
                            title="Verificar en CNE"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                          {activeVerificationIndex === index && (
                            <SeniatVerificationPopover
                              participant={
                                {
                                  name: p.nombre_apellido,
                                  idNumber: p.cedula,
                                  nationality: p.nationality,
                                } as ExtractedParticipant
                              }
                              onVerify={(result) => handleVerificationComplete(index, result)}
                              onClose={() => setActiveVerificationIndex(null)}
                              useFixedPosition
                            />
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeParticipant(index)}
                          disabled={participants.length === 1}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Eliminar fila"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions and Navigation */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addParticipant}
                  className="h-10 text-sky-700 bg-sky-50 border-sky-200 hover:bg-sky-100 font-bold cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  <span>Agregar Otro Participante</span>
                </Button>
                {participants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1"
                  >
                    Limpiar Todo
                  </button>
                )}
              </div>

              <Button
                type="button"
                onClick={() => goToStep("evidencias")}
                className="w-full sm:w-auto h-11 px-6 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs cursor-pointer"
              >
                <span>Continuar a Fotos y Evidencias</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: FOTOS Y EVIDENCIAS (OPCIONAL) */}
        {activeStep === "evidencias" && (
          <div className="p-4 sm:p-6 space-y-6">
            <div className="pb-4 border-b border-slate-100 space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold">
                  {hasMaterial ? "4" : "3"}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Registro Fotográfico y Documentos Adicionales
                </h2>
                <span className="text-[10px] font-bold uppercase text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  Opcional
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600">
                Sube fotos de la capacitación y hojas de calificación para auditorías de calidad y soporte ISO 14001.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <AttachmentUploadSection
                osiId={osiId}
                facilitadorId={facilitadorId}
                category="material_fotografico"
                nroSesion={selectedSession}
                title="Registro Fotográfico de la Actividad"
                description="Fotos de la sesión, facilitador y participantes (se comprimen automáticamente para ahorrar datos)."
                badge="Opcional"
                badgeColor="blue"
                accept="image/*"
                imageOnly
                onAttachmentCountChange={setPhotoCount}
              />

              <AttachmentUploadSection
                osiId={osiId}
                facilitadorId={facilitadorId}
                category="hoja_calificacion"
                nroSesion={selectedSession}
                title="Hoja de Calificación Adicional"
                description="Sube fotos o PDFs de las evaluaciones o exámenes físicos firmados."
                badge="Opcional"
                badgeColor="blue"
                onAttachmentCountChange={setHojaCalificacionCount}
              />
            </div>

            {/* Bottom step navigation callout */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                {photoCount > 0 ? (
                  <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> {photoCount} foto(s) registrada(s).
                  </span>
                ) : (
                  <span className="text-slate-500">
                    Este paso es opcional. Puedes continuar directamente a la revisión final.
                  </span>
                )}
              </div>

              <Button
                type="button"
                onClick={() => goToStep("envio")}
                className="w-full sm:w-auto h-11 px-6 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs cursor-pointer"
              >
                <span>Revisión y Envío Final</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: RESUMEN, DECLARACION Y ENVIO FINAL */}
        {activeStep === "envio" && (
          <div className="p-4 sm:p-6 space-y-6">
            <div className="pb-4 border-b border-slate-100 space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold">
                  {hasMaterial ? "5" : "4"}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Resumen Ejecutivo y Declaración de Envío
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-600">
                Revisa los datos consolidados antes de enviar la información al departamento de Capacitación.
              </p>
            </div>

            {/* Executive Summary Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 via-white to-sky-50/30 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Servicio a Finalizar
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{osi?.nombre_empresa || "Empresa"}</h3>
                  <p className="text-xs text-slate-600">{osi?.servicio || "Curso de Capacitación"}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                    OSI #{osi?.nro_osi}
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Participantes</span>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">
                    {validParticipants.length}{" "}
                    <span className="text-xs font-normal text-slate-500">
                      ({aprobadosCount} aprobados)
                    </span>
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Lista de Asistencia</span>
                  <p className="text-sm font-bold mt-0.5 flex items-center gap-1.5">
                    {attendanceCount > 0 ? (
                      <span className="text-emerald-700 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {attendanceCount} archivo(s)
                      </span>
                    ) : (
                      <span className="text-amber-700 inline-flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4 text-amber-600" /> Sin lista física
                      </span>
                    )}
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Fotos y Soporte</span>
                  <p className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-slate-500" />
                    {photoCount} fotos adjuntas
                  </p>
                </div>
              </div>
            </div>

            {/* Disclaimer / Responsibility Card */}
            <div
              ref={disclaimerRef}
              className={`rounded-2xl border-2 transition-all p-5 ${
                hasAcknowledged
                  ? "border-emerald-300 bg-emerald-50/50"
                  : "border-amber-200 bg-amber-50/40"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border ${
                    hasAcknowledged
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : "bg-amber-100 text-amber-700 border-amber-200"
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">
                      Declaración de Responsabilidad y Veracidad
                    </h4>
                    <ClipboardCheck className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {DISCLAIMER_TEXT}
                  </p>
                  <label
                    className={`flex items-center gap-3 pt-2 group ${
                      hasValidParticipants ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={hasAcknowledged}
                      disabled={!hasValidParticipants}
                      onChange={(e) => {
                        setHasAcknowledged(e.target.checked);
                        setError(null);
                      }}
                      className="w-5 h-5 rounded border-2 border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-500 cursor-pointer shrink-0 transition-colors"
                    />
                    <span
                      className={`text-xs sm:text-sm font-bold select-none ${
                        hasAcknowledged ? "text-emerald-800" : "text-slate-700"
                      }`}
                    >
                      He revisado exhaustivamente y acepto la declaración de responsabilidad
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* ISO 14001 Banner */}
            <ISOComplianceBanner />

            {/* Attachment Warning Modal/Alert */}
            {showAttachmentWarning && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900 text-xs sm:text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <p className="font-bold">No has adjuntado foto de la lista de asistencia</p>
                  <p className="text-amber-800 text-xs leading-relaxed">
                    Se recomienda adjuntar la foto o escaneo de la lista firmada por los participantes antes de enviar el servicio. ¿Deseas enviar la información de todos modos?
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={handleConfirmFinalizeAnyway}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                    >
                      Sí, finalizar sin foto
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAttachmentWarning(false)}
                      className="text-xs"
                    >
                      Volver a cargar foto
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Submission Actions */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                {!hasValidParticipants ? (
                  <p className="text-xs text-amber-600 font-medium">
                    ⚠️ Debes registrar al menos 1 participante con nombre y cédula en el Paso 3.
                  </p>
                ) : !hasAcknowledged ? (
                  <p className="text-xs text-amber-600 font-medium">
                    ⚠️ Marca la casilla de declaración para habilitar el envío final.
                  </p>
                ) : (
                  <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Todo listo para enviar.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleSave("draft")}
                  disabled={saving}
                  className="h-12 px-5 text-slate-700 font-bold cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  <span>Guardar</span>
                </Button>

                <Button
                  id="tour-submit-button"
                  onClick={() => handleSave("final")}
                  disabled={saving || !hasAcknowledged || !hasValidParticipants}
                  className={`h-12 px-6 font-bold rounded-xl shadow-xs transition-all cursor-pointer ${
                    hasAcknowledged && hasValidParticipants
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200"
                  }`}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCheck className="w-4 h-4 mr-2" />
                  )}
                  <span>Finalizar y Enviar a Capacitación</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── 3. PERSISTENT WIZARD BOTTOM BAR (MOBILE & DESKTOP) ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-4 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Step Back Button */}
          <Button
            type="button"
            variant="ghost"
            onClick={() => prevStep && goToStep(prevStep)}
            disabled={!prevStep}
            className="h-11 px-3 sm:px-4 text-slate-600 hover:text-slate-900 font-bold text-xs sm:text-sm disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Paso Anterior</span>
            <span className="sm:hidden">Atrás</span>
          </Button>

          {/* Center Info / Offline / Save Status */}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium truncate">
            {isOffline ? (
              <span className="text-amber-700 font-bold inline-flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Modo Offline
              </span>
            ) : pendingSync ? (
              <span className="text-sky-700 font-bold inline-flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sincronizando...
              </span>
            ) : (
              <span className="hidden md:inline text-slate-400">
                Paso {currentStepIndex + 1} de {steps.length}: <strong className="text-slate-700">{steps[currentStepIndex]?.title}</strong>
              </span>
            )}
          </div>

          {/* Right Actions: Draft Save & Next Step */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSave("draft")}
              disabled={saving}
              className="h-11 px-3 sm:px-4 text-slate-700 border-slate-300 font-bold text-xs sm:text-sm cursor-pointer shadow-2xs"
            >
              {saving ? <Loader2 className="w-4 h-4 sm:mr-1.5 animate-spin" /> : <Save className="w-4 h-4 sm:mr-1.5" />}
              <span className="hidden sm:inline">Guardar</span>
            </Button>

            {nextStep ? (
              <Button
                type="button"
                onClick={() => goToStep(nextStep)}
                className="h-11 px-4 sm:px-6 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs cursor-pointer"
              >
                <span>Siguiente</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => handleSave("final")}
                disabled={saving || !hasAcknowledged || !hasValidParticipants}
                className={`h-11 px-4 sm:px-6 font-bold rounded-xl text-xs sm:text-sm shadow-xs cursor-pointer ${
                  hasAcknowledged && hasValidParticipants
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                <span>Finalizar</span>
                <CheckCheck className="w-4 h-4 ml-1.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* OCR Scanner Modal */}
      <ParticipantScannerModal
        isOpen={isScannerOpen}
        onClose={() => {
          setIsScannerOpen(false);
          setUploadStatus(null);
        }}
        onAddParticipants={handleAddScannedParticipants}
        preselectedFile={selectedPortalFile}
        mode="portal"
      />
    </div>
  );
};
