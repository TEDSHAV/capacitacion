"use client";

import { useState, useRef, useEffect } from "react";
import { CertificateParticipant, ExtractedParticipant } from "@/types";

interface ParticipantScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddParticipants: (participants: CertificateParticipant[]) => void;
}

export const ParticipantScannerModal = ({
  isOpen,
  onClose,
  onAddParticipants,
}: ParticipantScannerModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedParticipants, setExtractedParticipants] = useState<
    ExtractedParticipant[]
  >([]);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hasEnvApiKey, setHasEnvApiKey] = useState(false);

  // Load API key from environment variable if available (server-side)
  // For client-side, users will need to enter it manually
  useEffect(() => {
    if (isOpen) {
      // Try to get from process.env if available (Next.js)
      // Note: In production, this should be handled server-side for security
      const envApiKey = process.env.NEXT_PUBLIC_MISTRAL_API_KEY || "";
      if (envApiKey) {
        setApiKey(envApiKey);
        setHasEnvApiKey(true);
      } else {
        setHasEnvApiKey(false);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError("");

      // Create preview
      if (selectedFile.type.startsWith("image/")) {
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
      } else {
        setPreviewUrl("");
      }
    }
  };

  const handleProcess = async () => {
    if (!file) {
      setError("Por favor selecciona un archivo");
      return;
    }

    if (!apiKey && !hasEnvApiKey) {
      setError("Por favor proporciona la API key de Mistral");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("apiKey", apiKey);

      const response = await fetch("/api/ocr/process", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error procesando la imagen");
      }

      if (result.success && result.participants) {
        setExtractedParticipants(result.participants);
      } else {
        setError("No se pudieron extraer participantes de la imagen");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleParticipantChange = (
    index: number,
    field: keyof ExtractedParticipant,
    value: string,
  ) => {
    const updated = [...extractedParticipants];
    updated[index] = { ...updated[index], [field]: value };
    setExtractedParticipants(updated);
  };

  const handleRemoveParticipant = (index: number) => {
    const updated = extractedParticipants.filter((_, i) => i !== index);
    setExtractedParticipants(updated);
  };

  const handleAddAll = () => {
    const participants: CertificateParticipant[] = extractedParticipants.map(
      (p, index) => ({
        id: `temp-${Date.now()}-${index}`,
        name: p.name.trim(),
        idNumber: p.idNumber,
        nationality: p.nationality || "venezolano",
        idType: "cedula",
        score: p.score,
      }),
    );

    onAddParticipants(participants);
    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setApiKey("");
    setExtractedParticipants([]);
    setError("");
    setPreviewUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Escanear Lista de Participantes
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {extractedParticipants.length === 0 ? (
            <div className="space-y-6">
              {/* API Key Input - Only show if not set in environment */}
              {!hasEnvApiKey && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key de Mistral OCR *
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Ingresa tu API key de Mistral"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Obtén tu API key en{" "}
                    <a
                      href="https://console.mistral.ai/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      console.mistral.ai
                    </a>{" "}
                    o agrégala a tu archivo .env como
                    NEXT_PUBLIC_MISTRAL_API_KEY
                  </p>
                </div>
              )}

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subir Imagen o PDF de la Lista de Participantes *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <p className="mt-1 text-sm text-gray-600">
                      {file
                        ? file.name
                        : "Haz clic para subir o arrastra un archivo"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG, PDF (máximo 10MB)
                    </p>
                  </label>
                </div>
              </div>

              {/* Preview */}
              {previewUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vista Previa
                  </label>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-w-full h-auto rounded-lg border border-gray-200"
                  />
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Process Button */}
              <button
                onClick={handleProcess}
                disabled={!file || !apiKey || isProcessing}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 mr-2 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v16m1.414 0l3.586-3.586a2 2 0 013.414 3.414L20 8.586a2 2 0 01-3.414-3.414L12 15.414a2 2 0 01-3.414-3.414L4 8.586a2 2 0 013.414 3.414z"
                      />
                    </svg>
                    Procesando...
                  </div>
                ) : (
                  "Procesar Imagen"
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Participantes Extraídos ({extractedParticipants.length})
                </h3>
                <button
                  onClick={() => setExtractedParticipants([])}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Subir otra imagen
                </button>
              </div>

              <p className="text-sm text-gray-600">
                Revisa y edita la información antes de agregar los participantes
              </p>

              {/* Participants List */}
              <div className="border border-gray-200 rounded-md max-h-96 overflow-y-auto">
                {extractedParticipants.map((participant, index) => (
                  <div
                    key={index}
                    className="flex gap-2 p-3 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex-1">
                      <input
                        type="text"
                        value={participant.name}
                        onChange={(e) =>
                          handleParticipantChange(index, "name", e.target.value)
                        }
                        placeholder="Nombre"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <select
                        value={participant.nationality || "venezolano"}
                        onChange={(e) =>
                          handleParticipantChange(
                            index,
                            "nationality",
                            e.target.value,
                          )
                        }
                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="venezolano">V-</option>
                        <option value="extranjero">E-</option>
                      </select>
                      <input
                        type="text"
                        value={participant.idNumber}
                        onChange={(e) =>
                          handleParticipantChange(
                            index,
                            "idNumber",
                            e.target.value,
                          )
                        }
                        placeholder="Cédula"
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        value={participant.score || ""}
                        onChange={(e) => {
                          const newScore = parseInt(e.target.value) || 0;
                          // Validate score range
                          if (newScore < 0 || newScore > 20) {
                            alert("La calificación debe estar entre 0 y 20");
                            return;
                          }
                          handleParticipantChange(
                            index,
                            "score",
                            e.target.value,
                          );
                        }}
                        placeholder="Nota"
                        min="0"
                        max="20"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveParticipant(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleAddAll}
                  disabled={extractedParticipants.length === 0}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Agregar Todos los Participantes
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
