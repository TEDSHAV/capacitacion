"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
  preselectedFile?: File | null;
  mode?: "certificate" | "portal";
  onDebug?: (msg: string) => void;
}

export const ParticipantScannerModal = ({
  isOpen,
  onClose,
  onAddParticipants,
  preselectedFile,
  mode = "certificate",
  onDebug,
}: ParticipantScannerModalProps) => {
  const dbg = (msg: string) => {
    console.log("[ScannerModal]", msg);
    onDebug?.(msg);
  };
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedParticipants, setExtractedParticipants] = useState<
    ExtractedParticipant[]
  >([]);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [hasProcessed, setHasProcessed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeVerificationIndex, setActiveVerificationIndex] = useState<
    number | null
  >(null);
  const [verificationResults, setVerificationResults] = useState<
    Map<string, ParticipantVerificationResult>
  >(new Map());

  const [isZoomed, setIsZoomed] = useState(false);
  const [isDocCollapsed, setIsDocCollapsed] = useState(false);

  // Initialize modal when opened: handle preselected file
  // API key is now read server-side — no client-side key management needed
  useEffect(() => {
    if (isOpen) {
      dbg(`Modal opened. preselectedFile=${preselectedFile ? preselectedFile.name : "none"}`);
      // Prevent background scrolling
      document.body.style.overflow = "hidden";

      // Handle preselected file from portal (auto-scan flow)
      if (preselectedFile) {
        dbg(`Setting file: ${preselectedFile.name}, ${preselectedFile.size} bytes`);
        setFile(preselectedFile);
        const url = URL.createObjectURL(preselectedFile);
        setPreviewUrl(url);
      }
    } else {
      // Re-enable background scrolling
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, preselectedFile]);

  // Auto-process file when selected
  const handleProcess = useCallback(
    async (fileToProcess: File) => {
      if (!fileToProcess) {
        console.log("[ScannerModal] handleProcess: no file, bailing");
        setError("Por favor selecciona un archivo");
        return;
      }

      dbg(`handleProcess: starting OCR, mode=${mode}, file=${fileToProcess.name}`);
      setIsProcessing(true);
      setHasProcessed(false);
      setError("");
      setExtractedParticipants([]);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      try {
        const formData = new FormData();
        formData.append("file", fileToProcess);
        formData.append("mode", mode);

        const response = await fetch("/api/ocr/process", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        let result: { success?: boolean; error?: string; participants?: ExtractedParticipant[] };
        try {
          result = await response.json();
        } catch (parseErr) {
          console.error("[ScannerModal] Failed to parse response as JSON:", parseErr);
          throw new Error(
            "El servidor tardó demasiado o devolvió una respuesta inválida. Intenta de nuevo."
          );
        }

        if (!response.ok) {
          throw new Error(result.error || "Error procesando la imagen");
        }

        setHasProcessed(true);

        if (result.success && result.participants) {
          dbg(`OCR success: ${result.participants.length} participants extracted`);
          setExtractedParticipants(result.participants);
        } else {
          dbg("OCR returned no participants");
          setError("No se pudieron extraer participantes de la imagen");
        }
      } catch (err) {
        clearTimeout(timeoutId);
        dbg(`OCR error: ${err instanceof Error ? err.message : String(err)}`);
        if (err instanceof Error && err.name === "AbortError") {
          setError("El procesamiento tardó demasiado tiempo (más de 45s). Verifica tu conexión e intenta de nuevo.");
        } else {
          setError(err instanceof Error ? err.message : "Error desconocido");
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [mode],
  );

  // Trigger processing only when file is set and not already processing/done
  useEffect(() => {
    if (file && !isProcessing && !hasProcessed) {
      dbg(`Auto-process effect firing: file=${file.name}`);
      handleProcess(file);
    }
  }, [file, handleProcess, isProcessing, hasProcessed]);

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
    setFile(null);
    setHasProcessed(false);
    setIsProcessing(false);
    setExtractedParticipants([]);
    setError("");
    setPreviewUrl("");
    setActiveVerificationIndex(null);
    setVerificationResults(new Map());
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  const handleVerifyClick = (index: number) => {
    setActiveVerificationIndex(index);
  };

  const handleVerificationComplete = (
    result: ParticipantVerificationResult,
  ) => {
    const updatedResults = new Map(verificationResults);
    updatedResults.set(result.rif, result);
    setVerificationResults(updatedResults);
    setActiveVerificationIndex(null);
  };

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-0 sm:p-2 md:p-4">
      <div className="bg-white rounded-none sm:rounded-xl shadow-2xl w-full max-w-[1700px] h-[100vh] sm:h-[95vh] overflow-hidden flex flex-col">
        {/* Header - Sticky */}
        <div className="px-3 sm:px-6 py-3 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg">
              <Camera className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-bold text-gray-900 leading-none">
                Escanear Lista de Participantes
              </h2>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-11 w-11 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
        </div>

        {/* Modal Body - Flexible */}
        <div
          className={`flex-1 flex flex-col min-h-0 ${!hasProcessed ? "overflow-y-auto p-4 sm:p-8" : "overflow-y-auto p-3 sm:p-4"} bg-gray-50/50`}
        >
          {!hasProcessed && !error ? (
            <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 py-4 sm:py-8 w-full">
              {/* File Upload */}
              <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm font-semibold uppercase tracking-wider">
                    Carga de Archivo
                  </span>
                </div>
                <div
                  className={`border-2 border-dashed rounded-xl p-6 sm:p-10 text-center transition-all ${
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
                        <p className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
                          {file
                            ? file.name
                            : "Selecciona tu lista de asistencia"}
                        </p>
                        <p className="text-sm text-gray-500 mb-4 sm:mb-6">
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
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
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
            <div className="h-full flex flex-col gap-4 sm:gap-6">
              {/* Header inside body */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm shrink-0">
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
                  onClick={() => {
                    setExtractedParticipants([]);
                    setHasProcessed(false);
                    setFile(null);
                  }}
                  className="h-11 bg-white hover:bg-gray-50 text-gray-700 border-gray-200 shadow-sm transition-all"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Escanear otro archivo
                </Button>
              </div>

              {/* Side-by-side layout */}
              <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 min-h-0">
                {/* Left: Original Viewer - Even narrower */}
                <div className="flex-[2] lg:flex-[3] flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[300px] sm:min-h-[400px] lg:min-h-0">
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
                    <div className="flex items-center gap-2">
                      {file?.type.startsWith("image/") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsZoomed(!isZoomed)}
                          className="h-10 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold hidden lg:inline-flex"
                        >
                          {isZoomed ? "Ajustar ancho" : "Ver tamaño real"}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsDocCollapsed(!isDocCollapsed)}
                        className="h-10 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold lg:hidden"
                      >
                        {isDocCollapsed ? "Mostrar" : "Ocultar"}
                      </Button>
                      <p className="text-[10px] text-gray-400 font-medium hidden lg:block">
                        Control + Scroll para zoom
                      </p>
                    </div>
                  </div>
                  <div className={`flex-1 overflow-auto bg-gray-200/30 p-2 sm:p-4 relative group ${isDocCollapsed ? "hidden lg:block" : ""}`}>
                    {previewUrl ? (
                      file?.type === "application/pdf" ? (
                        <iframe
                          src={`${previewUrl}#toolbar=0&navpanes=0&pagemode=none&view=FitH`}
                          className="w-full h-full bg-white shadow-lg rounded"
                          title="PDF Preview"
                        />
                      ) : (
                        <div className="flex justify-center items-center h-full">
                          <img
                            src={previewUrl}
                            alt="Original document"
                            className={`transition-all duration-300 shadow-xl rounded ${
                              isZoomed ? "max-w-none" : "w-full h-full object-contain"
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
                <div className="flex-[7] flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[300px] sm:min-h-[400px] lg:min-h-0">
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
                      className="h-10 text-sm font-semibold text-blue-600 border-blue-100 bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      + Agregar Fila
                    </Button>
                  </div>

                  <div className="flex-1 overflow-auto">
                    {/* Mobile card layout */}
                    <div className="lg:hidden p-3 space-y-3">
                      {extractedParticipants.map((participant, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <input
                            type="text"
                            value={participant.name}
                            onChange={(e) => handleParticipantChange(index, "name", e.target.value)}
                            placeholder="Nombre completo"
                            className="w-full h-11 px-3 mb-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex gap-2 mb-2">
                            <select
                              value={participant.nationality || "venezolano"}
                              onChange={(e) => handleParticipantChange(index, "nationality", e.target.value)}
                              className="w-16 h-11 px-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="venezolano">V</option>
                              <option value="extranjero">E</option>
                            </select>
                            <input
                              type="text"
                              value={participant.idNumber}
                              onChange={(e) => handleParticipantChange(index, "idNumber", e.target.value)}
                              placeholder="Cédula"
                              className="flex-1 h-11 px-3 border border-gray-200 rounded-lg bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {mode !== "portal" && (
                              <input
                                type="number"
                                value={participant.score || ""}
                                onChange={(e) => {
                                  const newScore = parseInt(e.target.value);
                                  if (newScore > 20) return;
                                  handleParticipantChange(index, "score", e.target.value);
                                }}
                                placeholder="0-20"
                                min="0"
                                max="20"
                                className="w-20 h-11 px-2 border border-gray-200 rounded-lg bg-white text-sm text-center font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              {verificationResults.has(participant.idNumber) ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleVerifyClick(index)}
                                  className="h-11 min-w-[100px] text-xs font-bold text-blue-600 hover:bg-blue-50 border border-blue-100 rounded-lg"
                                  disabled={activeVerificationIndex !== null}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />
                                  Re-validar
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleVerifyClick(index)}
                                  className="h-11 min-w-[100px] text-xs font-bold text-blue-600 hover:bg-blue-50 border border-blue-100 rounded-lg"
                                  disabled={activeVerificationIndex !== null}
                                >
                                  <Search className="h-4 w-4 mr-1" />
                                  Verificar
                                </Button>
                              )}
                              {activeVerificationIndex === index && (
                                <SeniatVerificationPopover
                                  participant={participant}
                                  onVerify={handleVerificationComplete}
                                  onClose={() => setActiveVerificationIndex(null)}
                                  useFixedPosition
                                />
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveParticipant(index)}
                              className="h-11 w-11 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors shrink-0 ml-auto"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          {verificationResults.has(participant.idNumber) && (
                            <div className="mt-2">
                              <span
                                className={`text-xs px-2 py-1 rounded border block font-medium ${
                                  verificationResults.get(participant.idNumber)?.status === "verified"
                                    ? "bg-green-50 border-green-200 text-green-800"
                                    : "bg-gray-50 border-gray-200 text-gray-500"
                                }`}
                                title={verificationResults.get(participant.idNumber)?.seniatName}
                              >
                                {verificationResults.get(participant.idNumber)?.seniatName
                                  ? toTitleCase(verificationResults.get(participant.idNumber)!.seniatName!)
                                  : "-"}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Desktop table */}
                    <div className="hidden lg:block">
                    <table className="w-full text-sm border-separate border-spacing-0 min-w-[600px]">
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
                          {mode !== "portal" && (
                            <th className="px-2 py-3 text-center font-bold text-gray-600 border-b border-gray-200 uppercase tracking-tighter text-[11px] w-16">
                              Nota
                            </th>
                          )}
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
                            {mode !== "portal" && (
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
                            )}
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
                                    className="h-9 text-xs px-2 text-blue-600 hover:bg-blue-50 font-bold border border-blue-100 rounded-lg mt-1 uppercase"
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
                                  className="h-9 min-w-[80px] text-xs px-2 text-blue-600 hover:bg-blue-50 font-bold border border-blue-100 rounded-lg"
                                  disabled={activeVerificationIndex !== null}
                                >
                                  <Search className="h-3 w-3 mr-1" />
                                  Verificar
                                </Button>
                              )}

                              {activeVerificationIndex === index && (
                                <SeniatVerificationPopover
                                  participant={participant}
                                  onVerify={handleVerificationComplete}
                                  onClose={() =>
                                    setActiveVerificationIndex(null)
                                  }
                                />
                              )}
                            </td>
                            <td className="px-4 py-2">
                              {verificationResults.has(participant.idNumber) ? (
                                <div
                                  className={`text-xs px-2 py-1 rounded border truncate max-w-[300px] font-medium ${
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
                                className="h-9 w-9 text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all rounded-full"
                              >
                                <X className="h-4 w-4" />
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
          <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>
                {extractedParticipants.length} participantes listos para
                importar
              </span>
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 sm:flex-none px-4 sm:px-6 h-12 font-semibold border-gray-300 text-gray-700 hover:bg-white hover:shadow-sm"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddAll}
                disabled={extractedParticipants.length === 0}
                className="flex-1 sm:flex-none px-4 sm:px-8 h-12 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 text-sm"
              >
                Importar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
