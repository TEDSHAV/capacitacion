"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { flushSync } from "react-dom";
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
  Camera,
  CheckCheck,
  Sparkles,
  Layers,
  Calendar,
} from "lucide-react";
import { saveParticipants, getOSIAttachments } from "@/app/actions/facilitador-portal";
import { enqueueOp } from "@/lib/offline/sync-queue";
import { toTitleCase } from "@/utils/string-utils";
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
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import ISOComplianceBanner from "./ISOComplianceBanner";
import FacilitadorMaterialKit from "./FacilitadorMaterialKit";
import OSIWorkflowStepper, { WizardStepId, getWizardSteps } from "./OSIWorkflowStepper";

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
  osi?: Record<string, unknown>;
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
  sessionsInfo?: Array<{
    nro_sesion: number;
    fecha: string | null;
    hora_inicio?: string | null;
    hora_fin?: string | null;
  }>;
}

function formatSessionDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  }
  try {
    return new Date(dateStr).toLocaleDateString("es-VE");
  } catch {
    return dateStr;
  }
}

const DISCLAIMER_TEXT =
  "Declaro bajo mi responsabilidad que he revisado exhaustivamente las calificaciones y datos de los participantes, y que la información aquí suministrada es veraz y ha sido contrastada con la lista de asistencia firmada.";

const OSI_TOUR_KEY = "facilitador-osi-tour-v4";

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
  sessionsInfo = [],
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
        nombre_apellido: toTitleCase(p.nombre_apellido),
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
  const [gradeSheetCount, setGradeSheetCount] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);
  const [allAttachments, setAllAttachments] = useState<OSIAttachment[]>([]);

  const defaultInitialSession =
    assignedSession ??
    (assignedSessions.length > 0 && !hasAllSessionsAssignment ? assignedSessions[0] : 1);
  const [selectedSession, setSelectedSession] = useState<number>(defaultInitialSession);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedPortalFile, setSelectedPortalFile] = useState<File | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanningAttachment, setIsScanningAttachment] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(initialIsFinal);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [activeVerificationIndex, setActiveVerificationIndex] = useState<number | null>(null);
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

  // Helper to refresh attachment counts for the OSI so completedSteps & summary cards are accurate
  const refreshAttachmentCounts = useCallback(async () => {
    try {
      const [asistenciaRes, califRes, photoRes, allRes] = await Promise.all([
        getOSIAttachments(osiId, facilitadorId, "lista_asistencia"),
        getOSIAttachments(osiId, facilitadorId, "hoja_calificacion"),
        getOSIAttachments(osiId, facilitadorId, "material_fotografico"),
        getOSIAttachments(osiId, facilitadorId),
      ]);
      if (asistenciaRes.data) setAttendanceCount(asistenciaRes.data.length);
      if (califRes.data) setGradeSheetCount(califRes.data.length);
      if (photoRes.data) setPhotoCount(photoRes.data.length);
      if (allRes.data) setAllAttachments(allRes.data as OSIAttachment[]);
    } catch (err) {
      console.error("[ParticipantForm] Error fetching attachment counts:", err);
    }
  }, [osiId, facilitadorId]);

  useEffect(() => {
    refreshAttachmentCounts();
  }, [refreshAttachmentCounts]);

  // When facilitator navigates to "envio", re-fetch all counts to ensure fresh validation
  useEffect(() => {
    if (activeStep === "envio") {
      refreshAttachmentCounts();
    }
  }, [activeStep, refreshAttachmentCounts]);

  const selectableSessionsList = useMemo(() => {
    if (assignedSession !== null) {
      return [assignedSession];
    }
    if (hasAllSessionsAssignment && assignedSessions.length === 0) {
      return Array.from({ length: sessionCount }, (_, i) => i + 1);
    }
    if (assignedSessions.length > 0) {
      return [...assignedSessions].sort((a, b) => a - b);
    }
    return Array.from({ length: sessionCount }, (_, i) => i + 1);
  }, [assignedSession, hasAllSessionsAssignment, assignedSessions, sessionCount]);

  const availableSessionsWithDates = useMemo(() => {
    return selectableSessionsList.map((n) => {
      const match = sessionsInfo?.find((s) => s.nro_sesion === n);
      return {
        nro_sesion: n,
        fecha: match?.fecha || null,
      };
    });
  }, [selectableSessionsList, sessionsInfo]);

  const getSessionStats = useCallback(
    (n: number) => {
      const forSes = allAttachments.filter((a) => a.nro_sesion === n || a.nro_sesion == null);
      const asist = forSes.filter((a) => a.category === "lista_asistencia").length;
      const calif = forSes.filter((a) => a.category === "hoja_calificacion").length;
      const fotos = forSes.filter((a) => a.category === "material_fotografico").length;
      return { asist, calif, fotos, total: forSes.length };
    },
    [allAttachments],
  );

  const renderSessionHeader = (categoryLabel: string) => {
    if (sessionCount <= 1) return null;

    const currentSessionDate = sessionsInfo?.find((s) => s.nro_sesion === selectedSession)?.fecha;
    const isSingleAssignment = assignedSession !== null;

    return (
      <div className="p-4 bg-gradient-to-r from-sky-50 via-sky-50/70 to-blue-50/40 border border-sky-200/90 rounded-2xl space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-950">
                  Sesión Activa de Carga:
                </span>
                <span className="text-xs font-extrabold bg-sky-600 text-white px-2.5 py-0.5 rounded-md shadow-2xs">
                  Sesión {selectedSession}
                </span>
                {currentSessionDate ? (
                  <span className="text-xs font-semibold text-slate-700 bg-white/80 border border-sky-200 px-2 py-0.5 rounded-md">
                    📅 {formatSessionDate(currentSessionDate)}
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                    📅 Fecha por confirmar
                  </span>
                )}
              </div>
              <p className="text-xs text-sky-800 mt-1">
                {isSingleAssignment
                  ? `Estás asignado a la Sesión ${assignedSession}. Todos los documentos se guardarán para esa fecha.`
                  : `Cargando ${categoryLabel} para la Sesión ${selectedSession}. Si tienes archivos de otra fecha, pulsa abajo la sesión correspondiente:`}
              </p>
            </div>
          </div>

          {!isSingleAssignment && selectableSessionsList.length > 1 && (
            <span className="text-[11px] text-sky-700 bg-sky-100/70 border border-sky-200 px-2.5 py-1 rounded-lg font-semibold self-start sm:self-auto">
              💡 Cambia la sesión antes de subir
            </span>
          )}
        </div>

        {/* Interactive session selector pills */}
        {!isSingleAssignment && selectableSessionsList.length > 1 && (
          <div className="pt-2 border-t border-sky-100 flex flex-wrap gap-2">
            {selectableSessionsList.map((n) => {
              const sesDate = sessionsInfo?.find((s) => s.nro_sesion === n)?.fecha;
              const stats = getSessionStats(n);
              const isSelected = selectedSession === n;

              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSelectedSession(n)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? "bg-sky-600 text-white shadow-sm ring-2 ring-sky-300"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-sky-50 hover:border-sky-200"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                      isSelected ? "bg-white text-sky-600" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {n}
                  </span>
                  <span>Sesión {n}</span>
                  {sesDate ? (
                    <span className={`text-[11px] font-normal ${isSelected ? "text-sky-100" : "text-slate-400"}`}>
                      ({formatSessionDate(sesDate)})
                    </span>
                  ) : (
                    <span className={`text-[11px] font-normal italic ${isSelected ? "text-sky-200" : "text-amber-600"}`}>
                      (Por confirmar)
                    </span>
                  )}

                  {stats.total > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      ✓ {stats.total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

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

  // Grade count based on valid participants with name & cedula
  const sinNotaCount = validParticipants.filter(
    (p) => p.score === "" || p.score === null || p.score === undefined
  ).length;

  const filledParticipants = participants.filter(
    (p) =>
      p.nombre_apellido.trim() ||
      p.cedula.trim() ||
      (p.score !== "" && p.score !== null && p.score !== undefined)
  );
  const hasIncompleteRows = filledParticipants.some(
    (p) => !p.nombre_apellido.trim() || !p.cedula.trim()
  );

  // Check for scores out of 0-20 scale
  const hasInvalidScoreRange = validParticipants.some((p) => {
    if (p.score === "" || p.score === null || p.score === undefined) return false;
    const num = Number(p.score);
    return isNaN(num) || num < 0 || num > 20;
  });

  // Prerequisites helpers for finalizing service
  const hasCompletedAttendance = attendanceCount > 0;
  const hasCompletedGradeSheet = gradeSheetCount > 0;
  const hasCompletedPhotos = photoCount > 0;
  const hasCompletedParticipants =
    hasValidParticipants &&
    sinNotaCount === 0 &&
    !hasIncompleteRows &&
    !hasInvalidScoreRange;

  const canFinalize =
    hasAcknowledged &&
    hasCompletedAttendance &&
    hasCompletedGradeSheet &&
    hasCompletedPhotos &&
    hasCompletedParticipants;

  // Step completion status for indicators
  const completedSteps: Partial<Record<WizardStepId, boolean>> = {
    material: hasMaterial,
    asistencia: hasCompletedAttendance,
    calificacion: hasCompletedGradeSheet,
    participantes: hasCompletedParticipants,
    evidencias: hasCompletedPhotos,
    envio: isFinal,
  };

  const currentStepIndex = steps.findIndex((s) => s.id === activeStep);
  const nextStep = steps[currentStepIndex + 1]?.id;
  const prevStep = steps[currentStepIndex - 1]?.id;

  const goToStep = (stepId: WizardStepId) => {
    setActiveStep(stepId);
    window.scrollTo({ top: 120, behavior: "smooth" });
  };

  const activeStepRef = useRef(activeStep);
  activeStepRef.current = activeStep;

  // Helper to ensure target wizard step is mounted before driver.js queries and focuses the element
  const getStepTarget = useCallback(
    (targetWizardStep: WizardStepId, selector: string) => () => {
      if (activeStepRef.current !== targetWizardStep) {
        flushSync(() => {
          setActiveStep(targetWizardStep);
          activeStepRef.current = targetWizardStep;
        });
      }
      return (
        document.querySelector(selector) ||
        document.getElementById("tour-stepper") ||
        document.body
      );
    },
    []
  );

  const getStepHeaderTarget = useCallback(
    (stepId: WizardStepId) => () => {
      // Find desktop or mobile header button that is visible
      const desktop = document.getElementById(`tour-step-${stepId}`);
      if (desktop && desktop.offsetParent !== null) return desktop;
      const mobile = document.getElementById(`tour-step-mobile-${stepId}`);
      if (mobile && mobile.offsetParent !== null) return mobile;
      return desktop || mobile || document.getElementById("tour-stepper") || document.body;
    },
    []
  );

  // Interactive Guided Tour definition
  const tourSteps = useMemo<DriveStep[]>(() => {
    const list: DriveStep[] = [
      {
        element: () => document.getElementById("tour-stepper") || document.body,
        popover: {
          title: "Flujo Guiado Paso a Paso",
          description:
            "Este flujo guiado te acompaña en orden secuencial para registrar y finalizar tu capacitación. Puedes guardar tu avance en cualquier momento con 'Guardar borrador' sin perder ningún dato.",
        },
      },
    ];

    if (hasMaterial) {
      list.push(
        {
          element: getStepHeaderTarget("material"),
          popover: {
            title: "Paso 1: Material Didáctico Oficial",
            description:
              "Accede a los recursos preparados para este curso antes de iniciar o durante la sesión.",
          },
        },
        {
          element: getStepTarget("material", "#tour-material-content"),
          popover: {
            title: "Descarga de Presentación y Guías",
            description:
              "Aquí puedes descargar la presentación PPTX optimizada en alta definición y las guías del participante. Si observas alguna oportunidad de mejora en el contenido, utiliza el botón 'Sugerir mejora' para notificar al equipo técnico.",
          },
        }
      );
    }

    const asistenciaStepNum = hasMaterial ? "2" : "1";
    const califStepNum = hasMaterial ? "3" : "2";
    const partStepNum = hasMaterial ? "4" : "3";
    const evidStepNum = hasMaterial ? "5" : "4";
    const envioStepNum = hasMaterial ? "6" : "5";

    list.push(
      {
        element: getStepHeaderTarget("asistencia"),
        popover: {
          title: `Paso ${asistenciaStepNum}: Lista de Asistencia Física`,
          description:
            "En esta sección debes cargar la lista de asistencia en papel firmada por los participantes durante la capacitación.",
        },
      },
      {
        element: getStepTarget("asistencia", "#tour-upload-section"),
        popover: {
          title: "Cargar Archivo de Asistencia",
          description:
            "Sube fotos nítidas o un archivo PDF de la lista firmada. Asegúrate de que las firmas, nombres y cédulas sean perfectamente legibles.",
        },
      },
      {
        element: getStepTarget("asistencia", "#tour-scan-button"),
        popover: {
          title: "¡Escanear con OCR Inteligente!",
          description:
            "¡Ahorra tiempo de digitación! Presiona este botón para que el sistema escanee la foto de la lista de asistencia y extraiga automáticamente los nombres y cédulas directamente a la nómina de participantes.",
        },
      },
      {
        element: getStepHeaderTarget("calificacion"),
        popover: {
          title: `Paso ${califStepNum}: Hoja de Calificación Física`,
          description:
            "Adjunta la foto o escaneo de la hoja de calificaciones física con las notas y firmas del facilitador y participantes.",
        },
      },
      {
        element: getStepTarget("calificacion", "#tour-calificacion-upload"),
        popover: {
          title: "Cargar Hoja de Calificación",
          description:
            "Sube un archivo PDF o imagen nítida de la planilla de notas física.",
        },
      },
      {
        element: getStepHeaderTarget("participantes"),
        popover: {
          title: `Paso ${partStepNum}: Participantes y Calificaciones`,
          description:
            "Aquí revisas la nómina de participantes, corriges datos si es necesario y asignas las calificaciones de cada participante.",
        },
      },
      {
        element: getStepTarget("participantes", "#tour-participant-actions"),
        popover: {
          title: "Acciones de Participantes",
          description:
            "Puedes usar 'Escanear OCR' para procesar otra hoja de asistencia, o 'Agregar Fila' para añadir participantes manualmente si faltó alguno.",
        },
      },
      {
        element: getStepTarget("participantes", "#tour-participant-list"),
        popover: {
          title: "Validación y Calificaciones (Escala 0 a 20)",
          description:
            "Verifica que el nombre y cédula sean correctos e ingresa la nota (0 a 20). El sistema te indicará en tiempo real si el participante aprueba (según la nota mínima del curso) o reprueba para la emisión de su certificado.",
        },
      },
      {
        element: getStepHeaderTarget("evidencias"),
        popover: {
          title: `Paso ${evidStepNum}: Registro Fotográfico`,
          description:
            "Respaldo visual obligatorio de la realización del curso para los departamentos de Calidad y Capacitación.",
        },
      },
      {
        element: getStepTarget("evidencias", "#tour-evidencias-section"),
        popover: {
          title: "Fotos de la Actividad (Obligatorio)",
          description:
            "Adjunta al menos una foto clara de la sesión presencial o virtual (participantes, facilitador impartiendo el tema, o dinámicas). Sin al menos 1 foto, el sistema no permitirá enviar el servicio.",
        },
      },
      {
        element: getStepHeaderTarget("envio"),
        popover: {
          title: `Paso ${envioStepNum}: Revisión y Envío Final`,
          description:
            "Consolidación final de todos los soportes y remisión oficial del servicio.",
        },
      },
      {
        element: getStepTarget("envio", "#tour-summary-card"),
        popover: {
          title: "Resumen del Servicio",
          description:
            "Verifica el resumen: cantidad de participantes registrados, total de aprobados, lista de asistencia y fotos adjuntas.",
        },
      },
      {
        element: getStepTarget("envio", "#tour-disclaimer"),
        popover: {
          title: "Declaración Jurada de Veracidad",
          description:
            "Lee atentamente la declaración legal y marca obligatoriamente esta casilla para certificar la veracidad de la información y la asistencia real de los participantes.",
        },
      },
      {
        element: getStepTarget("envio", "#tour-submission-actions"),
        popover: {
          title: "Guardar Borrador y Envío a Capacitación",
          description:
            "Usa 'Guardar borrador' si deseas guardar tu progreso para continuar después. Cuando todo esté completo y verificado, haz clic en 'Finalizar y Enviar a Capacitación'.",
        },
      }
    );

    return list;
  }, [hasMaterial, getStepHeaderTarget, getStepTarget]);

  const startTour = useCallback(() => {
    const driverInstance = driver({
      steps: tourSteps,
      showProgress: true,
      allowClose: true,
      smoothScroll: true,
      stagePadding: 8,
      stageRadius: 12,
      nextBtnText: "Siguiente",
      prevBtnText: "Anterior",
      doneBtnText: "¡Listo!",
      onDestroyed: () => {
        localStorage.setItem(OSI_TOUR_KEY, "completed");
      },
    });
    driverInstance.drive();
  }, [tourSteps]);

  useEffect(() => {
    const completed = localStorage.getItem(OSI_TOUR_KEY);
    if (!completed) {
      // Mark as seen immediately so it never auto-triggers again on reloads or tab switches
      localStorage.setItem(OSI_TOUR_KEY, "completed");
      const timer = setTimeout(() => {
        startTour();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [startTour]);

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
      if (!hasCompletedAttendance) {
        setError("Debes cargar la foto o archivo de la lista de asistencia física firmada.");
        goToStep("asistencia");
        return;
      }

      if (!hasCompletedGradeSheet) {
        setError("Debes cargar la foto o archivo de la hoja de calificación física firmada.");
        goToStep("calificacion");
        return;
      }

      if (!hasCompletedParticipants) {
        if (!hasValidParticipants) {
          setError("Debes registrar al menos un participante con nombre y cédula.");
        } else if (hasIncompleteRows) {
          setError("Por favor completa el nombre y cédula de todos los participantes ingresados.");
        } else if (hasInvalidScoreRange) {
          setError("Todas las calificaciones deben ser números válidos entre 0 y 20.");
        } else {
          setError("Todos los participantes deben tener su calificación asignada (escala de 0 a 20).");
        }
        goToStep("participantes");
        return;
      }

      if (!hasCompletedPhotos) {
        setError("Debes adjuntar al menos una foto de la actividad como soporte de ejecución.");
        goToStep("evidencias");
        return;
      }

      if (!hasAcknowledged) {
        setError("Debes confirmar la declaración para finalizar el envío.");
        goToStep("envio");
        disclaimerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const participantsToSave =
      status === "draft"
        ? participants.filter((p) => p.nombre_apellido && p.cedula)
        : participants;

    const mappedParticipants = participantsToSave.map((p) => ({
      nombre_apellido: toTitleCase(p.nombre_apellido.trim()),
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
          },
        );
        setPendingSync(true);
        if (status === "final") setIsFinal(true);
        setSuccess(
          status === "final"
            ? "Listado finalizado — pendiente de sincronización"
            : "Guardado — pendiente de sincronización",
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
      status === "final" ? DISCLAIMER_TEXT : undefined,
    );

    if (result.success) {
      if (status === "final") setIsFinal(true);
      setSuccess(
        status === "final"
          ? "¡Listado finalizado y enviado exitosamente a Capacitación!"
          : "Guardado correctamente",
      );
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
      nombre_apellido: toTitleCase(p.name),
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
          onStartTour={startTour}
        />
      </div>

      {/* Save Progress Reminder Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-sky-50/70 border border-sky-200/80 text-xs text-slate-700 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <Save className="w-4 h-4 text-sky-600 shrink-0" />
          <span>
            <strong>Progreso flexible:</strong> Puedes guardar tus avances en cualquier momento usando el botón <strong className="text-slate-900">&ldquo;Guardar borrador&rdquo;</strong> y retomar la carga cuando lo desees sin perder datos.
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleSave("draft")}
          disabled={saving}
          className="h-8 px-3 text-xs bg-white text-slate-700 border-slate-300 hover:bg-slate-50 font-semibold shrink-0 cursor-pointer self-end sm:self-auto shadow-2xs"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5 text-sky-600" />}
          Guardar borrador
        </Button>
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

      {/* Finalized Service Notice Banner */}
      {isFinal && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50 via-emerald-50/80 to-teal-50/60 border border-emerald-200/90 rounded-2xl flex items-start gap-3.5 text-emerald-950 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
            <CheckCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-emerald-950">
                Servicio Finalizado y Enviado
              </h4>
              <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                Solo Lectura
              </span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Los datos de participantes, calificaciones y soportes físicos/fotográficos fueron formalmente enviados a Capacitación. Por integridad del registro oficial, este servicio se encuentra bloqueado para edición y eliminación de archivos.
            </p>
          </div>
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
                <Camera className="w-4 h-4 mr-1.5 text-sky-600" />
                <span>Escanear con OCR</span>
              </Button>
            </div>

            {/* Session Indicator & Selector */}
            {renderSessionHeader("la lista de asistencia")}

            {/* Upload Area */}
            <div id="tour-upload-section">
              <AttachmentUploadSection
                osiId={osiId}
                facilitadorId={facilitadorId}
                category="lista_asistencia"
                nroSesion={selectedSession}
                sessionDate={sessionsInfo?.find((s) => s.nro_sesion === selectedSession)?.fecha}
                availableSessions={availableSessionsWithDates}
                onSessionChange={setSelectedSession}
                title="Lista de Asistencia Física"
                description="Formatos JPG, PNG o PDF."
                badge="Requerido"
                badgeColor="red"
                onAttachmentCountChange={refreshAttachmentCounts}
                onScanAttachment={handleSelectAttachment}
                onFileReadyToScan={handleFileReadyToScan}
                onStatusChange={setUploadStatus}
                showScanButton={true}
                tourId="tour-upload-button"
                disabled={false}
                isFinal={isFinal}
              />
            </div>

            {uploadStatus && (
              <div
                className={`flex items-center gap-2 text-xs px-3.5 py-2.5 rounded-xl border ${uploadStatus.startsWith("✅")
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
                onClick={() => goToStep("calificacion")}
                className="w-full sm:w-auto h-11 px-6 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs cursor-pointer"
              >
                <span>Continuar a Hoja de Calificación</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP: HOJA DE CALIFICACION FISICA */}
        {activeStep === "calificacion" && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Step Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold">
                    {hasMaterial ? "3" : "2"}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Cargar Hoja de Calificación Física
                  </h2>
                  <span className="text-[10px] font-bold uppercase text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                    Requerido
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600">
                  Sube foto legible o escaneo en PDF de la hoja de notas física y firmas de evaluación.
                </p>
              </div>
            </div>

            {/* Session Indicator & Selector */}
            {renderSessionHeader("la hoja de calificación")}

            {/* Upload Area */}
            <div id="tour-calificacion-upload">
              <AttachmentUploadSection
                osiId={osiId}
                facilitadorId={facilitadorId}
                category="hoja_calificacion"
                nroSesion={selectedSession}
                sessionDate={sessionsInfo?.find((s) => s.nro_sesion === selectedSession)?.fecha}
                availableSessions={availableSessionsWithDates}
                onSessionChange={setSelectedSession}
                title="Hoja de Calificación Física"
                description="Formatos JPG, PNG o PDF con las notas y firmas físicas."
                badge="Requerido"
                badgeColor="red"
                onAttachmentCountChange={refreshAttachmentCounts}
                onStatusChange={setUploadStatus}
                tourId="tour-calificacion-button"
                disabled={false}
                isFinal={isFinal}
              />
            </div>

            {uploadStatus && (
              <div
                className={`flex items-center gap-2 text-xs px-3.5 py-2.5 rounded-xl border ${uploadStatus.startsWith("✅")
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
                {gradeSheetCount > 0 ? (
                  <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> {gradeSheetCount} hoja(s) de calificación física(s) cargada(s).
                  </span>
                ) : (
                  <span className="text-amber-700 font-medium inline-flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    Debes adjuntar la hoja de calificación física firmada.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => goToStep("asistencia")}
                  className="w-1/2 sm:w-auto h-11 px-5 border-slate-300 text-slate-700 font-bold text-xs sm:text-sm rounded-xl cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span>Anterior</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => goToStep("participantes")}
                  className="w-1/2 sm:w-auto h-11 px-6 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs cursor-pointer"
                >
                  <span>Continuar a Participantes</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP: PARTICIPANTES Y CALIFICACIONES */}
        {activeStep === "participantes" && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Step Header & Live Metrics Strip */}
            <div className="space-y-4 pb-4 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold">
                      {hasMaterial ? "4" : "3"}
                    </span>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      Registro de Participantes y Notas
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Ingresa los datos de los participantes, valida sus datos y califica (escala de 0 a 20).
                  </p>
                </div>

                {!isFinal && (
                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap" id="tour-participant-actions">
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
                )}
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
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${isAprobado
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
                          disabled={isFinal}
                          className="bg-white border-slate-200 text-sm font-medium disabled:bg-slate-50 disabled:text-slate-700"
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
                                <AlertCircle className="h-3 w-3 mr-1" /> No verificado
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
                            disabled={isFinal}
                            className="w-16 h-10 px-2 border border-slate-200 rounded-lg bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-600"
                          >
                            <option value="venezolano">V-</option>
                            <option value="extranjero">E-</option>
                          </select>
                          <Input
                            value={p.cedula}
                            onChange={(e) => updateParticipant(index, "cedula", e.target.value)}
                            placeholder="12345678"
                            disabled={isFinal}
                            className="bg-white border-slate-200 font-mono text-sm flex-1 disabled:bg-slate-50 disabled:text-slate-700"
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
                          disabled={isFinal}
                          className={`bg-white text-center font-bold text-sm disabled:bg-slate-50 disabled:text-slate-800 ${isAprobado ? "text-emerald-700 border-emerald-300" : ""
                            }`}
                        />
                      </div>

                      {/* Verification and Delete Actions */}
                      <div className="sm:col-span-1 flex items-center justify-end gap-1 pt-6">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setActiveVerificationIndex(index)}
                            disabled={activeVerificationIndex !== null || isFinal}
                            className="p-2 rounded-lg text-sky-700 hover:bg-sky-100 transition-colors border border-sky-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Verificar cédula"
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

                        {!isFinal && (
                          <button
                            type="button"
                            onClick={() => removeParticipant(index)}
                            disabled={participants.length === 1}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Eliminar fila"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions and Navigation */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {!isFinal && (
                  <>
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
                        className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 cursor-pointer"
                      >
                        Limpiar Todo
                      </button>
                    )}
                  </>
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

        {/* STEP: FOTOS Y EVIDENCIAS */}
        {activeStep === "evidencias" && (
          <div className="p-4 sm:p-6 space-y-6">
            <div className="pb-4 border-b border-slate-100 space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold">
                  {hasMaterial ? "5" : "4"}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Registro Fotográfico
                </h2>
                <span className="text-[10px] font-bold uppercase text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                  Requerido
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600">
                Adjunta fotos de la actividad como soporte de ejecución.
              </p>
            </div>

            {/* Session Indicator & Selector */}
            {renderSessionHeader("las fotos y evidencias")}

            <div className="grid grid-cols-1 gap-6" id="tour-evidencias-section">
              <AttachmentUploadSection
                osiId={osiId}
                facilitadorId={facilitadorId}
                category="material_fotografico"
                nroSesion={selectedSession}
                sessionDate={sessionsInfo?.find((s) => s.nro_sesion === selectedSession)?.fecha}
                availableSessions={availableSessionsWithDates}
                onSessionChange={setSelectedSession}
                title="Registro Fotográfico de la Actividad"
                description="Fotos de la sesión, facilitador y participantes"
                badge={photoCount > 0 ? `${photoCount} Cargada(s)` : undefined}
                badgeColor="green"
                accept="image/*"
                imageOnly
                onAttachmentCountChange={refreshAttachmentCounts}
                disabled={false}
                isFinal={isFinal}
              />
            </div>

            {/* Bottom step navigation callout */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                {photoCount > 0 ? (
                  <span className="text-emerald-700 font-semibold inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> {photoCount} foto(s) registrada(s).
                  </span>
                ) : (
                  <span className="text-amber-700 font-medium inline-flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    Debes adjuntar al menos una foto de la actividad para continuar.
                  </span>
                )}
              </div>

              <Button
                type="button"
                onClick={() => goToStep("envio")}
                disabled={photoCount === 0}
                className={`w-full sm:w-auto h-11 px-6 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all ${photoCount > 0
                  ? "bg-sky-600 hover:bg-sky-700 text-white cursor-pointer"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                  }`}
              >
                <span>Revisión y Envío Final</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP: RESUMEN, DECLARACION Y ENVIO FINAL */}
        {activeStep === "envio" && (
          <div className="p-4 sm:p-6 space-y-6">
            <div className="pb-4 border-b border-slate-100 space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold">
                  {hasMaterial ? "6" : "5"}
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
            <div id="tour-summary-card" className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 via-white to-sky-50/30 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Servicio a Finalizar
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{String(osi?.nombre_empresa || "Empresa")}</h3>
                  <p className="text-xs text-slate-600">{String(osi?.servicio || "Curso de Capacitación")}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                    OSI #{String(osi?.nro_osi || "")}
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-left">
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Participantes</span>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">
                    {validParticipants.length}{" "}
                    <span className="text-xs font-normal text-slate-500">
                      ({aprobadosCount} apr.)
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
                        <AlertTriangle className="w-4 h-4 text-amber-600" /> Sin lista
                      </span>
                    )}
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Hoja Calificación</span>
                  <p className="text-sm font-bold mt-0.5 flex items-center gap-1.5">
                    {gradeSheetCount > 0 ? (
                      <span className="text-emerald-700 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {gradeSheetCount} archivo(s)
                      </span>
                    ) : (
                      <span className="text-amber-700 inline-flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4 text-amber-600" /> Sin hoja
                      </span>
                    )}
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Fotos y Soporte</span>
                  <p className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-slate-500" />
                    {photoCount} fotos
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Soportes de Servicio</span>
                  <p className="text-sm font-bold mt-0.5 flex items-center gap-1.5">
                    {hasCompletedAttendance && hasCompletedGradeSheet && hasCompletedPhotos && hasCompletedParticipants ? (
                      <span className="text-emerald-700 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Completos
                      </span>
                    ) : (
                      <span className="text-amber-700 inline-flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4 text-amber-600" /> Incompletos
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Multi-Session Soportes Breakdown */}
            {sessionCount > 1 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-600" />
                    <h4 className="text-sm font-bold text-slate-900">
                      Estado de Soportes por Sesión ({selectableSessionsList.length} sesión{selectableSessionsList.length > 1 ? "es" : ""})
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Verifica que cada fecha tenga sus recaudos cargados
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectableSessionsList.map((n) => {
                    const sesDate = sessionsInfo?.find((s) => s.nro_sesion === n)?.fecha;
                    const stats = getSessionStats(n);
                    const isAssigned = assignedSessions.includes(n) || assignedSession === n;

                    return (
                      <div
                        key={n}
                        className={`p-3.5 rounded-xl border transition-all ${
                          stats.asist > 0 && stats.calif > 0 && stats.fotos > 0
                            ? "bg-emerald-50/40 border-emerald-200"
                            : "bg-slate-50/70 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-sky-600 text-white shadow-2xs">
                              Sesión {n}
                            </span>
                            {sesDate && (
                              <span className="text-[11px] font-semibold text-slate-600">
                                📅 {formatSessionDate(sesDate)}
                              </span>
                            )}
                          </div>
                          {isAssigned && (
                            <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded">
                              Asignado a ti
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Asistencia:</span>
                            {stats.asist > 0 ? (
                              <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {stats.asist} doc(s)
                              </span>
                            ) : (
                              <span className="text-amber-700 font-semibold inline-flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Pendiente
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Calificación:</span>
                            {stats.calif > 0 ? (
                              <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {stats.calif} doc(s)
                              </span>
                            ) : (
                              <span className="text-amber-700 font-semibold inline-flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Pendiente
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Fotos:</span>
                            {stats.fotos > 0 ? (
                              <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {stats.fotos} foto(s)
                              </span>
                            ) : (
                              <span className="text-amber-700 font-semibold inline-flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Pendiente
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Disclaimer / Responsibility Card */}
            <div
              ref={disclaimerRef}
              id="tour-disclaimer"
              className={`rounded-2xl border-2 transition-all p-5 ${hasAcknowledged
                ? "border-emerald-300 bg-emerald-50/50"
                : "border-amber-200 bg-amber-50/40"
                }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border ${hasAcknowledged
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
                    className={`flex items-center gap-3 pt-2 group ${hasValidParticipants && !isFinal ? "cursor-pointer" : "cursor-not-allowed opacity-75"
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={hasAcknowledged}
                      disabled={!hasValidParticipants || isFinal}
                      onChange={(e) => {
                        setHasAcknowledged(e.target.checked);
                        setError(null);
                      }}
                      className="w-5 h-5 rounded border-2 border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-500 cursor-pointer shrink-0 transition-colors disabled:cursor-not-allowed"
                    />
                    <span
                      className={`text-xs sm:text-sm font-bold select-none ${hasAcknowledged ? "text-emerald-800" : "text-slate-700"
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



            {/* Submission Actions */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                {!hasCompletedAttendance ? (
                  <p className="text-xs text-amber-600 font-medium">
                    ⚠️ Falta cargar la lista de asistencia física en el Paso {hasMaterial ? "2" : "1"}.
                  </p>
                ) : !hasCompletedGradeSheet ? (
                  <p className="text-xs text-amber-600 font-medium">
                    ⚠️ Falta cargar la hoja de calificación física firmada en el Paso {hasMaterial ? "3" : "2"}.
                  </p>
                ) : !hasCompletedParticipants ? (
                  <p className="text-xs text-amber-600 font-medium">
                    ⚠️ Debes registrar al menos 1 participante con su nota respectiva.
                  </p>
                ) : !hasCompletedPhotos ? (
                  <p className="text-xs text-amber-600 font-medium">
                    ⚠️ Falta cargar fotos de la actividad como soporte de ejecución.
                  </p>
                ) : !hasAcknowledged ? (
                  <p className="text-xs text-amber-600 font-medium">
                    ⚠️ Marca la casilla de declaración para habilitar el envío final.
                  </p>
                ) : (
                  <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Todo listo para enviar a Capacitación.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3" id="tour-submission-actions">
                {isFinal ? (
                  <Button
                    disabled
                    className="h-12 px-6 font-bold rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 cursor-not-allowed shadow-2xs"
                  >
                    <CheckCheck className="w-4 h-4 mr-2 text-emerald-600" />
                    <span>Servicio Finalizado y Enviado</span>
                  </Button>
                ) : (
                  <>
                    <Button
                      id="tour-draft-button"
                      variant="outline"
                      onClick={() => handleSave("draft")}
                      disabled={saving}
                      className="h-12 px-5 text-slate-700 font-bold cursor-pointer"
                    >
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      <span>Guardar borrador</span>
                    </Button>

                    <Button
                      id="tour-submit-button"
                      onClick={() => handleSave("final")}
                      disabled={saving || !canFinalize}
                      className={`h-12 px-6 font-bold rounded-xl shadow-xs transition-all cursor-pointer ${canFinalize
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
                  </>
                )}
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
            {!isFinal && (
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
            )}

            {nextStep ? (
              <Button
                type="button"
                onClick={() => goToStep(nextStep)}
                className="h-11 px-4 sm:px-6 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs cursor-pointer"
              >
                <span>Siguiente</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            ) : isFinal ? (
              <Button
                type="button"
                disabled
                className="h-11 px-4 sm:px-6 font-bold rounded-xl text-xs sm:text-sm shadow-xs bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-not-allowed"
              >
                <span>Finalizado</span>
                <CheckCheck className="w-4 h-4 ml-1.5" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => handleSave("final")}
                disabled={saving || !canFinalize}
                className={`h-11 px-4 sm:px-6 font-bold rounded-xl text-xs sm:text-sm shadow-xs cursor-pointer ${canFinalize
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
