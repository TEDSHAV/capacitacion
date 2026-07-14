"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CertificateGeneration, PaperSize } from "@/types";
import { CustomParticipant } from "@/lib/custom-participant-types";
import { CertCoordinateConfig, CarnetCoordinateConfig } from "@/lib/custom-coordinate-types";
import { generateCustomCertificate } from "@/lib/custom-certificate-generator";
import { CustomCarnetGenerator } from "@/lib/custom-carnet-generator";
import { previewDocumentsServer } from "@/lib/document-server-actions";
import { getSignaturesForDropdownAction } from "@/app/actions/dropdown-data";
import { getFacilitatorData } from "@/app/actions/facilitators";
import { QRService } from "@/lib/qr-service";
import { X, RefreshCw, FileText, ChevronRight } from "lucide-react";

interface CustomPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: CustomParticipant[];
  certificateData: CertificateGeneration;
  certCoords: CertCoordinateConfig;
  carnetCoords: CarnetCoordinateConfig;
  certTemplatePath: string;
  carnetTemplatePath: string;
  emiteCarnet: boolean;
  generateDocuments: boolean;
  paperSize: PaperSize;
  facilitatorId?: string;
  shaSignatureId?: string;
  mockOSI: any;
}

export function CustomPreviewModal({
  isOpen,
  onClose,
  participants,
  certificateData,
  certCoords,
  carnetCoords,
  certTemplatePath,
  carnetTemplatePath,
  emiteCarnet,
  generateDocuments,
  paperSize,
  facilitatorId,
  shaSignatureId,
  mockOSI,
}: CustomPreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [carnetPreviewUrl, setCarnetPreviewUrl] = useState("");
  const [documentsPreviewHtml, setDocumentsPreviewHtml] = useState<{ [key: string]: string }>({});
  const [activeTab, setActiveTab] = useState<"certificate" | "carnet" | "documents">("certificate");
  const [selectedDocType, setSelectedDocType] = useState("certificacion_competencias");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingCarnet, setIsGeneratingCarnet] = useState(false);
  const [isGeneratingDocuments, setIsGeneratingDocuments] = useState(false);
  const [error, setError] = useState("");
  const [selectedParticipantIndex, setSelectedParticipantIndex] = useState(0);
  const [cachedSignatures, setCachedSignatures] = useState<any[]>([]);
  const [cachedFacilitator, setCachedFacilitator] = useState<any>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentGenerationRef = useRef(0);

  const preloadImage = async (url: string): Promise<string> => {
    if (!url) return "";
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return "";
    }
  };

  const debouncedGeneratePreview = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      if (activeTab === "certificate") {
        generateCertificatePreview();
      } else if (activeTab === "carnet") {
        generateCarnetPreview();
      } else if (activeTab === "documents") {
        generateDocumentsPreview();
      }
    }, 300);
  }, [activeTab, participants, certificateData, certCoords, carnetCoords, selectedParticipantIndex]);

  useEffect(() => {
    if (isOpen && participants.length > 0) {
      debouncedGeneratePreview();
    }
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [isOpen, debouncedGeneratePreview]);

  const fetchRequiredData = async () => {
    const promises: Promise<any>[] = [];
    let signatures = cachedSignatures;
    let facilitatorData = cachedFacilitator;

    if (cachedSignatures.length === 0) {
      promises.push(
        getSignaturesForDropdownAction().then((result) => {
          if (result.data) {
            setCachedSignatures(result.data);
            signatures = result.data;
          }
        }),
      );
    }

    const needsFacilitatorFetch = facilitatorId && (
      !cachedFacilitator ||
      cachedFacilitator.id.toString() !== facilitatorId.toString()
    );

    if (needsFacilitatorFetch) {
      promises.push(
        getFacilitatorData(facilitatorId!).then((data) => {
          if (data) {
            setCachedFacilitator(data);
            facilitatorData = data;
          }
        }),
      );
    }

    await Promise.all(promises);
    return { signatures, facilitatorData };
  };

  const generateCertificatePreview = async () => {
    const generationId = ++currentGenerationRef.current;
    setIsGenerating(true);
    setError("");

    try {
      const previewParticipant = participants[selectedParticipantIndex];
      if (!previewParticipant) {
        setError("Participante no válido");
        return;
      }

      if (generationId !== currentGenerationRef.current) return;

      const { signatures = [], facilitatorData = cachedFacilitator } = await fetchRequiredData();

      if (generationId !== currentGenerationRef.current) return;

      let certDataWithExtras = { ...certificateData };

      if (shaSignatureId && signatures.length > 0) {
        const shaSig = signatures.find(
          (s: any) => s.id.toString() === shaSignatureId,
        );
        if (shaSig) {
          (certDataWithExtras as any).sha_signature_data = shaSig;
        }
      }

      if (facilitatorData) {
        certDataWithExtras = {
          ...certDataWithExtras,
          facilitator_data: facilitatorData,
        } as any;
      }

      let shaSignatureBase64 = "";
      if ((certDataWithExtras as any).sha_signature_data?.url_imagen) {
        shaSignatureBase64 = await preloadImage(
          (certDataWithExtras as any).sha_signature_data.url_imagen,
        );
      }

      let facilitatorSignatureBase64 = "";
      const fData = (certDataWithExtras as any).facilitator_data;
      if (fData?.signature_data?.imagen_base64) {
        facilitatorSignatureBase64 = `data:image/png;base64,${fData.signature_data.imagen_base64}`;
      } else if (fData?.signature_data?.url_imagen) {
        facilitatorSignatureBase64 = await preloadImage(fData.signature_data.url_imagen);
      } else if (fData?.firma) {
        facilitatorSignatureBase64 = await preloadImage(fData.firma);
      }

      const sealImage = "/templates/sello.png";
      const [sealBase64] = await Promise.all([preloadImage(sealImage)]);

      const blob = await generateCustomCertificate(
        previewParticipant,
        certDataWithExtras,
        certTemplatePath,
        certCoords,
        {
          sealImage: sealBase64 || sealImage,
          isPreview: true,
          paperSize: paperSize as "letter" | "half-letter-custom",
          preloadedAssets: {
            facilitator: facilitatorData,
            facilitatorSignature: facilitatorSignatureBase64,
            shaSignature: shaSignatureBase64,
          },
        },
      );

      if (generationId !== currentGenerationRef.current) return;

      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      if (generationId === currentGenerationRef.current) {
        setError("Error al generar la vista previa del certificado.");
      }
    } finally {
      if (generationId === currentGenerationRef.current) {
        setIsGenerating(false);
      }
    }
  };

  const generateCarnetPreview = async () => {
    const generationId = ++currentGenerationRef.current;
    setIsGeneratingCarnet(true);
    setError("");

    try {
      const previewParticipant = participants[selectedParticipantIndex];
      if (!previewParticipant) {
        setError("Participante no válido");
        return;
      }

      if (generationId !== currentGenerationRef.current) return;

      const carnetData = {
        id_certificado: 0,
        id_participante: 0,
        id_empresa: null,
        id_curso: certificateData.course_topic_data?.id
          ? parseInt(certificateData.course_topic_data.id)
          : 0,
        id_osi: 0,
        titulo_curso: certificateData.certificate_title,
        subtitulo_curso: certificateData.certificate_subtitle || null,
        fecha_emision: certificateData.date,
        fecha_vencimiento: certificateData.fecha_vencimiento || null,
        nombre_participante: previewParticipant.name,
        cedula_participante: previewParticipant.idNumber,
        empresa_participante: "",
        nro_control: previewParticipant.nro_control || 0,
      };

      // Generate dummy QR code for carnet preview
      let qrDataURL: string | undefined;
      try {
        const dummyCertificateId = 999999;
        const qrData = QRService.generateQRData(dummyCertificateId);
        qrDataURL = await QRService.generateQRDataURL({
          data: qrData,
          size: 60,
          level: "M",
          includeMargin: true,
        });
      } catch (err) {
        console.error("Failed to generate preview QR code:", err);
      }

      const customCarnetGen = new CustomCarnetGenerator(carnetCoords);
      const url = await customCarnetGen.previewCarnet({
        participant: previewParticipant,
        carnetData: carnetData as any,
        templateImage: carnetTemplatePath,
        qrDataURL,
      });

      if (generationId !== currentGenerationRef.current) return;

      setCarnetPreviewUrl(url);
    } catch (err) {
      if (generationId === currentGenerationRef.current) {
        setError("Error al generar la vista previa del carnet.");
      }
    } finally {
      if (generationId === currentGenerationRef.current) {
        setIsGeneratingCarnet(false);
      }
    }
  };

  const generateDocumentsPreview = async () => {
    setIsGeneratingDocuments(true);
    setError("");

    try {
      const certificateRecords = participants.map((p) => ({
        participant_name: p.name,
        participant_id_number: p.idNumber,
        participant_id_type: p.idType,
        participant_nationality: p.nationality,
        course_title: certificateData.certificate_title,
        company_name: mockOSI?.cliente_nombre_empresa || "",
        osi_number: mockOSI?.nro_osi || "",
        city: certificateData.location || "",
        location: certificateData.location || "",
        execution_address: mockOSI?.direccion_ejecucion || "",
        execution_date: certificateData.date,
        control_number: p.nro_control?.toString() || "PREVIEW",
        score: p.score || 14,
      }));

      const result = await previewDocumentsServer({
        certificates: certificateRecords,
        osiData: {
          ...mockOSI,
          ciudad: certificateData.location,
        },
        firmanteData: {
          nombre: "DPTO. CAPACITACIÓN / SHA DE VENEZUELA, C.A.",
          cargo: "Jefe de Capacitación",
        },
      });

      if (result.success && result.html) {
        setDocumentsPreviewHtml(result.html);
      } else {
        setError(result.error || "Error al generar vista previa de documentos");
      }
    } catch {
      setError("Error al generar la vista previa de documentos");
    } finally {
      setIsGeneratingDocuments(false);
    }
  };

  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }
    if (carnetPreviewUrl) {
      URL.revokeObjectURL(carnetPreviewUrl);
      setCarnetPreviewUrl("");
    }
    setSelectedParticipantIndex(0);
    setActiveTab("certificate");
    onClose();
  };

  if (!isOpen) return null;

  const isLoading = isGenerating || isGeneratingCarnet || isGeneratingDocuments;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 text-gray-900">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <h3 className="text-xl font-bold text-gray-800">Vista Previa Personalizada</h3>
          <div className="flex items-center space-x-6">
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab("certificate")}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                  activeTab === "certificate"
                    ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
                }`}
              >
                Certificado
              </button>
              {emiteCarnet && (
                <button
                  onClick={() => setActiveTab("carnet")}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                    activeTab === "carnet"
                      ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
                  }`}
                >
                  Carnet
                </button>
              )}
              {generateDocuments && (
                <button
                  onClick={() => setActiveTab("documents")}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                    activeTab === "documents"
                      ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
                  }`}
                >
                  Documentos
                </button>
              )}
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === "documents" && generateDocuments && (
            <div className="mb-8">
              <div className="flex flex-wrap gap-3">
                {[
                  { id: "certificacion_competencias", label: "Certificación de Competencias" },
                  { id: "nota_entrega", label: "Nota de Entrega" },
                  { id: "validacion_datos", label: "Validación de Datos" },
                ].map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDocType(doc.id)}
                    className={`px-5 py-2.5 text-sm font-bold rounded-full border-2 transition-all ${
                      selectedDocType === doc.id
                        ? "bg-blue-600 text-white border-blue-600 shadow-md"
                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"
                    }`}
                  >
                    {doc.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab !== "documents" && participants.length > 1 && (
            <div className="mb-8 p-4 bg-blue-50/50 rounded-xl border border-blue-100 max-w-2xl">
              <label className="block text-sm font-bold text-blue-900 mb-3 uppercase tracking-wider">
                Seleccionar Participante
              </label>
              <div className="flex items-center space-x-4">
                <select
                  value={selectedParticipantIndex}
                  onChange={(e) => setSelectedParticipantIndex(Number(e.target.value))}
                  className="block w-full px-4 py-2.5 bg-white border border-blue-200 rounded-lg shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-medium text-gray-900 outline-none"
                >
                  {participants.map((p, i) => (
                    <option key={i} value={i}>
                      {p.name} ({p.idNumber})
                    </option>
                  ))}
                </select>
                <div className="flex-shrink-0 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-bold text-sm">
                  {selectedParticipantIndex + 1} / {participants.length}
                </div>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
              <RefreshCw className="animate-spin h-12 w-12 text-blue-600 mb-4" />
              <p className="text-lg font-bold text-gray-600 animate-pulse">
                Generando vista previa...
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-8 flex items-start space-x-4">
              <div className="bg-red-100 p-2 rounded-lg">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-red-800 font-bold mb-1">Hubo un problema</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          {!isLoading && !error && (
            <div className="space-y-6">
              {activeTab === "documents" ? (
                <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-inner min-h-[600px] flex flex-col">
                  {documentsPreviewHtml[selectedDocType] ? (
                    <iframe
                      srcDoc={documentsPreviewHtml[selectedDocType]}
                      className="w-full flex-grow border-none"
                      title="Document Preview"
                      style={{ height: "600px" }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center flex-grow py-32 text-gray-500">
                      <FileText className="h-16 w-12 text-gray-200 mb-4" />
                      <p className="text-lg font-bold">Sin vista previa</p>
                      <p className="text-sm text-gray-400">Selecciona otro tipo de documento</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Documento</p>
                      <p className="text-lg font-black text-blue-600">
                        {activeTab === "carnet" ? "Carnet" : "Certificado"}
                      </p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Participante</p>
                      <p className="text-lg font-black text-gray-800 truncate">
                        {participants[selectedParticipantIndex]?.name}
                      </p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Identificación</p>
                      <p className="text-lg font-black text-gray-800">
                        <span className="text-blue-500 mr-1">
                          {participants[selectedParticipantIndex]?.nationality === "extranjero" ? "E-" : "V-"}
                        </span>
                        {participants[selectedParticipantIndex]?.idNumber}
                      </p>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50 shadow-inner p-4">
                    {(() => {
                      const url = activeTab === "carnet" ? carnetPreviewUrl : previewUrl;
                      if (!url)
                        return (
                          <div className="flex flex-col items-center justify-center py-40 text-gray-400">
                            <RefreshCw className="animate-spin h-10 w-10 mb-4 text-blue-200" />
                            <p className="font-bold">Preparando vista previa...</p>
                          </div>
                        );
                      return (
                        <object
                          data={url}
                          type="application/pdf"
                          className={`w-full rounded-lg ${activeTab === "carnet" ? "h-[350px]" : "h-[550px]"}`}
                          aria-label="Preview"
                        >
                          <div className="p-20 text-gray-500 text-center bg-white rounded-lg border-2 border-dashed border-gray-100">
                            <FileText className="mx-auto h-16 w-12 text-gray-100 mb-6" />
                            <p className="text-lg font-bold mb-3">La visualización no es compatible</p>
                            <a
                              href={url}
                              download="preview.pdf"
                              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700"
                            >
                              Descargar PDF para ver
                            </a>
                          </div>
                        </object>
                      );
                    })()}
                  </div>
                </>
              )}

              <div className="flex flex-col md:flex-row justify-between items-center bg-gray-50 p-6 rounded-2xl gap-6 mt-8 border border-gray-200/50">
                <div className="text-gray-500 flex items-center">
                  {activeTab !== "documents" && participants.length > 1 && (
                    <>
                      <ChevronRight className="w-5 h-5 text-blue-400 mr-2" />
                      <p className="text-sm font-medium italic">
                        Navega entre participantes usando el selector o el botón siguiente
                      </p>
                    </>
                  )}
                </div>
                <div className="flex space-x-4 w-full md:w-auto">
                  {activeTab !== "documents" && participants.length > 1 && (
                    <button
                      onClick={() =>
                        setSelectedParticipantIndex((prev) =>
                          prev === participants.length - 1 ? 0 : prev + 1,
                        )
                      }
                      className="flex-1 md:flex-none px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all"
                    >
                      Siguiente Participante →
                    </button>
                  )}
                  <button
                    onClick={
                      activeTab === "carnet"
                        ? generateCarnetPreview
                        : activeTab === "documents"
                          ? generateDocumentsPreview
                          : generateCertificatePreview
                    }
                    className="flex-1 md:flex-none px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all"
                  >
                    Actualizar Vista Previa
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
