"use client";

import { useState, useRef, useEffect } from "react";
import {
  CertificateParticipant,
  ExtractedParticipant,
  ParticipantVerificationResult,
} from "@/types";
import { Button } from "@/components/ui/button";
import {
  X,
  Upload,
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Search,
} from "lucide-react";
import { SeniatVerificationPopover } from "./SeniatVerificationPopover";

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

  // SENIAT Verification State
  const [seniatSessionId, setSeniatSessionId] = useState<string | null>(null);
  const [initialCaptchaImage, setInitialCaptchaImage] = useState<string | null>(
    null,
  );
  const [activeVerificationIndex, setActiveVerificationIndex] = useState<
    number | null
  >(null);
  const [verificationResults, setVerificationResults] = useState<
    Map<string, ParticipantVerificationResult>
  >(new Map());

  // Load API key from environment variable if available (server-side)
  // For client-side, users will need to enter it manually
  useEffect(() => {
    if (isOpen) {
      // Prevent background scrolling
      document.body.style.overflow = "hidden";

      // Try to get from process.env if available (Next.js)
      const envApiKey = process.env.NEXT_PUBLIC_MISTRAL_API_KEY || "";
      if (envApiKey) {
        setApiKey(envApiKey);
        setHasEnvApiKey(true);
      } else {
        setHasEnvApiKey(false);
      }
    } else {
      // Re-enable background scrolling
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError("");

      // Create preview for side-by-side view (later)
      if (
        selectedFile.type.startsWith("image/") ||
        selectedFile.type === "application/pdf"
      ) {
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
      } else {
        setPreviewUrl("");
      }

      // Automatically start processing
      handleProcess(selectedFile);
    }
  };

  const handleProcess = async (selectedFile?: File) => {
    const fileToProcess = selectedFile || file;
    if (!fileToProcess) {
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
      formData.append("file", fileToProcess);
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
      (p, index) => {
        const verification = verificationResults.get(p.idNumber);
        return {
          id: `temp-${Date.now()}-${index}`,
          name: p.name.trim(),
          idNumber: p.idNumber,
          nationality: p.nationality || "venezolano",
          idType: "cedula",
          score: p.score,
          seniatVerification: verification,
        };
      },
    );

    onAddParticipants(participants);
    handleClose();
  };

  const handleClose = async () => {
    // Close SENIAT session if active
    if (seniatSessionId) {
      fetch("/api/seniat/session", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: seniatSessionId }),
      }).catch((err) => console.error("Error closing SENIAT session:", err));
    }

    setFile(null);
    setApiKey("");
    setExtractedParticipants([]);
    setError("");
    setPreviewUrl("");
    setSeniatSessionId(null);
    setInitialCaptchaImage(null);
    setActiveVerificationIndex(null);
    setVerificationResults(new Map());
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  const startSeniatSession = async () => {
    try {
      const response = await fetch("/api/seniat/session");
      const data = await response.json();
      if (data.success) {
        setSeniatSessionId(data.sessionId);
        setInitialCaptchaImage(data.captchaImage);
        return { sessionId: data.sessionId, captchaImage: data.captchaImage };
      } else {
        throw new Error(data.error || "Error al iniciar sesión");
      }
    } catch (err) {
      console.error("Error starting SENIAT session:", err);
      throw err;
    }
  };

  const handleVerifyClick = async (index: number) => {
    setActiveVerificationIndex(index);
    if (!seniatSessionId) {
      try {
        await startSeniatSession();
      } catch (err) {
        setError("No se pudo conectar con SENIAT. Intenta de nuevo.");
        setActiveVerificationIndex(null);
      }
    }
  };

  const handleVerificationComplete = (
    result: ParticipantVerificationResult,
  ) => {
    const updatedResults = new Map(verificationResults);
    updatedResults.set(result.rif, result);
    setVerificationResults(updatedResults);
    setActiveVerificationIndex(null);
    // Refresh captcha for next verification
    startSeniatSession().catch(() => {
      setSeniatSessionId(null);
      setInitialCaptchaImage(null);
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="p-6 flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Escanear Lista de Participantes
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 rounded-full"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {extractedParticipants.length === 0 ? (
            <div className="space-y-6 overflow-y-auto">
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
                    disabled={isProcessing}
                  />
                  <label
                    htmlFor="file-upload"
                    className={`cursor-pointer ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isProcessing ? (
                      <div className="flex flex-col items-center">
                        <RefreshCw className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
                        <p className="mt-2 text-sm text-blue-600 font-medium">
                          Procesando documento...
                        </p>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-1 text-sm text-gray-600">
                          {file
                            ? file.name
                            : "Haz clic para subir o arrastra un archivo"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PNG, JPG, PDF (máximo 10MB)
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => handleProcess()}
                  disabled={!file || isProcessing || (!apiKey && !hasEnvApiKey)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6"
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center">
                      <RefreshCw className="animate-spin h-5 w-5 mr-2" />
                      Procesando Documento...
                    </div>
                  ) : (
                    "Procesar Imagen"
                  )}
                </Button>

                {file && !isProcessing && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setFile(null);
                      setPreviewUrl("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Seleccionar otro archivo
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full gap-4">
              {/* Header */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Participantes Extraídos ({extractedParticipants.length})
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExtractedParticipants([])}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Subir otra imagen
                </Button>
              </div>

              {/* Side-by-side layout: Image on left, Participants on right */}
              <div className="flex gap-6 flex-1 overflow-hidden">
                {/* Left: Image Preview */}
                <div className="w-[45%] flex flex-col bg-gray-50 rounded-lg border border-gray-200 p-4 overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Imagen Original
                    </span>
                    <p className="text-[10px] text-gray-500 italic">
                      Desliza para ver
                    </p>
                  </div>
                  <div className="flex-1 overflow-auto border border-gray-200 rounded bg-white p-2">
                    {previewUrl ? (
                      file?.type === "application/pdf" ? (
                        <iframe
                          src={previewUrl}
                          className="w-full h-full min-h-[500px]"
                          title="PDF Preview"
                        />
                      ) : (
                        <img
                          src={previewUrl}
                          alt="Original PDF/Image"
                          className="w-full h-auto max-w-none"
                        />
                      )
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                        <AlertCircle className="h-8 w-8" />
                        <p className="text-sm text-center px-4">
                          Vista previa no disponible
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Participants Table */}
                <div className="w-[55%] flex flex-col overflow-hidden">
                  <p className="text-sm text-gray-600 mb-3">
                    Revisa y edita la información. Haz clic en "Verificar RIF"
                    para validar contra SENIAT.
                  </p>

                  {/* Participants Table */}
                  <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">
                            Nombre (OCR)
                          </th>
                          <th className="px-2 py-2 text-center font-semibold text-gray-700 w-12">
                            Tipo
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700 w-28">
                            Cédula
                          </th>
                          <th className="px-2 py-2 text-center font-semibold text-gray-700 w-16">
                            Nota
                          </th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-700 w-24">
                            Acción
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">
                            Nombre (SENIAT)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {extractedParticipants.map((participant, index) => (
                          <tr
                            key={index}
                            className="border-b border-gray-100 hover:bg-blue-50 transition-colors"
                          >
                            {/* OCR Name */}
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={participant.name}
                                onChange={(e) =>
                                  handleParticipantChange(
                                    index,
                                    "name",
                                    e.target.value,
                                  )
                                }
                                placeholder="Nombre"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>

                            {/* Nationality */}
                            <td className="px-2 py-2 text-center">
                              <select
                                value={participant.nationality || "venezolano"}
                                onChange={(e) =>
                                  handleParticipantChange(
                                    index,
                                    "nationality",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-1 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="venezolano">V</option>
                                <option value="extranjero">E</option>
                              </select>
                            </td>

                            {/* ID Number */}
                            <td className="px-3 py-2">
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
                                placeholder="ID"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>

                            {/* Score */}
                            <td className="px-2 py-2 text-center">
                              <input
                                type="number"
                                value={participant.score || ""}
                                onChange={(e) => {
                                  const newScore =
                                    parseInt(e.target.value) || 0;
                                  if (newScore < 0 || newScore > 20) {
                                    alert(
                                      "La calificación debe estar entre 0 y 20",
                                    );
                                    return;
                                  }
                                  handleParticipantChange(
                                    index,
                                    "score",
                                    e.target.value,
                                  );
                                }}
                                placeholder="20"
                                min="0"
                                max="20"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>

                            {/* Verify Button */}
                            <td className="px-3 py-2 text-center relative">
                              {verificationResults.has(participant.idNumber) ? (
                                <div className="flex flex-col items-center gap-1">
                                  {verificationResults.get(participant.idNumber)
                                    ?.status === "verified" ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  ) : verificationResults.get(
                                      participant.idNumber,
                                    )?.status === "not_found" ? (
                                    <AlertCircle className="h-4 w-4 text-amber-600" />
                                  ) : (
                                    <X className="h-4 w-4 text-red-600" />
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleVerifyClick(index)}
                                    className="h-6 text-[9px] px-1 py-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-bold uppercase tracking-tighter border border-blue-100"
                                    disabled={activeVerificationIndex !== null}
                                  >
                                    Re-verificar
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleVerifyClick(index)}
                                  className="h-7 text-[10px] px-2 py-0 border-blue-200 text-blue-700 hover:bg-blue-50 whitespace-nowrap"
                                  disabled={activeVerificationIndex !== null}
                                >
                                  <Search className="h-3 w-3 mr-1" />
                                  Verificar
                                </Button>
                              )}

                              {/* Captcha Popup */}
                              {activeVerificationIndex === index && (
                                <SeniatVerificationPopover
                                  participant={participant}
                                  sessionId={seniatSessionId}
                                  initialCaptchaImage={
                                    initialCaptchaImage || undefined
                                  }
                                  onVerify={handleVerificationComplete}
                                  onClose={() =>
                                    setActiveVerificationIndex(null)
                                  }
                                  onSessionRestart={startSeniatSession}
                                />
                              )}
                            </td>

                            {/* SENIAT Name */}
                            <td className="px-3 py-2">
                              {verificationResults.has(participant.idNumber) ? (
                                <div className="text-xs">
                                  {verificationResults.get(participant.idNumber)
                                    ?.status === "verified" ? (
                                    <div
                                      className="bg-green-50 border border-green-200 rounded px-2 py-1 text-green-900 font-medium truncate"
                                      title={
                                        verificationResults.get(
                                          participant.idNumber,
                                        )?.seniatName
                                      }
                                    >
                                      {
                                        verificationResults.get(
                                          participant.idNumber,
                                        )?.seniatName
                                      }
                                    </div>
                                  ) : verificationResults.get(
                                      participant.idNumber,
                                    )?.status === "not_found" ? (
                                    <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1 text-amber-900 font-medium">
                                      No encontrado en SENIAT
                                    </div>
                                  ) : (
                                    <div className="bg-red-50 border border-red-200 rounded px-2 py-1 text-red-900 font-medium">
                                      Error en verificación
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400 italic">
                                  -
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleAddAll}
                  disabled={extractedParticipants.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                >
                  Agregar Todos los Participantes
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
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
