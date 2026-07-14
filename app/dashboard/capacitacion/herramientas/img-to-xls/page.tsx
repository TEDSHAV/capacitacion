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
} from "lucide-react";
import * as XLSX from "xlsx";
import { ExtractedParticipant } from "@/lib/ocr-service";
import Link from "next/link";

export default function ImgToXlsPage() {
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
      setError("");
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
    field: keyof ExtractedParticipant,
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

  const exportToExcel = () => {
    if (extractedParticipants.length === 0) return;

    // Prepare data for Excel
    const data = extractedParticipants.map((p) => ({
      "Nombre y Apellido": p.name,
      "Cédula/ID": p.idNumber,
      Nacionalidad:
        p.nationality === "extranjero" ? "Extranjero" : "Venezolano",
      Nota: p.score || "",
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Participantes");

    // Generate Excel file and trigger download
    const fileName = `Extraccion_${new Date().getTime()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
              Img to xls
            </h1>
            <p className="text-gray-500 mt-1">
              Extrae datos de listas de participantes y expórtalos a Excel
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
          {/* Upload Section */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-500" />
                Cargar Imagen
              </h3>

              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                  file
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-gray-200 hover:border-blue-400 hover:bg-gray-50"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,application/pdf"
                />

                {previewUrl ? (
                  <div className="space-y-4">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-48 mx-auto rounded-lg shadow-sm"
                    />
                    <p className="text-sm font-medium text-emerald-700">
                      {file?.name}
                    </p>
                    <button
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors border border-red-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setPreviewUrl("");
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover archivo
                    </button>
                  </div>
                ) : (
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
                )}
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

          {/* Results Section */}
          <div className="lg:col-span-2">
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

              <div className="flex-1 p-6">
                {extractedParticipants.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 pb-4">
                          <th className="px-4 py-2">Nombre y Apellido</th>
                          <th className="px-4 py-2">Cédula</th>
                          <th className="px-4 py-2">Nacionalidad</th>
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
                              <button
                                onClick={() => handleRemoveParticipant(index)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Eliminar fila"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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
    </div>
  );
}
