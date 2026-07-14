"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  const [hasProcessed, setHasProcessed] = useState(false);
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

  const [isZoomed, setIsZoomed] = useState(false);

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

  // Auto-process file when selected and API key is available
  const handleProcess = useCallback(
    async (fileToProcess: File) => {
      if (!fileToProcess) {
        setError("Por favor selecciona un archivo");
        return;
      }

      if (!apiKey && !hasEnvApiKey) {
        setError("Por favor proporciona la API key de Mistral");
        return;
      }

      setIsProcessing(true);
      setHasProcessed(false);
      setError("");
      setExtractedParticipants([]);

      try {
        const formData = new FormData();
        formData.append("file", fileToProcess);
        formData.append(
          "apiKey",
          apiKey || process.env.NEXT_PUBLIC_MISTRAL_API_KEY || "",
        );

        console.log("Starting OCR processing...");
        const response = await fetch("/api/ocr/process", {
          method: "POST",
          body: formData,
        });

        console.log("OCR response status:", response.status);
        const result = await response.json();
        console.log("OCR result:", result);

        if (!response.ok) {
          throw new Error(result.error || "Error procesando la imagen");
        }

        setHasProcessed(true);

        if (result.success && result.participants) {
          console.log("Setting extracted participants:", result.participants);
          setExtractedParticipants(result.participants);
          if (result.participants.length === 0) {
            // If OCR returned nothing, we still want to show the empty table for manual entry
            console.log("OCR returned 0 participants, but showing empty table");
          }
        } else {
          console.log("No participants field in result");
          setError("No se pudieron extraer participantes de la imagen");
        }
      } catch (err) {
        console.error("OCR error:", err);
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setIsProcessing(false);
      }
    },
    [apiKey, hasEnvApiKey],
  );

  // Trigger processing only when file is first selected
  useEffect(() => {
    if (file && (apiKey || hasEnvApiKey)) {
      console.log("useEffect triggered: file selected, starting processing");
      handleProcess(file);
    }
  }, [file, handleProcess, apiKey, hasEnvApiKey]);

  if (!isOpen) return null;

  const toTitleCase = (str: string) => {
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError("");

      // Create preview for side-by-side view
      if (
        selectedFile.type.startsWith("image/") ||
        selectedFile.type === "application/pdf"
      ) {
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
      } else {
        setPreviewUrl("");
      }
      // Processing will be triggered by useEffect
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-2 md:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[1700px] h-[95vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header - Sticky */}
        <div className="px-6 py-3 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 leading-none">
                Escanear Lista de Participantes
              </h2>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Modal Body - Flexible */}
        <div
          className={`flex-1 flex flex-col min-h-0 ${!hasProcessed ? "overflow-y-auto p-8" : "p-4"} bg-gray-50/50`}
        >
          {!hasProcessed && !error ? (
            <div className="max-w-2xl mx-auto space-y-8 py-8 w-full">
              {/* API Key Input - Only show if not set in environment */}
              {!hasEnvApiKey && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <RefreshCw className="h-4 w-4" />
                    <span className="text-sm font-semibold uppercase tracking-wider">
                      Configuración
                    </span>
                  </div>
                  <label className="block text-sm font-medium text-gray-700">
                    API Key de Mistral OCR *
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Ingresa tu API key de Mistral"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500">
                    Obtén tu API key en{" "}
                    <a
                      href="https://console.mistral.ai/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      console.mistral.ai
                    </a>
                  </p>
                </div>
              )}

              {/* File Upload */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm font-semibold uppercase tracking-wider">
                    Carga de Archivo
                  </span>
                </div>
                <div
                  className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
                    isProcessing
                      ? "border-blue-200 bg-blue-50/30"
                      : "border-gray-200 hover:border-blue-400 hover:bg-blue-50/10 cursor-pointer"
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const droppedFile = e.dataTransfer.files[0];
                    if (droppedFile) {
                      const event = {
                        target: { files: [droppedFile] },
                      } as unknown as React.ChangeEvent<HTMLInputElement>;
                      handleFileSelect(event);
                    }
                  }}
                >
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
                    className={`flex flex-col items-center ${
                      isProcessing ? "cursor-not-allowed" : "cursor-pointer"
                    }`}
                  >
                    {isProcessing ? (
                      <div className="space-y-4">
                        <div className="relative">
                          <RefreshCw className="mx-auto h-16 w-16 text-blue-500 animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Upload className="h-6 w-6 text-blue-400" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-lg font-semibold text-gray-900">
                            Procesando documento...
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="bg-blue-50 p-4 rounded-full mb-4 group-hover:bg-blue-100 transition-colors">
                          <Upload className="h-10 w-10 text-blue-600" />
                        </div>
                        <p className="text-lg font-semibold text-gray-900 mb-1">
                          {file
                            ? file.name
                            : "Selecciona tu lista de asistencia"}
                        </p>
                        <p className="text-sm text-gray-500 mb-6">
                          Arrastra y suelta o haz clic para buscar en tu equipo
                        </p>
                        <div className="flex items-center gap-4 text-xs font-medium text-gray-400 uppercase tracking-widest">
                          <span>PNG</span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full" />
                          <span>JPG</span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full" />
                          <span>PDF</span>
                        </div>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-red-900">
                      Ocurrió un error
                    </p>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}
            </div>
          ) : hasProcessed ? (
            <div className="h-full flex flex-col gap-6">
              {/* Header inside body */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">
                      {extractedParticipants.length} Participantes Extraídos
                    </h3>
                    <p className="text-sm text-gray-500">
                      Revisa los datos y valida con el RIF si es necesario
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setExtractedParticipants([]);
                    setHasProcessed(false);
                    setFile(null);
                  }}
                  className="bg-white hover:bg-gray-50 text-gray-700 border-gray-200 shadow-sm transition-all"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Escanear otro archivo
                </Button>
              </div>

              {/* Side-by-side layout */}
              <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
                {/* Left: Original Viewer - Even narrower */}
                <div className="flex-[3] flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px] lg:min-h-0">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Documento Original
                      </span>
                      {file?.type.startsWith("image/") && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">
                          Imagen
                        </span>
                      )}
                      {file?.type === "application/pdf" && (
                        <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase">
                          PDF
                        </span>
                      )}
                    </div>
                    {file?.type.startsWith("image/") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsZoomed(!isZoomed)}
                        className="h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold"
                      >
                        {isZoomed ? "Ajustar ancho" : "Ver tamaño real"}
                      </Button>
                    )}
                    <p className="text-[10px] text-gray-400 font-medium">
                      Control + Scroll para zoom
                    </p>
                  </div>
                  <div className="flex-1 overflow-auto bg-gray-200/30 p-4 relative group">
                    {previewUrl ? (
                      file?.type === "application/pdf" ? (
                        <iframe
                          src={`${previewUrl}#toolbar=0&navpanes=0&pagemode=none&view=FitH`}
                          className="w-full h-full min-h-[600px] bg-white shadow-lg rounded"
                          title="PDF Preview"
                        />
                      ) : (
                        <div className="flex justify-center min-h-full">
                          <img
                            src={previewUrl}
                            alt="Original document"
                            className={`transition-all duration-300 shadow-xl rounded ${
                              isZoomed ? "max-w-none" : "w-full h-auto"
                            }`}
                          />
                        </div>
                      )
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
                        <AlertCircle className="h-12 w-12 opacity-20" />
                        <p className="text-sm font-medium opacity-60">
                          Vista previa no disponible
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Participants Table - Even wider */}
                <div className="flex-[7] flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px] lg:min-h-0">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Datos Extraídos
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setExtractedParticipants([
                          ...extractedParticipants,
                          { name: "", idNumber: "", nationality: "venezolano" },
                        ])
                      }
                      className="h-8 text-xs font-semibold text-blue-600 border-blue-100 bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      + Agregar Fila
                    </Button>
                  </div>

                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm border-separate border-spacing-0">
                      <thead className="sticky top-0 z-10 bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold text-gray-600 border-b border-gray-200 uppercase tracking-tighter text-[11px]">
                            Nombre (OCR)
                          </th>
                          <th className="px-2 py-3 text-center font-bold text-gray-600 border-b border-gray-200 uppercase tracking-tighter text-[11px] w-14">
                            Nac.
                          </th>
                          <th className="px-4 py-3 text-left font-bold text-gray-600 border-b border-gray-200 uppercase tracking-tighter text-[11px] w-32">
                            Cédula
                          </th>
                          <th className="px-2 py-3 text-center font-bold text-gray-600 border-b border-gray-200 uppercase tracking-tighter text-[11px] w-16">
                            Nota
                          </th>
                          <th className="px-4 py-3 text-center font-bold text-gray-600 border-b border-gray-200 uppercase tracking-tighter text-[11px] w-24">
                            SENIAT
                          </th>
                          <th className="px-4 py-3 text-left font-bold text-gray-600 border-b border-gray-200 uppercase tracking-tighter text-[11px]">
                            Nombre Oficial
                          </th>
                          <th className="px-2 py-3 text-center border-b border-gray-200 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {extractedParticipants.map((participant, index) => (
                          <tr
                            key={index}
                            className="hover:bg-blue-50/30 transition-colors group"
                          >
                            <td className="px-4 py-2">
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
                                className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-gray-300 focus:bg-white focus:border-blue-500 rounded text-xs transition-all outline-none"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <select
                                value={participant.nationality || "venezolano"}
                                onChange={(e) =>
                                  handleParticipantChange(
                                    index,
                                    "nationality",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-1 py-1.5 bg-transparent border border-transparent hover:border-gray-300 focus:bg-white focus:border-blue-500 rounded text-xs transition-all outline-none text-center cursor-pointer"
                              >
                                <option value="venezolano">V</option>
                                <option value="extranjero">E</option>
                              </select>
                            </td>
                            <td className="px-4 py-2">
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
                                className="w-full px-2 py-1.5 bg-transparent border border-transparent hover:border-gray-300 focus:bg-white focus:border-blue-500 rounded text-xs transition-all outline-none font-mono"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={participant.score || ""}
                                onChange={(e) => {
                                  const newScore = parseInt(e.target.value);
                                  if (newScore > 20) return;
                                  handleParticipantChange(
                                    index,
                                    "score",
                                    e.target.value,
                                  );
                                }}
                                className="w-full px-1 py-1.5 bg-transparent border border-transparent hover:border-gray-300 focus:bg-white focus:border-blue-500 rounded text-xs text-center transition-all outline-none font-bold text-blue-700"
                                min="0"
                                max="20"
                              />
                            </td>
                            <td className="px-4 py-2 text-center relative">
                              {verificationResults.has(participant.idNumber) ? (
                                <div className="flex flex-col items-center gap-1">
                                  {verificationResults.get(participant.idNumber)
                                    ?.status === "verified" ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  ) : verificationResults.get(
                                      participant.idNumber,
                                    )?.status === "not_found" ? (
                                    <AlertCircle className="h-4 w-4 text-amber-500" />
                                  ) : (
                                    <X className="h-4 w-4 text-red-500" />
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleVerifyClick(index)}
                                    className="h-7 text-[9px] px-2 text-blue-600 hover:bg-blue-50 font-bold border border-blue-100 rounded-lg mt-1 uppercase"
                                    disabled={activeVerificationIndex !== null}
                                  >
                                    Re-validar
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleVerifyClick(index)}
                                  className="h-8 text-[10px] px-2 text-blue-600 hover:bg-blue-50 font-bold border border-blue-100 rounded-lg"
                                  disabled={activeVerificationIndex !== null}
                                >
                                  <Search className="h-3 w-3 mr-1" />
                                  Verificar
                                </Button>
                              )}

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
                            <td className="px-4 py-2">
                              {verificationResults.has(participant.idNumber) ? (
                                <div
                                  className={`text-xs px-2 py-1 rounded border truncate max-w-[150px] font-medium ${
                                    verificationResults.get(
                                      participant.idNumber,
                                    )?.status === "verified"
                                      ? "bg-green-50 border-green-200 text-green-800"
                                      : "bg-gray-50 border-gray-200 text-gray-500"
                                  }`}
                                  title={
                                    verificationResults.get(
                                      participant.idNumber,
                                    )?.seniatName
                                  }
                                >
                                  {verificationResults.get(participant.idNumber)
                                    ?.seniatName
                                    ? toTitleCase(
                                        verificationResults.get(
                                          participant.idNumber,
                                        )!.seniatName!,
                                      )
                                    : "-"}
                                </div>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveParticipant(index)}
                                className="h-7 w-7 text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all rounded-full"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-red-100 shadow-sm max-w-lg mx-auto mt-10 space-y-6">
              <div className="bg-red-50 p-6 rounded-full">
                <AlertCircle className="h-16 w-16 text-red-500" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-gray-900">
                  No se pudo procesar
                </h3>
                <p className="text-gray-500 max-w-xs mx-auto">
                  {error ||
                    "Ocurrió un error inesperado al intentar procesar el archivo."}
                </p>
              </div>
              <Button
                onClick={() => {
                  setExtractedParticipants([]);
                  setError("");
                  setFile(null);
                  setHasProcessed(false);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 rounded-xl font-bold shadow-lg shadow-blue-200"
              >
                Intentar de nuevo
              </Button>
            </div>
          )}
        </div>

        {/* Footer - Sticky */}
        {hasProcessed && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>
                {extractedParticipants.length} participantes listos para
                importar
              </span>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="px-6 h-11 font-semibold border-gray-300 text-gray-700 hover:bg-white hover:shadow-sm"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddAll}
                disabled={extractedParticipants.length === 0}
                className="px-8 h-11 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
              >
                Importar a la lista de participantes
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
