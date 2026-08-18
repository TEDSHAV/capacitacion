"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  ClipboardCheck
} from "lucide-react";
import { saveParticipants } from "@/app/actions/facilitador-portal";
import { enqueueOp } from "@/lib/offline/sync-queue";
import { AttachmentUploadSection } from "./attachment-upload-section";
import { SeniatVerificationPopover } from "@/app/dashboard/capacitacion/generacion-certificado/components/certificate-form/SeniatVerificationPopover";
import { ParticipantScannerModal } from "@/app/dashboard/capacitacion/generacion-certificado/components/certificate-form/ParticipantScannerModal";
import { ParticipantVerificationResult, ExtractedParticipant, CertificateParticipant, OSIAttachment } from "@/types";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { HelpCircle } from "lucide-react";

interface Participant {
  nombre_apellido: string;
  cedula: string;
  score: string | number;
  nationality?: "venezolano" | "extranjero";
  seniatVerification?: ParticipantVerificationResult;
}

interface ParticipantFormProps {
  osiId: number;
  facilitadorId: number;
  initialParticipants: Participant[];
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
}

const DISCLAIMER_TEXT = "Declaro bajo mi responsabilidad que he revisado exhaustivamente las calificaciones y datos de los participantes, y que la información aquí suministrada es veraz y ha sido contrastada con la lista de asistencia firmada.";

const OSI_TOUR_KEY = "facilitador-osi-tour";

const osiTourSteps = [
  {
    element: "#tour-upload-section",
    popover: {
      title: "Paso 1: Cargar Lista de Asistencia",
      description: "Sube una foto de la lista de asistencia firmada. Puedes tomar una foto directamente o subir un archivo.",
    },
  },
  {
    element: "#tour-upload-button",
    popover: {
      title: "Subir Archivo",
      description: "Toca aquí para subir un archivo o tomar una foto de la lista física.",
    },
  },
  {
    element: "#tour-scan-button",
    popover: {
      title: "Escanear con OCR",
      description: "Después de subir la foto, toca 'Escanear' para que el sistema extraiga automáticamente los datos de los participantes mediante OCR.",
    },
  },
  {
    element: "#tour-verify-button",
    popover: {
      title: "Verificar con CNE",
      description: "Usa 'Verificar' para validar la cédula de cada participante contra el CNE y obtener su nombre completo en caso de que no sea legible en la lista.",
    },
  },
  {
    element: "#tour-participant-list",
    popover: {
      title: "Lista de Participantes",
      description: "Los participantes importados aparecerán aquí. Puedes editar nombres, cédulas y agregar nuevos participantes manualmente.",
    },
  },
  {
    element: "#tour-score-input",
    popover: {
      title: "Ingresar Calificaciones",
      description: "Ingresa la nota de cada participante en el rango de 0 a 20.",
    },
  },
  {
    element: "#tour-submit-button",
    popover: {
      title: "Paso 2: Finalizar y Enviar",
      description: "Revisa la declaración de responsabilidad, márcala como aceptada y presiona 'Finalizar y Enviar' para que el departamento de Capacitación reciba los datos para la emisión de certificados.",
    },
  },
];

export const ParticipantForm = ({
  osiId,
  facilitadorId,
  initialParticipants,
  assignedSession = null,
  needsSessionPicker = false,
  sessionCount = 1,
  assignedSessions = [],
  hasAllSessionsAssignment = false,
}: ParticipantFormProps) => {
  const [participants, setParticipants] = useState<Participant[]>(
    initialParticipants.length > 0 
      ? initialParticipants.map(p => ({
          nombre_apellido: p.nombre_apellido,
          cedula: p.cedula,
          score: p.score || "",
          nationality: p.nationality || "venezolano",
        }))
      : [{ nombre_apellido: "", cedula: "", score: "", nationality: "venezolano" }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [attachmentCount, setAttachmentCount] = useState(0);
  const [activeVerificationIndex, setActiveVerificationIndex] = useState<number | null>(null);
  // Session context: if needsSessionPicker, the facilitador selects which session they're uploading for.
  // Default to session 1. If assignedSession is set, use that (no picker needed).
  const [selectedSession, setSelectedSession] = useState<number>(assignedSession ?? 1);
  const [showAttachmentWarning, setShowAttachmentWarning] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedPortalFile, setSelectedPortalFile] = useState<File | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const disclaimerRef = useRef<HTMLDivElement>(null);
  const [isTourReady, setIsTourReady] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingSync, setPendingSync] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const goOnline = () => { setIsOffline(false); setPendingSync(false); };
    const goOffline = () => setIsOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    setIsTourReady(true);
  }, []);

  const startTour = useCallback(() => {
    const driverInstance = driver({
      steps: osiTourSteps,
      showProgress: true,
      allowClose: true,
      nextBtnText: "Siguiente",
      prevBtnText: "Anterior",
      doneBtnText: "Entendido",
      onDestroyed: () => {
        localStorage.setItem(OSI_TOUR_KEY, "completed");
      },
    });
    driverInstance.drive();
  }, []);

  useEffect(() => {
    if (!isTourReady) return;
    const completed = localStorage.getItem(OSI_TOUR_KEY);
    if (!completed) {
      const timer = setTimeout(() => {
        startTour();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isTourReady, startTour]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const hasOnlyEmptyRow = participants.length === 1 && !participants[0].nombre_apellido && !participants[0].cedula;
  const hasValidParticipants = participants.some(p => p.nombre_apellido && p.cedula);

  useEffect(() => {
    if (!hasValidParticipants && hasAcknowledged) {
      setHasAcknowledged(false);
    }
  }, [hasValidParticipants, hasAcknowledged]);

  const addParticipant = () => {
    setParticipants([...participants, { nombre_apellido: "", cedula: "", score: "", nationality: "venezolano" }]);
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
    // For final submission, validate that all rows are complete
    if (status === "final") {
      const emptyRows = participants.some(p => !p.nombre_apellido || !p.cedula);
      if (emptyRows) {
        setError("Por favor completa el nombre y cédula de todos los participantes");
        return;
      }
    }

    // Require acknowledgment for final submission
    if (status === "final" && !hasAcknowledged) {
      setError("Debes confirmar la declaración para finalizar el envío.");
      disclaimerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Warn if no attachments uploaded (warn only, don't block)
    if (status === "final" && attachmentCount === 0) {
      setShowAttachmentWarning(true);
      return;
    }

    setShowAttachmentWarning(false);
    setSaving(true);
    setError(null);
    setSuccess(null);

    // For drafts, filter out empty rows so we don't send blank records
    const participantsToSave = status === "draft"
      ? participants.filter(p => p.nombre_apellido && p.cedula)
      : participants;

    const mappedParticipants = participantsToSave.map(p => ({
      nombre_apellido: p.nombre_apellido,
      cedula: p.cedula,
      score: p.score === "" ? null : Number(p.score),
    }));

    // Offline path: enqueue the save for later sync
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
        setSuccess(status === "final"
          ? "Listado finalizado — pendiente de sincronización"
          : "Borrador guardado — pendiente de sincronización"
        );
      } catch (err) {
        setError("Error al guardar offline: " + (err as Error).message);
      }
      setSaving(false);
      return;
    }

    // Online path: use server action as before
    const result = await saveParticipants(
      osiId,
      facilitadorId,
      mappedParticipants,
      status,
      status === "final" ? hasAcknowledged : false,
      status === "final" ? DISCLAIMER_TEXT : undefined
    );

    if (result.success) {
      setSuccess(status === "final"
        ? "Listado finalizado y enviado exitosamente"
        : "Borrador guardado correctamente"
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

  const [isScanningAttachment, setIsScanningAttachment] = useState(false);

  // Used when a file was JUST uploaded: we already have the File object in
  // memory, so we skip re-downloading it from the public URL and open the
  // scanner directly. This avoids a redundant network round-trip that was
  // unreliable on slow mobile connections.
  const handleFileReadyToScan = (file: File, attachment: OSIAttachment) => {
    setScanError(null);
    setUploadStatus("Archivo listo. Abriendo escáner...");
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
    const mapped: Participant[] = scanned.map(p => ({
      nombre_apellido: p.name,
      cedula: p.idNumber,
      score: p.score ?? "",
      nationality: p.nationality || "venezolano",
      seniatVerification: p.seniatVerification,
    }));

    const hasContent = participants.length === 1 && !participants[0].nombre_apellido && !participants[0].cedula;
    if (hasContent) {
      setParticipants(mapped);
    } else {
      setParticipants([...participants, ...mapped]);
    }
    setSelectedPortalFile(null);
    setSuccess(null);
    setUploadStatus(mapped.length > 0 ? `✅ ${mapped.length} participante(s) extraídos correctamente` : null);
  };

  const handleConfirmFinalizeAnyway = async () => {
    if (!hasAcknowledged) {
      setError("Debes confirmar la declaración para finalizar el envío.");
      disclaimerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setShowAttachmentWarning(false);
      return;
    }
    setShowAttachmentWarning(false);
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await saveParticipants(
      osiId,
      facilitadorId,
      participants.map(p => ({
        nombre_apellido: p.nombre_apellido,
        cedula: p.cedula,
        score: p.score === "" ? null : Number(p.score),
      })),
      "final",
      hasAcknowledged,
      DISCLAIMER_TEXT
    );

    if (result.success) {
      setSuccess("Listado finalizado y enviado exitosamente");
    } else {
      setError(result.error || "Error al guardar el listado");
    }
    setSaving(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Step 1: Upload & Scan / Edit Participants */}
      <div className="flex items-center gap-2 mb-2" id="tour-upload-section">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">1</span>
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Cargar y Escanear Lista</h2>
        <span className="text-[10px] font-bold uppercase text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Requerido</span>
        <Button
          variant="outline"
          size="sm"
          onClick={startTour}
          className="ml-auto text-blue-600 border-blue-200 hover:bg-blue-50"
        >
          <HelpCircle className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Tour</span>
        </Button>
      </div>

      {/* Session picker — shown whenever the OSI has more than 1 session.
          If the facilitador is assigned to a single specific session, the picker is read-only
          (only their assigned session is highlighted, others are disabled).
          If assigned to all/multiple sessions, they can select which session to upload for. */}
      {sessionCount > 1 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <label className="block text-xs font-bold text-blue-900 mb-2 uppercase tracking-wide">
            Sesión a cargar
          </label>
          <p className="text-xs text-blue-700 mb-2">
            {assignedSession !== null
              ? `Estás asignado a la Sesión ${assignedSession}. Los documentos se cargarán para esa sesión.`
              : hasAllSessionsAssignment && assignedSessions.length === 0
                ? "Estás asignado a todas las sesiones. Selecciona para qué sesión estás subiendo los documentos."
                : assignedSessions.length > 1
                  ? "Estás asignado a múltiples sesiones. Selecciona para qué sesión estás subiendo los documentos."
                  : "Selecciona para qué sesión estás subiendo los documentos."}
          </p>
          <div className="flex flex-wrap gap-2">
            {/* Determine which sessions to show and which are selectable */}
            {(() => {
              // Sessions the facilitador can upload to:
              // - If assigned to all sessions (and no specific ones): all sessions
              // - If assigned to specific sessions: only those
              // - If assigned to a single specific session: only that one (read-only)
              const selectableSessions = assignedSession !== null
                ? [assignedSession]
                : (hasAllSessionsAssignment && assignedSessions.length === 0)
                  ? Array.from({ length: sessionCount }, (_, i) => i + 1)
                  : [...assignedSessions].sort((a, b) => a - b);

              const isReadOnly = assignedSession !== null;

              return selectableSessions.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => !isReadOnly && setSelectedSession(n)}
                  disabled={isReadOnly}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                    selectedSession === n
                      ? "bg-blue-600 text-white"
                      : isReadOnly
                        ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                        : "bg-white text-blue-700 border border-blue-200 hover:bg-blue-100"
                  }`}
                >
                  Sesión {n}
                </button>
              ));
            })()}
          </div>
        </div>
      )}

      <AttachmentUploadSection
        osiId={osiId}
        facilitadorId={facilitadorId}
        category="lista_asistencia"
        nroSesion={selectedSession}
        title="Cargar Listas Físicas"
        description="Sube fotos o PDFs de las listas de asistencia firmadas. Las imágenes se comprimen automáticamente."
        badge="Requerido"
        badgeColor="red"
        onAttachmentCountChange={setAttachmentCount}
        onScanAttachment={handleSelectAttachment}
        onFileReadyToScan={handleFileReadyToScan}
        onStatusChange={setUploadStatus}
        showScanButton
        tourId="tour-upload-button"
      />

      {uploadStatus && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-md border mt-3 ${
          uploadStatus.startsWith("✅")
            ? "text-green-700 bg-green-50 border-green-100"
            : uploadStatus.startsWith("❌") || uploadStatus.toLowerCase().includes("error") || uploadStatus.toLowerCase().includes("no se pudo")
            ? "text-red-700 bg-red-50 border-red-100"
            : "text-blue-700 bg-blue-50 border-blue-100"
        }`}>
          {uploadStatus.startsWith("✅") ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          ) : uploadStatus.startsWith("❌") || uploadStatus.toLowerCase().includes("error") || uploadStatus.toLowerCase().includes("no se pudo") ? (
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          )}
          <span className="flex-1">{uploadStatus}</span>
          <button onClick={() => setUploadStatus(null)} className="shrink-0">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 mb-4 mt-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 flex-wrap" id="tour-participant-list">
            Participantes
            <span className="text-sm font-normal text-gray-500">
              ({participants.length})
            </span>
          </h3>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={addParticipant}
              className="h-11 px-4 text-blue-600 border-blue-200 hover:bg-blue-50 flex-1 sm:flex-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Participante
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowClearConfirm(true)}
              disabled={hasOnlyEmptyRow}
              className="h-11 px-4 text-red-600 border-red-200 hover:bg-red-50 flex-1 sm:flex-none"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Limpiar Todo
            </Button>
          </div>
        </div>

        {isScanningAttachment && (
          <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Cargando archivo para escanear...</span>
          </div>
        )}

        {scanError && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-md border border-red-100">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{scanError}</span>
            <button onClick={() => setScanError(null)} className="ml-auto">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {showClearConfirm && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-800 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">¿Eliminar todos los participantes?</p>
              <p className="text-xs text-red-700 mb-3">
                Se borrarán todos los participantes de la lista. Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleClearAll}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Sí, limpiar todo
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowClearConfirm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {participants.map((p, index) => (
          <div 
            key={index} 
            className="flex flex-col sm:flex-row gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-100 group transition-colors hover:border-blue-100 hover:bg-white"
          >
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Nombre Completo</label>
              <Input
                value={p.nombre_apellido}
                onChange={(e) => updateParticipant(index, "nombre_apellido", e.target.value)}
                placeholder="Nombre y Apellido"
                className="bg-white"
              />
              {/* SENIAT Verification Status Badge */}
              {p.seniatVerification && (
                <div className="mt-1">
                  {p.seniatVerification.status === "verified" ? (
                    <span className="inline-flex items-center text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100 whitespace-nowrap">
                      <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                      <span className="truncate max-w-[200px]" title={p.seniatVerification.seniatName}>
                        {p.seniatVerification.seniatName}
                      </span>
                    </span>
                  ) : p.seniatVerification.status === "not_found" ? (
                    <span className="inline-flex items-center text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 whitespace-nowrap">
                      <AlertCircle className="h-2.5 w-2.5 mr-1" />
                      No encontrado
                    </span>
                  ) : null}
                </div>
              )}
            </div>
            <div className="w-full sm:w-48 space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Cedula</label>
              <div className="flex items-center gap-1">
                <select
                  value={p.nationality || "venezolano"}
                  onChange={(e) => updateParticipant(index, "nationality", e.target.value)}
                  className="w-16 px-2 py-2 border border-gray-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="venezolano">V-</option>
                  <option value="extranjero">E-</option>
                </select>
                <Input
                  value={p.cedula}
                  onChange={(e) => updateParticipant(index, "cedula", e.target.value)}
                  placeholder="12345678"
                  className="bg-white flex-1"
                />
              </div>
            </div>
            <div className="w-full sm:w-24 space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Nota</label>
              <Input
                type="number"
                min="0"
                max="20"
                value={p.score}
                onChange={(e) => updateParticipant(index, "score", e.target.value)}
                placeholder="0-20"
                className="bg-white text-center font-bold"
                id={index === 0 ? "tour-score-input" : undefined}
              />
            </div>
            <div className="flex items-end gap-2 pb-2 sm:flex-wrap">
              <div className="relative">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setActiveVerificationIndex(index)}
                  disabled={activeVerificationIndex !== null}
                  className="text-blue-600 hover:bg-blue-50 border border-blue-100 rounded-lg h-11 px-3 text-xs font-bold whitespace-nowrap w-full sm:w-auto min-w-[100px]"
                  id={index === 0 ? "tour-verify-button" : undefined}
                >
                  <Search className="w-4 h-4 mr-1" />
                  {p.seniatVerification ? "Re-validar" : "Verificar"}
                </Button>
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
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                onClick={() => removeParticipant(index)}
                className="h-11 w-11 text-red-400 hover:text-red-600 hover:bg-red-50"
                disabled={participants.length === 1}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Additional upload sections: photos & grading sheet */}
      <div className="flex items-center gap-2 mb-2 pt-4 border-t border-gray-100">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">+</span>
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Documentos Adicionales</h2>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AttachmentUploadSection
          osiId={osiId}
          facilitadorId={facilitadorId}
          category="material_fotografico"
          nroSesion={selectedSession}
          title="Registro Fotográfico"
          description="Sube fotos de la actividad (imágenes se comprimen automáticamente)."
          badge="Opcional"
          badgeColor="blue"
          accept="image/*"
          imageOnly
        />
        <AttachmentUploadSection
          osiId={osiId}
          facilitadorId={facilitadorId}
          category="hoja_calificacion"
          nroSesion={selectedSession}
          title="Hoja de Calificación"
          description="Sube fotos o PDFs de las hojas de calificación firmadas."
          badge="Opcional"
          badgeColor="blue"
        />
      </div>

      {/* Step 2: Review & Submit */}
      <div className="flex items-center gap-2 mb-2 pt-4 border-t border-gray-100">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">2</span>
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Revision y Envio</h2>
      </div>

      <div className="flex flex-col gap-4">
        {/* Disclaimer / Acknowledgment Card */}
        <div 
          ref={disclaimerRef}
          className={`rounded-xl border-2 transition-colors ${
            hasAcknowledged 
              ? "border-green-200 bg-green-50/50" 
              : "border-amber-200 bg-amber-50/50"
          }`}
        >
          <div className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                hasAcknowledged ? "bg-green-100" : "bg-amber-100"
              }`}>
                <ShieldCheck className={`w-5 h-5 ${hasAcknowledged ? "text-green-600" : "text-amber-600"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-gray-900 mb-1.5 flex items-center gap-2">
                  Declaracion de Responsabilidad
                  <ClipboardCheck className="w-4 h-4 text-gray-400" />
                </h4>
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed mb-3">
                  {DISCLAIMER_TEXT}
                </p>
                <label className={`flex items-start gap-2.5 group ${hasValidParticipants ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}>
                  <input
                    type="checkbox"
                    checked={hasAcknowledged}
                    disabled={!hasValidParticipants}
                    onChange={(e) => {
                      setHasAcknowledged(e.target.checked);
                      setError(null);
                    }}
                    className="mt-0.5 w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer shrink-0 transition-colors"
                  />
                  <span className={`text-xs sm:text-sm font-medium select-none ${
                    hasAcknowledged ? "text-green-700" : "text-gray-600"
                  }`}>
                    He leido y acepto la declaracion de responsabilidad
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {isOffline && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-800 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Sin conexión — modo offline</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Tus cambios se guardarán localmente y se sincronizarán automáticamente cuando vuelva la conexión.
              </p>
            </div>
          </div>
        )}

        {pendingSync && !isOffline && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3 text-blue-800 text-sm">
            <Loader2 className="w-5 h-5 shrink-0 mt-0.5 animate-spin" />
            <div>
              <p className="font-semibold">Sincronizando cambios...</p>
              <p className="text-xs text-blue-700 mt-0.5">
                Enviando los datos guardados offline al servidor.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-100 rounded-lg flex items-start gap-3 text-green-700 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {showAttachmentWarning && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-800 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">No has subido la lista fisica</p>
              <p className="text-xs text-amber-700 mb-3">
                Se recomienda subir al menos una foto de la lista de asistencia firmada antes de finalizar. Deseas continuar de todos modos?
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleConfirmFinalizeAnyway}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Si, finalizar sin foto
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setShowAttachmentWarning(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <p className="text-xs text-gray-400 italic">
            * Asegurate de guardar tus cambios antes de salir.
          </p>
          <div className="flex gap-3 flex-col sm:flex-row">
            <Button 
              variant="outline" 
              onClick={() => handleSave("draft")}
              disabled={saving}
              className="w-full sm:w-auto h-12"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar Borrador
            </Button>
            <Button 
              id="tour-submit-button"
              onClick={() => handleSave("final")}
              disabled={saving || !hasAcknowledged || !hasValidParticipants}
              className={`w-full sm:w-auto h-12 transition-colors ${
                hasAcknowledged && hasValidParticipants
                  ? "bg-blue-600 hover:bg-blue-700" 
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Finalizar y Enviar
            </Button>
          </div>
        </div>
      </div>

      {/* Participant Scanner Modal */}
      <ParticipantScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onAddParticipants={handleAddScannedParticipants}
        preselectedFile={selectedPortalFile}
        mode="portal"
      />
    </div>
  );
};
