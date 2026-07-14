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
import { PhysicalListUpload } from "./physical-list-upload";
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
  const [showAttachmentWarning, setShowAttachmentWarning] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedPortalFile, setSelectedPortalFile] = useState<File | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const disclaimerRef = useRef<HTMLDivElement>(null);
  const [isTourReady, setIsTourReady] = useState(false);

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

    const result = await saveParticipants(
      osiId,
      facilitadorId,
      participantsToSave.map(p => ({
        nombre_apellido: p.nombre_apellido,
        cedula: p.cedula,
        score: p.score === "" ? null : Number(p.score),
      })),
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
      <PhysicalListUpload 
        osiId={osiId} 
        facilitadorId={facilitadorId} 
        onAttachmentCountChange={setAttachmentCount}
        onScanAttachment={handleSelectAttachment}
        onFileReadyToScan={handleFileReadyToScan}
        onStatusChange={setUploadStatus}
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
              size="sm"
              onClick={addParticipant}
              className="text-blue-600 border-blue-200 hover:bg-blue-50 flex-1 sm:flex-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Participante
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
              disabled={hasOnlyEmptyRow}
              className="text-red-600 border-red-200 hover:bg-red-50 flex-1 sm:flex-none"
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
            <div className="flex items-end gap-1 pb-1 flex-wrap">
              <div className="relative">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setActiveVerificationIndex(index)}
                  disabled={activeVerificationIndex !== null}
                  className="text-blue-600 hover:bg-blue-50 border border-blue-100 rounded-lg h-9 px-2 text-[10px] font-bold whitespace-nowrap w-full sm:w-auto"
                  id={index === 0 ? "tour-verify-button" : undefined}
                >
                  <Search className="w-3.5 h-3.5 mr-1" />
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
                className="text-red-400 hover:text-red-600 hover:bg-red-50"
                disabled={participants.length === 1}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
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
              className="w-full sm:w-auto"
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
              className={`w-full sm:w-auto transition-colors ${
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
