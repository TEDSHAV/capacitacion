"use client";

import { useState } from "react";
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
  Camera,
  FileSearch,
  X
} from "lucide-react";
import { saveParticipants, getOSIAttachments } from "@/app/actions/facilitador-portal";
import { PhysicalListUpload } from "./physical-list-upload";
import { SeniatVerificationPopover } from "@/app/dashboard/capacitacion/generacion-certificado/components/certificate-form/SeniatVerificationPopover";
import { ParticipantScannerModal } from "@/app/dashboard/capacitacion/generacion-certificado/components/certificate-form/ParticipantScannerModal";
import { ParticipantVerificationResult, ExtractedParticipant, CertificateParticipant, OSIAttachment } from "@/types";

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
  const [portalAttachments, setPortalAttachments] = useState<OSIAttachment[]>([]);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [isFetchingAttachments, setIsFetchingAttachments] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

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

  const updateParticipant = (index: number, field: keyof Participant, value: string) => {
    const newParticipants = [...participants];
    newParticipants[index] = { ...newParticipants[index], [field]: value };
    setParticipants(newParticipants);
    setSuccess(null);
    setError(null);
  };

  const handleSave = async (status: "draft" | "final" = "draft") => {
    // Basic validation
    const emptyRows = participants.some(p => !p.nombre_apellido || !p.cedula);
    if (emptyRows) {
      setError("Por favor completa el nombre y cédula de todos los participantes");
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

    const result = await saveParticipants(
      osiId,
      facilitadorId,
      participants.map(p => ({
        nombre_apellido: p.nombre_apellido,
        cedula: p.cedula,
        score: p.score === "" ? null : Number(p.score),
      })),
      status
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

  const handleScanFromPortal = async () => {
    setIsFetchingAttachments(true);
    setScanError(null);

    try {
      const result = await getOSIAttachments(osiId, facilitadorId);
      if (result.error) {
        setScanError(result.error);
      } else if (result.data && result.data.length > 0) {
        setPortalAttachments(result.data);
        setShowAttachmentPicker(true);
      } else {
        setScanError("No hay listas físicas cargadas para escanear.");
      }
    } catch (e) {
      setScanError("Error al obtener archivos cargados");
    } finally {
      setIsFetchingAttachments(false);
    }
  };

  const handleSelectAttachment = async (attachment: OSIAttachment) => {
    try {
      if (!attachment.publicUrl) throw new Error("Public URL missing");
      const response = await fetch(attachment.publicUrl);
      const blob = await response.blob();
      const file = new File([blob], attachment.file_name, { type: attachment.file_type });

      setSelectedPortalFile(file);
      setIsScannerOpen(true);
      setShowAttachmentPicker(false);
    } catch (e) {
      setScanError("Error al procesar el archivo seleccionado");
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
  };

  const handleConfirmFinalizeAnyway = async () => {
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
      "final"
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
      {/* Step 1: Upload physical list picture (primary/required) */}
      <PhysicalListUpload 
        osiId={osiId} 
        facilitadorId={facilitadorId} 
        onAttachmentCountChange={setAttachmentCount}
      />

      {/* Step 2: Scan/parse list and edit participants (optional) */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 flex-wrap">
            Listado de Participantes
            <span className="text-sm font-normal text-gray-500">
              ({participants.length})
            </span>
            <span className="text-[10px] font-bold uppercase text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Opcional</span>
          </h3>
        </div>

        {/* Scanner Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            type="button"
            onClick={() => {
              setSelectedPortalFile(null);
              setIsScannerOpen(true);
            }}
            className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
          >
            <Camera className="w-4 h-4 mr-2" />
            Escanear Lista
          </Button>
          <div className="relative w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleScanFromPortal}
              disabled={isFetchingAttachments}
              className="w-full sm:w-auto border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              {isFetchingAttachments ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileSearch className="w-4 h-4 mr-2" />
              )}
              Escanear desde Archivos
            </Button>

            {showAttachmentPicker && (
              <div className="absolute top-full left-0 mt-2 w-[90vw] sm:w-72 max-w-[288px] bg-white rounded-xl shadow-xl border border-gray-200 z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Listas Disponibles</span>
                  <button onClick={() => setShowAttachmentPicker(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {portalAttachments.map((att) => (
                    <button
                      key={att.id}
                      onClick={() => handleSelectAttachment(att)}
                      className="w-full p-3 text-left hover:bg-blue-50 border-b border-gray-50 last:border-b-0 transition-colors flex flex-col gap-1"
                    >
                      <span className="text-xs font-medium text-gray-900 truncate">{att.file_name}</span>
                      <span className="text-[10px] text-gray-500">Subido el {new Date(att.created_at).toLocaleDateString()}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addParticipant}
            className="text-blue-600 border-blue-200 hover:bg-blue-50 w-full sm:w-auto sm:ml-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Participante
          </Button>
        </div>

        {scanError && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-md border border-red-100">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{scanError}</span>
            <button onClick={() => setScanError(null)} className="ml-auto">
              <X className="w-3 h-3" />
            </button>
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
              <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Cédula</label>
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

      <div className="flex flex-col gap-4 pt-6 border-t border-gray-100">
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
              <p className="font-semibold mb-1">No has subido la lista física</p>
              <p className="text-xs text-amber-700 mb-3">
                Se recomienda subir al menos una foto de la lista de asistencia firmada antes de finalizar. ¿Deseas continuar de todos modos?
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleConfirmFinalizeAnyway}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Sí, finalizar sin foto
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
            * Asegúrate de guardar tus cambios antes de salir.
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
              onClick={() => handleSave("final")}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
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
      />
    </div>
  );
};
