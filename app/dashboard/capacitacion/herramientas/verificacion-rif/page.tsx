"use client";

import { useState, useRef, useEffect } from "react";
import {
  Upload,
  FileSpreadsheet,
  Trash2,
  Loader2,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Download,
  Shield,
  X,
  RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";
import { ExtractedParticipant } from "@/lib/ocr-service";
import { SeniatVerificationStatus } from "@/types";
import Link from "next/link";

interface ParticipantWithVerification extends ExtractedParticipant {
  verificationStatus: SeniatVerificationStatus;
  seniatName?: string;
  verificationError?: string;
}

export default function VerificacionRifPage() {
  const [file, setFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedParticipants, setExtractedParticipants] = useState<
    ParticipantWithVerification[]
  >([]);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasEnvApiKey, setHasEnvApiKey] = useState(false);

  // Captcha modal state
  const [showCaptchaModal, setShowCaptchaModal] = useState(false);
  const [captchaImage, setCaptchaImage] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [currentVerifyingIndex, setCurrentVerifyingIndex] = useState<
    number | null
  >(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [seniatSessionId, setSeniatSessionId] = useState<string | null>(null);

  useEffect(() => {
    const envApiKey = process.env.NEXT_PUBLIC_MISTRAL_API_KEY || "";
    if (envApiKey) {
      setApiKey(envApiKey);
      setHasEnvApiKey(true);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setRotation(0);
      setZoom(1);
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      setExtractedParticipants([]);
      setError("");
    }
  };

  // Auto-process when file is selected
  useEffect(() => {
    if (file && previewUrl && !isProcessing) {
      handleProcess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, previewUrl]);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
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
        // Initialize participants with pending verification status
        const participantsWithStatus: ParticipantWithVerification[] =
          result.participants.map((p: ExtractedParticipant) => ({
            ...p,
            verificationStatus: "pending" as SeniatVerificationStatus,
          }));
        setExtractedParticipants(participantsWithStatus);
      } else {
        setError("No se pudieron extraer datos de la imagen");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleParticipantChange = (
    index: number,
    field: keyof ParticipantWithVerification,
    value: any,
  ) => {
    const updated = [...extractedParticipants];
    updated[index] = { ...updated[index], [field]: value };
    setExtractedParticipants(updated);
  };

  const handleRemoveParticipant = (index: number) => {
    setExtractedParticipants(
      extractedParticipants.filter((_, i) => i !== index),
    );
  };

  const handleVerifyClick = async (index: number) => {
    const participant = extractedParticipants[index];
    if (!participant.idNumber) {
      setError("El participante no tiene número de cédula");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      // Start a new SENIAT session and get captcha
      const response = await fetch("/api/seniat/verify");
      const result = await response.json();

      if (!result.success) {
        setError(
          "Error obteniendo captcha: " + (result.error || "Unknown error"),
        );
        setIsVerifying(false);
        return;
      }

      // Store session ID and show captcha modal
      setSeniatSessionId(result.sessionId);
      setCaptchaImage(result.captchaImage);
      setCurrentVerifyingIndex(index);
      setIsVerifying(false); // Reset verifying state before showing modal
      setShowCaptchaModal(true);
    } catch (err) {
      setError(
        "Error conectando con SENIAT: " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
      setIsVerifying(false);
    }
  };

  const handleVerifyWithCaptcha = async () => {
    if (currentVerifyingIndex === null || !seniatSessionId) {
      return;
    }

    const participant = extractedParticipants[currentVerifyingIndex];
    // Use just the ID number without V/E prefix for SENIAT
    const rif = participant.idNumber;

    setIsVerifying(true);
    setError("");

    try {
      const response = await fetch("/api/seniat/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: seniatSessionId,
          rif,
          captcha: captchaInput,
          ocrName: participant.name,
        }),
      });

      const result = await response.json();

      const updated = [...extractedParticipants];
      updated[currentVerifyingIndex] = {
        ...updated[currentVerifyingIndex],
        verificationStatus: result.status,
        seniatName: result.seniatName,
        verificationError: result.error,
      };
      setExtractedParticipants(updated);

      if (!result.success && result.status !== "not_found") {
        setError("Error en verificación: " + (result.error || "Unknown error"));
      }
    } catch (err) {
      setError(
        "Error verificando RIF: " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
    } finally {
      setIsVerifying(false);
      setCaptchaInput("");
      setCurrentVerifyingIndex(null);
      setSeniatSessionId(null);
      setShowCaptchaModal(false); // Close modal after verification completes
    }
  };

  const handleCaptchaCancel = () => {
    setShowCaptchaModal(false);
    setCaptchaInput("");
    setCurrentVerifyingIndex(null);
  };

  const exportToExcel = () => {
    if (extractedParticipants.length === 0) return;

    const data = extractedParticipants.map((p) => ({
      "Nombre y Apellido (OCR)": p.name,
      "Cédula/ID": p.idNumber,
      Nacionalidad:
        p.nationality === "extranjero" ? "Extranjero" : "Venezolano",
      Nota: p.score || "",
      "Estado Verificación": getStatusLabel(p.verificationStatus),
      "Nombre SENIAT": p.seniatName || "",
      Error: p.verificationError || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Participantes");

    const fileName = `Verificacion_SENIAT_${new Date().getTime()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const getStatusLabel = (status: SeniatVerificationStatus): string => {
    switch (status) {
      case "verified":
        return "Verificado";
      case "not_found":
        return "No encontrado";
      case "error":
        return "Error";
      default:
        return "Pendiente";
    }
  };

  const getStatusColor = (status: SeniatVerificationStatus): string => {
    switch (status) {
      case "verified":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "not_found":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "error":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-500 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              Verificación RIF SENIAT
            </h1>
            <p className="text-gray-500 mt-1">
              Escanea listas de participantes y verifica sus nombres contra la
              base de datos de SENIAT
            </p>
          </div>
          <Link
            href="/dashboard/capacitacion"
            className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-2"
          >
            Volver al panel
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Hidden file input - always accessible */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,application/pdf"
          />

          {/* Upload Section - Hide when file is selected */}
          {!file && (
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-500" />
                  Cargar Imagen
                </h3>

                <div
                  className="border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer border-gray-200 hover:border-blue-400 hover:bg-gray-50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="space-y-2">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">
                      Haz clic para subir o arrastra un archivo
                    </p>
                    <p className="text-xs text-gray-400">
                      JPG, PNG o PDF (Máx 10MB)
                    </p>
                  </div>
                </div>

                {!hasEnvApiKey && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mistral API Key
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Introduce tu API key..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Esta llave se usa solo para el procesamiento actual.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleProcess}
                  disabled={!file || isProcessing}
                  className={`w-full mt-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                    isProcessing || !file
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg"
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-5 h-5" />
                      Escanear Imagen
                    </>
                  )}
                </button>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-red-600 text-xs">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p>{error}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results Section */}
          <div className={file ? "lg:col-span-3" : "lg:col-span-2"}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[400px] flex flex-col">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  Datos Extraídos
                  {extractedParticipants.length > 0 && (
                    <span className="ml-2 bg-emerald-100 text-emerald-700 text-xs py-0.5 px-2 rounded-full font-medium">
                      {extractedParticipants.length} filas
                    </span>
                  )}
                </h3>

                <div className="flex gap-2">
                  {file && (
                    <button
                      onClick={() => {
                        setFile(null);
                        setPreviewUrl("");
                        setRotation(0);
                        setZoom(1);
                        setExtractedParticipants([]);
                        setError("");
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-gray-200 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Cambiar archivo
                    </button>
                  )}
                  {extractedParticipants.length > 0 && (
                    <button
                      onClick={exportToExcel}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      Exportar a Excel
                    </button>
                  )}
                </div>
              </div>

              {error && (
                <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-red-600 text-xs">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="flex-1 p-6 flex gap-6">
                {previewUrl && extractedParticipants.length > 0 && (
                  <div className="w-1/3 flex-shrink-0">
                    <div className="sticky top-6">
                      <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide flex items-center justify-between">
                        Imagen Original
                        <div className="flex items-center gap-1">
                          {file && file.type !== "application/pdf" && (
                            <>
                              <button
                                onClick={handleZoomOut}
                                className="text-gray-500 hover:text-gray-700 p-1"
                                title="Reducir zoom"
                              >
                                <span className="text-xs font-bold">-</span>
                              </button>
                              <span className="text-xs text-gray-600 w-8 text-center">
                                {Math.round(zoom * 100)}%
                              </span>
                              <button
                                onClick={handleZoomIn}
                                className="text-gray-500 hover:text-gray-700 p-1"
                                title="Aumentar zoom"
                              >
                                <span className="text-xs font-bold">+</span>
                              </button>
                              <div className="w-px h-4 bg-gray-300 mx-1" />
                              <button
                                onClick={handleRotate}
                                className="text-blue-600 hover:text-blue-700"
                                title="Rotar imagen"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {file && file.type === "application/pdf" ? (
                        <iframe
                          src={previewUrl}
                          className="w-full h-96 rounded-lg shadow-sm border border-gray-200"
                          title="PDF Preview"
                        />
                      ) : (
                        <div className="overflow-hidden rounded-lg shadow-sm border border-gray-200">
                          <img
                            src={previewUrl}
                            alt="Original"
                            className="w-full"
                            style={{
                              transform: `rotate(${rotation}deg) scale(${zoom})`,
                              transformOrigin: "center center",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {extractedParticipants.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 pb-4">
                            <th className="px-4 py-2">Nombre OCR</th>
                            <th className="px-4 py-2">Nombre SENIAT</th>
                            <th className="px-4 py-2">Cédula</th>
                            <th className="px-4 py-2">Nacionalidad</th>
                            <th className="px-4 py-2">Estado</th>
                            <th className="px-4 py-2 w-20 text-center">Nota</th>
                            <th className="px-4 py-2 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {extractedParticipants.map((p, index) => (
                            <tr
                              key={index}
                              className="group hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={p.name}
                                  onChange={(e) =>
                                    handleParticipantChange(
                                      index,
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm font-medium text-gray-700"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`text-sm font-medium ${
                                    p.seniatName
                                      ? "text-blue-700"
                                      : "text-gray-400"
                                  }`}
                                >
                                  {p.seniatName || "-"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={p.idNumber}
                                  onChange={(e) =>
                                    handleParticipantChange(
                                      index,
                                      "idNumber",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm text-gray-600"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={p.nationality}
                                  onChange={(e) =>
                                    handleParticipantChange(
                                      index,
                                      "nationality",
                                      e.target.value,
                                    )
                                  }
                                  className="bg-transparent border-0 focus:ring-0 p-0 text-xs text-gray-500 cursor-pointer"
                                >
                                  <option value="venezolano">Venezolano</option>
                                  <option value="extranjero">Extranjero</option>
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                    p.verificationStatus,
                                  )}`}
                                >
                                  {getStatusLabel(p.verificationStatus)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="text"
                                  value={p.score || ""}
                                  onChange={(e) =>
                                    handleParticipantChange(
                                      index,
                                      "score",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full text-center bg-transparent border-0 focus:ring-0 p-0 text-sm text-gray-600"
                                />
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleVerifyClick(index)}
                                    disabled={isVerifying}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Verificar en SENIAT"
                                  >
                                    {isVerifying &&
                                    currentVerifyingIndex === index ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Shield className="w-4 h-4" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleRemoveParticipant(index)
                                    }
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    title="Eliminar fila"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium">
                          No hay datos para mostrar
                        </p>
                        <p className="text-gray-400 text-sm max-w-xs mx-auto">
                          Carga una imagen y presiona "Escanear" para extraer la
                          información.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Captcha Modal */}
        {showCaptchaModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Verificación SENIAT</h3>
                <button
                  onClick={handleCaptchaCancel}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Escribe los caracteres de la imagen:
                  </label>
                  {captchaImage && (
                    <img
                      src={captchaImage}
                      alt="Captcha"
                      className="w-full rounded-lg border border-gray-200 mb-4"
                    />
                  )}
                  <input
                    type="text"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    placeholder="Ingresa el código"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleVerifyWithCaptcha();
                      }
                    }}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleVerifyWithCaptcha}
                    disabled={!captchaInput.trim() || isVerifying}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      "Verificar"
                    )}
                  </button>
                  <button
                    onClick={handleCaptchaCancel}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
