"use client";

import { useState, useMemo, useRef } from "react";
import { CertificateParticipant, ParticipantsSectionProps } from "@/types";
import { useParticipants } from "./use-participants";
import { ParticipantScannerModal } from "./ParticipantScannerModal";
import { Button } from "@/components/ui/button";
import { X, Camera } from "lucide-react";

export const ParticipantsSection = ({
  participants,
  onChange,
  passing_grade,
  isEditMode,
}: ParticipantsSectionProps) => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
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

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {isEditMode
          ? "Datos del Participante (Modo Edición)"
          : "Participantes *"}
      </label>

      {/* Add Participant Form - Hidden in Edit Mode */}
      {!isEditMode && (
        <div className="flex gap-2 mb-3">
          <input
            ref={nameInputRef}
            type="text"
            value={newParticipant.name}
            onChange={(e) => updateNewParticipant("name", e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Nombre del participante"
            className="w-100 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
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
            onClick={() => setIsScannerOpen(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors whitespace-nowrap flex items-center gap-2"
          >
            <Camera className="h-4 w-4" />
            Escanear Lista
          </button>
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
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    {isEditMode ? (
                      <div className="flex flex-col w-full">
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
                    ) : (
                      <>
                        <span className="font-medium text-gray-900">
                          {participant.name}
                        </span>
                        <span className="text-gray-500 text-sm">
                          (
                          {participant.nationality === "venezolano"
                            ? "V-"
                            : "E-"}
                          {participant.idNumber})
                        </span>
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
                            participant.score !== undefined
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
      />
    </div>
  );
};
