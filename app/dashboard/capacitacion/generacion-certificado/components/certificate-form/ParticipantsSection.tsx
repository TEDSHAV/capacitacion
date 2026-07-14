"use client";

import { useState, useMemo, useRef } from "react";
import { CertificateParticipant, ParticipantsSectionProps, OSIAttachment, ParticipantVerificationResult, ExtractedParticipant } from "@/types";
import { useParticipants } from "./use-participants";
import { ParticipantScannerModal } from "./ParticipantScannerModal";
import { SeniatVerificationPopover } from "./SeniatVerificationPopover";
import { Button } from "@/components/ui/button";
import { X, Camera, CheckCircle2, AlertCircle, Download, Loader2, FileSearch, Search, Database } from "lucide-react";
import { getOSIParticipants, getOSIAttachments } from "@/app/actions/facilitador-portal";

export const ParticipantsSection = ({
  participants,
  onChange,
  passing_grade,
  isEditMode,
  osiId,
  facilitadorId,
}: ParticipantsSectionProps) => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isFetchingAttachments, setIsFetchingAttachments] = useState(false);
  const [portalAttachments, setPortalAttachments] = useState<OSIAttachment[]>([]);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [activeVerificationIndex, setActiveVerificationIndex] = useState<number | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Ensure participants is always an array
  const safeParticipants = Array.isArray(participants) ? participants : [];

  // Remove duplicates by ID number (memoized to prevent infinite loop)
  const uniqueParticipants = useMemo(
    () =>
      safeParticipants.filter(
        (participant, index, self) =>
          index === self.findIndex((p) => p.idNumber === participant.idNumber),
      ),
    [safeParticipants],
  );

  const {
    newParticipant,
    addParticipant: addParticipantHook,
    removeParticipant,
    updateNewParticipant,
    handleKeyPress: handleKeyPressHook,
    error,
    nameAutoFilled,
  } = useParticipants(onChange, uniqueParticipants);

  const addParticipant = () => {
    const wasAdded = addParticipantHook();
    // Focus back to name input only if participant was successfully added
    if (wasAdded) {
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }, 0); // Small delay to ensure DOM has updated
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addParticipant();
    }
  };

  const handleAddScannedParticipants = (
    scannedParticipants: CertificateParticipant[],
  ) => {
    const currentParticipants = Array.isArray(participants) ? participants : [];
    const combinedParticipants = [
      ...currentParticipants,
      ...scannedParticipants,
    ];
    onChange(combinedParticipants);
  };

  const handleImportFromPortal = async () => {
    if (!osiId || !facilitadorId) return;

    setIsImporting(true);
    setImportError(null);

    try {
      console.log(`[Import Debug] Requesting participants for OSI: ${osiId}, Facilitador: ${facilitadorId}`);
      const result = await getOSIParticipants(osiId, facilitadorId);
      console.log(`[Import Debug] Result:`, result);
      
      if (result.error) {
        setImportError(result.error);
      } else if (result.data && result.data.length > 0) {
        const portalParticipants = result.data.map((p: any) => ({
          name: p.nombre_apellido,
          idNumber: p.cedula,
          score: p.score,
          nationality: "venezolano" as const, // Fixed TS error: string not assignable to union
        }));

        // Replace or merge? Usually for OSIs we want to replace if importing from portal
        if (confirm(`Se han encontrado ${portalParticipants.length} participantes en el portal. ¿Deseas importarlos? Esto reemplazará la lista actual.`)) {
          onChange(portalParticipants);
        }
      } else {
        setImportError("No se encontraron participantes para esta OSI en el portal.");
      }
    } catch (e) {
      setImportError("Error al importar desde el portal");
    } finally {
      setIsImporting(false);
    }
  };

  const handleScanFromPortal = async () => {
    if (!osiId) return;
    
    setIsFetchingAttachments(true);
    setImportError(null);
    
    try {
      const result = await getOSIAttachments(osiId);
      if (result.error) {
        setImportError(result.error);
      } else if (result.data && result.data.length > 0) {
        setPortalAttachments(result.data);
        setShowAttachmentPicker(true);
      } else {
        setImportError("No hay listas físicas cargadas para esta OSI.");
      }
    } catch (e) {
      setImportError("Error al obtener archivos del portal");
    } finally {
      setIsFetchingAttachments(false);
    }
  };

  const [selectedPortalFile, setSelectedPortalFile] = useState<File | null>(null);

  const handleSelectAttachment = async (attachment: OSIAttachment) => {
    try {
      if (!attachment.publicUrl) throw new Error("Public URL missing");
      // Fetch the file and convert to a File object
      const response = await fetch(attachment.publicUrl);
      const blob = await response.blob();
      const file = new File([blob], attachment.file_name, { type: attachment.file_type });
      
      setSelectedPortalFile(file);
      setIsScannerOpen(true);
      setShowAttachmentPicker(false);
    } catch (e) {
      setImportError("Error al procesar el archivo seleccionado");
    }
  };
  const getParticipantStatus = (participant: CertificateParticipant) => {
    if (participant.score === undefined || participant.score === null) {
      return "unknown";
    }
    return participant.score >= (passing_grade || 0)
      ? "approved"
      : "attendance";
  };

  // Helper function to get badge styles
  const getBadgeStyles = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "attendance":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  // Helper function to get badge text
  const getBadgeText = (status: string) => {
    switch (status) {
      case "approved":
        return "Aprobado";
      case "attendance":
        return "Asistencia";
      default:
        return "Sin calificación";
    }
  };

  const handleVerificationComplete = (
    index: number,
    result: ParticipantVerificationResult,
  ) => {
    const newParticipants = [...uniqueParticipants];
    newParticipants[index].seniatVerification = result;
    onChange(newParticipants);
    setActiveVerificationIndex(null);
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {isEditMode
          ? "Datos del Participante (Modo Edición)"
          : "Participantes *"}
      </label>

      {/* Actions Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Moved portal import button to the add form below */}
        </div>

        {importError && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-md border border-red-100">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{importError}</span>
            <button 
              onClick={() => setImportError(null)}
              className="ml-1 hover:text-red-800"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Add Participant Form - Hidden in Edit Mode */}
      {!isEditMode && (
        <div className="flex gap-2 mb-3 items-center">
          <div className="relative flex-1">
            <input
              ref={nameInputRef}
              type="text"
              value={newParticipant.name}
              onChange={(e) => updateNewParticipant("name", e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nombre del participante"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {nameAutoFilled && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200 whitespace-nowrap pointer-events-none">
                <Database className="h-2.5 w-2.5" />
                Auto
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <select
              value={newParticipant.nationality || "venezolano"}
              onChange={(e) =>
                updateNewParticipant("nationality", e.target.value)
              }
              className="w-16 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="venezolano">V-</option>
              <option value="extranjero">E-</option>
            </select>
            <input
              type="text"
              value={newParticipant.idNumber}
              onChange={(e) => updateNewParticipant("idNumber", e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Cédula/Pasaporte"
              className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <input
            type="number"
            value={newParticipant.score || ""}
            onChange={(e) =>
              updateNewParticipant("score", parseInt(e.target.value) || 0)
            }
            onKeyPress={handleKeyPress}
            placeholder="Calif."
            min="0"
            max="20"
            className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={addParticipant}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            Agregar
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedPortalFile(null);
              setIsScannerOpen(true);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors whitespace-nowrap flex items-center gap-2"
          >
            <Camera className="h-4 w-4" />
            Escanear Lista
          </button>
          {osiId && (
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                onClick={handleScanFromPortal}
                disabled={isFetchingAttachments}
                className="px-4 py-2 flex items-center gap-2 border-green-200 text-green-700 bg-green-50 hover:bg-green-100 whitespace-nowrap h-10"
              >
                {isFetchingAttachments ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileSearch className="w-4 h-4" />
                )}
                Escanear desde Portal
              </Button>

              {showAttachmentPicker && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2">
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
          )}
          {osiId && facilitadorId && (
            <Button
              type="button"
              variant="outline"
              onClick={handleImportFromPortal}
              disabled={isImporting}
              className="px-4 py-2 flex items-center gap-2 border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 hover:border-purple-400 whitespace-nowrap h-10"
            >
              {isImporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Importar del Portal
            </Button>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && !isEditMode && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Participants List */}
      {uniqueParticipants.length > 0 && (
        <div className="border border-gray-200 rounded-md max-h-60 overflow-y-auto">
          {uniqueParticipants.map((participant, index) => {
            const status = getParticipantStatus(participant);
            const badgeStyles = getBadgeStyles(status);
            const badgeText = getBadgeText(status);

            return (
              <div
                key={participant.id || index}
                className="flex justify-between items-center p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 flex items-center gap-2">
                  {isEditMode ? (
                    <div className="flex items-center gap-2 w-full">
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-500 mb-1">
                          Nombre Completo
                        </label>
                        <input
                          type="text"
                          value={participant.name}
                          onChange={(e) => {
                            const newParticipants = [...uniqueParticipants];
                            newParticipants[index].name = e.target.value;
                            onChange(newParticipants);
                          }}
                          className="px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      {/* SENIAT Verification (edit mode) */}
                      {participant.seniatVerification && (
                        <>
                          {participant.seniatVerification.status === "verified" ? (
                            <span className="flex items-center text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100 whitespace-nowrap">
                              <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                              <span className="truncate max-w-[200px]" title={participant.seniatVerification.seniatName}>
                                {participant.seniatVerification.seniatName}
                              </span>
                            </span>
                          ) : participant.seniatVerification.status === "not_found" ? (
                            <span className="flex items-center text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 whitespace-nowrap">
                              <AlertCircle className="h-2.5 w-2.5 mr-1" />
                              No en SENIAT
                            </span>
                          ) : null}
                        </>
                      )}
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveVerificationIndex(index)}
                          disabled={activeVerificationIndex !== null}
                          className="h-8 text-[10px] px-2 text-blue-600 hover:bg-blue-50 font-bold border border-blue-100 rounded-lg whitespace-nowrap"
                        >
                          <Search className="h-3 w-3 mr-1" />
                          {participant.seniatVerification ? "Re-validar" : "Verificar"}
                        </Button>
                        {activeVerificationIndex === index && (
                          <SeniatVerificationPopover
                            participant={
                              {
                                name: participant.name,
                                idNumber: participant.idNumber,
                                nationality: participant.nationality,
                              } as ExtractedParticipant
                            }
                            onVerify={(result) =>
                              handleVerificationComplete(index, result)
                            }
                            onClose={() => setActiveVerificationIndex(null)}
                            useFixedPosition
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={participant.name}
                        onChange={(e) => {
                          const newParticipants = [...uniqueParticipants];
                          newParticipants[index].name = e.target.value;
                          onChange(newParticipants);
                        }}
                        className="font-medium text-gray-900 uppercase whitespace-nowrap px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
                      />
                      <div className="flex items-center gap-1">
                        <select
                          value={participant.nationality || "venezolano"}
                          onChange={(e) => {
                            const newParticipants = [...uniqueParticipants];
                            newParticipants[index].nationality = e.target.value as "venezolano" | "extranjero";
                            onChange(newParticipants);
                          }}
                          className="px-1 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="venezolano">V-</option>
                          <option value="extranjero">E-</option>
                        </select>
                        <input
                          type="text"
                          value={participant.idNumber}
                          onChange={(e) => {
                            const newParticipants = [...uniqueParticipants];
                            newParticipants[index].idNumber = e.target.value;
                            onChange(newParticipants);
                          }}
                          className="text-gray-500 text-sm whitespace-nowrap px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-28"
                        />
                      </div>

                      {/* SENIAT Verification Status */}
                      {participant.seniatVerification && (
                        <>
                          {participant.seniatVerification.status ===
                          "verified" ? (
                            <span className="flex items-center text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100 whitespace-nowrap">
                              <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                              <span
                                className="truncate max-w-[200px]"
                                title={
                                  participant.seniatVerification.seniatName
                                }
                              >
                                {participant.seniatVerification.seniatName}
                              </span>
                            </span>
                          ) : participant.seniatVerification.status ===
                            "not_found" ? (
                            <span className="flex items-center text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 whitespace-nowrap">
                              <AlertCircle className="h-2.5 w-2.5 mr-1" />
                              No en SENIAT
                            </span>
                          ) : null}
                        </>
                      )}

                      {/* SENIAT Verification Button */}
                      <div className="relative ml-1">
                        {participant.seniatVerification ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveVerificationIndex(index)}
                            disabled={activeVerificationIndex !== null}
                            className="h-7 text-[9px] px-2 text-blue-600 hover:bg-blue-50 font-bold border border-blue-100 rounded-lg uppercase whitespace-nowrap"
                          >
                            Re-validar
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveVerificationIndex(index)}
                            disabled={activeVerificationIndex !== null}
                            className="h-8 text-[10px] px-2 text-blue-600 hover:bg-blue-50 font-bold border border-blue-100 rounded-lg whitespace-nowrap"
                          >
                            <Search className="h-3 w-3 mr-1" />
                            Verificar
                          </Button>
                        )}

                        {activeVerificationIndex === index && (
                          <SeniatVerificationPopover
                            participant={
                              {
                                name: participant.name,
                                idNumber: participant.idNumber,
                                nationality: participant.nationality,
                              } as ExtractedParticipant
                            }
                            onVerify={(result) =>
                              handleVerificationComplete(index, result)
                            }
                            onClose={() => setActiveVerificationIndex(null)}
                            useFixedPosition
                          />
                        )}
                      </div>
                    </>
                  )}
                  </div>

                  <div className="flex items-center gap-3">
                    {isEditMode && (
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-500 mb-1">
                          Cédula
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-gray-700">
                            {participant.nationality === "venezolano"
                              ? "V-"
                              : "E-"}
                          </span>
                          <input
                            type="text"
                            value={participant.idNumber}
                            onChange={(e) => {
                              const newParticipants = [...uniqueParticipants];
                              newParticipants[index].idNumber = e.target.value;
                              onChange(newParticipants);
                            }}
                            className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col">
                      <label className="text-xs text-gray-500 mb-1">
                        Calificación
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={
                            participant.score != null
                              ? participant.score
                              : ""
                          }
                          onChange={(e) => {
                            const newScore = parseInt(e.target.value) || 0;
                            // Validate score range
                            if (newScore < 0 || newScore > 20) {
                              alert("La calificación debe estar entre 0 y 20");
                              return;
                            }
                            const newParticipants = [...uniqueParticipants];
                            newParticipants[index].score = newScore;
                            onChange(newParticipants);
                          }}
                          min="0"
                          max="20"
                          className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${badgeStyles}`}
                        >
                          {badgeText}
                        </span>
                      </div>
                    </div>
                  </div>
                {!isEditMode && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeParticipant(participant.id!)}
                    className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full ml-4 flex-shrink-0"
                    title="Eliminar participante"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {uniqueParticipants.length === 0 && (
        <p className="text-sm text-gray-500">
          Agrega al menos un participante para generar el certificado
        </p>
      )}

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
