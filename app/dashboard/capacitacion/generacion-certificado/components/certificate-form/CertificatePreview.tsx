"use client";

import { CertificateGenerator } from "@/lib/certificate-generator";
import { CarnetGenerator } from "@/lib/carnet-generator";
import { CertificateGeneration, CertificateParticipant } from "@/types";
import { useState, useEffect, useCallback, useRef } from "react";
import { getSignaturesForDropdownAction } from "@/app/actions/dropdown-data";
import { QRService } from "@/lib/qr-service";
import { Button } from "@/components/ui/button";
import { X, RefreshCw, ChevronRight, FileText } from "lucide-react";
import { previewDocumentsServer } from "@/lib/document-server-actions";
import { getPreviousParticipantsByOSIAction } from "@/app/actions/certificados";

interface CertificatePreviewProps {
  certificateData: CertificateGeneration;
  selectedOSI: any;
  isOpen: boolean;
  onClose: () => void;
  selectedCourse?: any; // Add course data to check if it emits carnets
}

export const CertificatePreview = ({
  certificateData,
  selectedOSI,
  isOpen,
  onClose,
  selectedCourse,
}: CertificatePreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [carnetPreviewUrl, setCarnetPreviewUrl] = useState<string>("");
  const [documentsPreviewHtml, setDocumentsPreviewHtml] = useState<{
    [key: string]: string;
  }>({});
  const [activeTab, setActiveTab] = useState<
    "certificate" | "carnet" | "documents"
  >("certificate");
  const [selectedDocType, setSelectedDocType] = useState<string>(
    "certificacion_competencias",
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingCarnet, setIsGeneratingCarnet] = useState(false);
  const [isGeneratingDocuments, setIsGeneratingDocuments] = useState(false);
  const [error, setError] = useState<string>("");
  const [selectedParticipantIndex, setSelectedParticipantIndex] = useState(0);
  const [cachedSignatures, setCachedSignatures] = useState<any[]>([]);
  const [cachedFacilitators, setCachedFacilitators] = useState<
    Map<string, any>
  >(new Map());
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentGenerationRef = useRef<number>(0); // Track current generation to avoid race conditions

  // Helper function to preload images as base64
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
    } catch (error) {
      console.error(`Failed to preload image: ${url}`, error);
      return "";
    }
  };

  // Debounced preview generation
  const debouncedGeneratePreview = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (activeTab === "certificate") {
        generatePreview();
      } else if (activeTab === "carnet") {
        generateCarnetPreview();
      } else if (activeTab === "documents") {
        generateDocumentsPreview();
      }
    }, 300); // 300ms debounce
  }, [certificateData, selectedParticipantIndex, selectedCourse, activeTab]);

  useEffect(() => {
    if (isOpen && certificateData.participants.length > 0) {
      debouncedGeneratePreview();
    }

    // Cleanup timeout on unmount
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [isOpen, debouncedGeneratePreview]);

  // Generate documents preview
  const generateDocumentsPreview = async () => {
    setIsGeneratingDocuments(true);
    try {
      // Use existing records for preview
      const certificateRecords = certificateData.participants.map(
        (participant, index) => ({
          participant_name: participant.name,
          participant_id_number: participant.idNumber,
          participant_id_type: participant.idType,
          participant_nationality: participant.nationality,
          course_title: certificateData.certificate_title,
          company_name: selectedOSI?.cliente_nombre_empresa || "",
          osi_number: selectedOSI?.nro_osi || "",
          city: certificateData.location || "Puerto La Cruz",
          location: certificateData.location || "",
          execution_address: selectedOSI?.direccion_ejecucion || "",
          execution_date: certificateData.date,
          score: participant.score || 14,
          control_number: "PREVIEW",
        }),
      );

      // Fetch previous participants if OSI already has certificates
      let allParticipants = [...certificateRecords];
      if (selectedOSI?.nro_osi && selectedCourse?.id) {
        try {
          const nroOsiNum = parseInt(selectedOSI.nro_osi.replace(/[^\d]/g, ""));
          const courseIdNum = parseInt(selectedCourse.id);

          if (!isNaN(nroOsiNum) && !isNaN(courseIdNum)) {
            // Import the action from certificates since it's defined there
            const { getPreviousParticipantsByOSIAction } =
              await import("@/app/actions/certificados");
            const previousResult = await getPreviousParticipantsByOSIAction(
              nroOsiNum,
              courseIdNum,
            );

            if (
              previousResult.success &&
              previousResult.data &&
              previousResult.data.length > 0
            ) {
              const existingCidNumbers = new Set(
                certificateRecords.map((r) => r.participant_id_number),
              );
              const enrichedPrevious = previousResult.data
                .filter(
                  (p: any) => !existingCidNumbers.has(p.participant_id_number),
                )
                .map((p: any) => ({
                  ...p,
                  course_title: certificateData.certificate_title,
                  company_name: selectedOSI?.cliente_nombre_empresa || "",
                  osi_number: selectedOSI?.nro_osi || "",
                  city: certificateData.location || "Puerto La Cruz",
                  location: certificateData.location || "",
                  execution_address: selectedOSI?.direccion_ejecucion || "",
                  execution_date: certificateData.date,
                }));

              allParticipants = [...enrichedPrevious, ...certificateRecords];
              allParticipants.sort((a, b) => {
                const numA = parseInt(a.control_number || "0");
                const numB = parseInt(b.control_number || "0");
                return numA - numB;
              });
            }
          }
        } catch (e) {
          console.warn("Failed to fetch previous participants for preview:", e);
        }
      }

      const result = await previewDocumentsServer({
        certificates: allParticipants,
        osiData: {
          ...(selectedOSI || {}),
        },
        firmanteData: {
          nombre: "DPTO. CAPACITACIÓN / SHA DE VENEZUELA, C.A.",
          cargo: "Jefe de Capacitación",
        },
      });

      if (result.success && result.html) {
        setDocumentsPreviewHtml(result.html);
      } else {
        setError(
          result.error || "Error al generar la vista previa de documentos",
        );
      }
    } catch (err) {
      console.error("Error generating documents preview:", err);
      setError("Error al generar la vista previa de documentos");
    } finally {
      setIsGeneratingDocuments(false);
    }
  };

  // Cache and fetch all required data in parallel
  const fetchRequiredData = async () => {
    const promises: Promise<any>[] = [];

    // Fetch signatures if not cached
    if (cachedSignatures.length === 0) {
      promises.push(
        getSignaturesForDropdownAction().then((result) => {
          if (result.data) {
            setCachedSignatures(result.data);
            return { signatures: result.data };
          }
          return { signatures: [] };
        }),
      );
    }

    // Fetch facilitator data if not cached
    if (
      certificateData.facilitator_id &&
      !cachedFacilitators.has(certificateData.facilitator_id)
    ) {
      promises.push(
        import("@/app/actions/facilitators").then(({ getFacilitatorData }) =>
          getFacilitatorData(certificateData.facilitator_id!).then(
            (facilitatorData) => {
              if (facilitatorData) {
                setCachedFacilitators(
                  (prev) =>
                    new Map(
                      prev.set(
                        certificateData.facilitator_id!,
                        facilitatorData,
                      ),
                    ),
                );
                return { facilitatorData };
              }
              return { facilitatorData: null };
            },
          ),
        ),
      );
    }

    const results = await Promise.all(promises);
    return results.reduce((acc, result) => ({ ...acc, ...result }), {});
  };

  const generateCarnetPreview = async () => {
    setIsGeneratingCarnet(true);
    try {
      const carnetGenerator = new CarnetGenerator();

      // Use selected participant for preview
      const previewParticipant: CertificateParticipant =
        certificateData.participants[selectedParticipantIndex];

      if (!previewParticipant) {
        return;
      }

      // Create carnet data for preview
      const carnetData = {
        id_certificado: 0, // Preview certificate ID
        id_participante:
          typeof previewParticipant.id === "string"
            ? parseInt(previewParticipant.id)
            : previewParticipant.id || 0,
        id_empresa: null,
        id_curso: selectedCourse?.id || 0,
        id_osi: certificateData.osi_id ? parseInt(certificateData.osi_id) : 0,
        titulo_curso: certificateData.certificate_title,
        subtitulo_curso: certificateData.certificate_subtitle || null,
        fecha_emision: certificateData.date,
        fecha_vencimiento: certificateData.fecha_vencimiento || null,
        nombre_participante: previewParticipant.name,
        cedula_participante: previewParticipant.idNumber,
        empresa_participante: previewParticipant.company || "",
        nro_control: 123451234544, // Placeholder control number for preview
        qr_code: undefined, // Preview doesn't need QR code
      };

      // Generate QR code for carnet (same as certificate)
      let qrDataURL: string | undefined;
      try {
        // Use dummy certificate ID for preview
        const dummyCertificateId = 999999;
        const qrData = QRService.generateQRData(dummyCertificateId);
        qrDataURL = await QRService.generateQRDataURL({
          data: qrData,
          size: 60,
          level: "M",
          includeMargin: true,
        });
      } catch (qrError) {
        // Continue without QR code - carnet generator will use placeholder
      }

      // Determine carnet template for preview
      let carnetTemplateImage = "/templates/carnet.png";
      if (certificateData.id_plantilla_carnet) {
        try {
          const { getCarnetTemplatesAction } =
            await import("@/app/actions/dropdown-data");
          const carnetResult = await getCarnetTemplatesAction();
          if (carnetResult.data) {
            const carnetTmpl = carnetResult.data.find(
              (t: any) => t.id === certificateData.id_plantilla_carnet,
            );
            if (carnetTmpl?.archivo) {
              carnetTemplateImage = `/templates/${carnetTmpl.archivo}`;
            }
          }
        } catch {
          // Continue with default
        }
      }

      const carnetPreviewUrl = await carnetGenerator.previewCarnet({
        participant: previewParticipant,
        carnetData,
        templateImage: carnetTemplateImage,
        isPreview: true,
        qrDataURL, // Pass the QR code data URL
      });

      setCarnetPreviewUrl(carnetPreviewUrl);
    } catch (err) {
      // Error generating preview
    } finally {
      setIsGeneratingCarnet(false);
    }
  };

  const generatePreview = async () => {
    const generationId = ++currentGenerationRef.current;
    setIsGenerating(true);
    setError("");

    try {
      const generator = new CertificateGenerator();

      // Use selected participant for preview
      const previewParticipant: CertificateParticipant =
        certificateData.participants[selectedParticipantIndex];

      if (!previewParticipant) {
        setError("Participante no válido seleccionado para vista previa");
        return;
      }

      // Check if this generation is still current
      if (generationId !== currentGenerationRef.current) {
        return; // Cancelled by newer generation
      }

      // Fetch all required data in parallel (with caching)
      const { signatures = [], facilitatorData } = await fetchRequiredData();

      // Check again after async operations
      if (generationId !== currentGenerationRef.current) {
        return; // Cancelled by newer generation
      }

      // Get template and seal images
      let templateImage = "/templates/certificado.png";
      const sealImage = "/templates/sello.png";

      // Use active certificate template if available
      if (certificateData.plantilla_certificado_archivo) {
        templateImage = `/templates/${certificateData.plantilla_certificado_archivo.toLowerCase()}`;
      } else if (certificateData.id_plantilla_certificado) {
        // Fallback: try to fetch the template info
        try {
          const { getCertificateTemplatesAction } =
            await import("@/app/actions/dropdown-data");
          const result = await getCertificateTemplatesAction();
          if (result.data) {
            const tmpl = result.data.find(
              (t: any) => t.id === certificateData.id_plantilla_certificado,
            );
            if (tmpl?.archivo) {
              templateImage = `/templates/${tmpl.archivo.toLowerCase()}`;
            }
          }
        } catch {
          // Continue with default
        }
      }

      // Prepare certificate data with SHA and facilitator info (use cached data)
      let certificateDataWithSHA = { ...certificateData };

      // Add SHA signature if not already present (use cached signatures)
      if (!certificateData.sha_signature_id && signatures.length > 0) {
        const activeSHASignature = signatures.find(
          (sig: any) => sig.tipo === "representante_sha" && sig.is_active,
        );
        if (activeSHASignature) {
          certificateDataWithSHA = {
            ...certificateData,
            sha_signature_id: activeSHASignature.id.toString(),
          };
        }
      }

      // Add facilitator data (use cached facilitator)
      if (
        certificateData.facilitator_id &&
        cachedFacilitators.has(certificateData.facilitator_id)
      ) {
        certificateDataWithSHA = {
          ...certificateDataWithSHA,
          facilitator_data: cachedFacilitators.get(
            certificateData.facilitator_id,
          ),
        };
      } else if (facilitatorData) {
        certificateDataWithSHA = {
          ...certificateDataWithSHA,
          facilitator_data: facilitatorData,
        };
      }

      // Add SHA signature data (use cached signatures)
      let shaSignatureBase64 = "";
      if (certificateDataWithSHA.sha_signature_id && signatures.length > 0) {
        const shaSignatures = signatures.filter(
          (sig: any) => sig.tipo === "representante_sha",
        );
        const selectedSHASignature = shaSignatures.find(
          (sig: any) =>
            sig.id.toString() === certificateDataWithSHA.sha_signature_id,
        );
        if (selectedSHASignature) {
          certificateDataWithSHA = {
            ...certificateDataWithSHA,
            sha_signature_data: selectedSHASignature,
          };

          // Preload SHA signature image
          if (selectedSHASignature.url_imagen) {
            shaSignatureBase64 = await preloadImage(
              selectedSHASignature.url_imagen,
            );
          }
        }
      }

      // Preload facilitator signature image
      let facilitatorSignatureBase64 = "";
      if (
        (certificateDataWithSHA.facilitator_data as any)?.signature_data
          ?.imagen_base64
      ) {
        facilitatorSignatureBase64 = `data:image/png;base64,${(certificateDataWithSHA.facilitator_data as any).signature_data.imagen_base64}`;
      } else if ((facilitatorData as any)?.signature_data?.imagen_base64) {
        facilitatorSignatureBase64 = `data:image/png;base64,${(facilitatorData as any).signature_data.imagen_base64}`;
      }
      // Fall back to URL fields if base64 not available
      else {
        const signatureUrl =
          (certificateDataWithSHA.facilitator_data as any)?.signature_data
            ?.url_imagen ||
          (certificateDataWithSHA.facilitator_data as any)?.signature_data
            ?.firma ||
          (facilitatorData as any)?.signature_data?.url_imagen ||
          (facilitatorData as any)?.signature_data?.firma ||
          (certificateDataWithSHA.facilitator_data as any)?.firma; // Legacy fallback

        if (signatureUrl) {
          facilitatorSignatureBase64 = await preloadImage(signatureUrl);
        }
      }

      // Preload template and seal images
      const [templateBase64, sealBase64] = await Promise.all([
        preloadImage(templateImage),
        preloadImage(sealImage),
      ]);

      const blob = await generator.generateCertificate({
        participant: previewParticipant,
        certificateData: certificateDataWithSHA,
        templateImage: templateBase64 || templateImage,
        sealImage: sealBase64 || sealImage,
        isPreview: true,
        paperSize: certificateData.paperSize,
        preloadedAssets: {
          facilitator:
            certificateDataWithSHA.facilitator_data || facilitatorData,
          facilitatorSignature: facilitatorSignatureBase64,
          shaSignature: shaSignatureBase64,
        },
      });

      // Final check before setting state
      if (generationId !== currentGenerationRef.current) {
        return; // Cancelled by newer generation
      }

      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      if (generationId === currentGenerationRef.current) {
        setError(
          "Error al generar la vista previa. Por favor intenta nuevamente.",
        );
      }
    } finally {
      if (generationId === currentGenerationRef.current) {
        setIsGenerating(false);
      }
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
    setSelectedParticipantIndex(0); // Reset to first participant
    setActiveTab("certificate");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 text-gray-900">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <h3 className="text-xl font-bold text-gray-800">Vista Previa</h3>
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
              {selectedCourse?.emite_carnet && (
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
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all rounded-full"
              title="Cerrar vista previa"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === "documents" && (
            <div className="mb-8">
              <div className="flex flex-wrap gap-3">
                {[
                  {
                    id: "certificacion_competencias",
                    label: "Certificación de Competencias",
                  },
                  { id: "nota_entrega", label: "Nota de Entrega" },
                  { id: "validacion_datos", label: "Validación de Datos" },
                ].map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDocType(doc.id)}
                    className={`px-5 py-2.5 text-sm font-bold rounded-full border-2 transition-all ${
                      selectedDocType === doc.id
                        ? "bg-blue-600 text-white border-blue-600 shadow-md transform scale-105"
                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:bg-blue-50/30"
                    }`}
                  >
                    {doc.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab !== "documents" &&
            certificateData.participants.length > 1 && (
              <div className="mb-8 p-4 bg-blue-50/50 rounded-xl border border-blue-100 max-w-2xl">
                <label className="block text-sm font-bold text-blue-900 mb-3 uppercase tracking-wider">
                  Seleccionar Participante
                </label>
                <div className="flex items-center space-x-4">
                  <select
                    value={selectedParticipantIndex}
                    onChange={(e) =>
                      setSelectedParticipantIndex(Number(e.target.value))
                    }
                    className="block w-full px-4 py-2.5 bg-white border border-blue-200 rounded-lg shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-medium text-gray-900 outline-none transition-all"
                  >
                    {certificateData.participants.map((participant, index) => (
                      <option key={participant.id || index} value={index}>
                        {participant.name} ({participant.idNumber})
                      </option>
                    ))}
                  </select>
                  <div className="flex-shrink-0 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-bold text-sm shadow-sm">
                    {selectedParticipantIndex + 1} /{" "}
                    {certificateData.participants.length}
                  </div>
                </div>
              </div>
            )}

          {(isGenerating || isGeneratingCarnet || isGeneratingDocuments) && (
            <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
              <RefreshCw className="animate-spin h-12 w-12 text-blue-600 mb-4" />
              <p className="text-lg font-bold text-gray-600 animate-pulse">
                Generando vista previa...
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Esto puede tomar unos segundos
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-8 flex items-start space-x-4 shadow-sm">
              <div className="bg-red-100 p-2 rounded-lg">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-red-800 font-bold mb-1">Hubo un problema</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          {!isGenerating &&
            !isGeneratingCarnet &&
            !isGeneratingDocuments &&
            !error && (
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
                        <p className="text-sm text-gray-400">
                          Selecciona otro tipo de documento
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col space-y-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          Documento
                        </p>
                        <p className="text-lg font-black text-blue-600">
                          {activeTab === "carnet" ? "Carnet" : "Certificado"}
                        </p>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col space-y-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          Participante
                        </p>
                        <p className="text-lg font-black text-gray-800 truncate">
                          {
                            certificateData.participants[
                              selectedParticipantIndex
                            ]?.name
                          }
                        </p>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col space-y-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          Identificación
                        </p>
                        <p className="text-lg font-black text-gray-800">
                          <span className="text-blue-500 mr-1">
                            {certificateData.participants[
                              selectedParticipantIndex
                            ]?.nationality === "extranjero"
                              ? "E-"
                              : "V-"}
                          </span>
                          {
                            certificateData.participants[
                              selectedParticipantIndex
                            ]?.idNumber
                          }
                        </p>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50 shadow-inner p-4">
                      {(() => {
                        const url =
                          activeTab === "carnet"
                            ? carnetPreviewUrl
                            : previewUrl;
                        if (!url)
                          return (
                            <div className="flex flex-col items-center justify-center py-40 text-gray-400">
                              <RefreshCw className="animate-spin h-10 w-10 mb-4 text-blue-200" />
                              <p className="font-bold">
                                Preparando vista previa...
                              </p>
                            </div>
                          );

                        return (
                          <object
                            data={url}
                            type="application/pdf"
                            className={`w-full rounded-lg ${activeTab === "carnet" ? "h-[350px]" : "h-[550px]"}`}
                            aria-label={`${activeTab === "carnet" ? "Carnet" : "Certificate"} Preview`}
                          >
                            <div className="p-20 text-gray-500 text-center bg-white rounded-lg border-2 border-dashed border-gray-100">
                              <FileText className="mx-auto h-16 w-12 text-gray-100 mb-6" />
                              <p className="text-lg font-bold mb-3">
                                La visualización no es compatible
                              </p>
                              <p className="text-sm text-gray-400 mb-8 max-w-sm mx-auto">
                                Tu navegador no puede mostrar el PDF
                                directamente en esta ventana.
                              </p>
                              <a
                                href={url}
                                download={`${activeTab === "carnet" ? "carnet" : "certificado"}-preview.pdf`}
                                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all hover:translate-y-[-2px] active:translate-y-0"
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
                    {activeTab !== "documents" &&
                    certificateData.participants.length > 1 ? (
                      <>
                        <ChevronRight className="w-5 h-5 text-blue-400 mr-2" />
                        <p className="text-sm font-medium italic">
                          Puedes navegar entre participantes usando el selector
                          superior o el botón siguiente
                        </p>
                      </>
                    ) : activeTab === "documents" ? (
                      <>
                        <ChevronRight className="w-5 h-5 text-blue-400 mr-2" />
                        <p className="text-sm font-medium italic">
                          Esta vista previa incluye todos los participantes del
                          curso para esta OSI
                        </p>
                      </>
                    ) : null}
                  </div>
                  <div className="flex space-x-4 w-full md:w-auto">
                    {activeTab !== "documents" &&
                      certificateData.participants.length > 1 && (
                        <button
                          onClick={() =>
                            setSelectedParticipantIndex((prev) =>
                              prev === certificateData.participants.length - 1
                                ? 0
                                : prev + 1,
                            )
                          }
                          className="flex-1 md:flex-none px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all active:scale-95"
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
                            : generatePreview
                      }
                      className="flex-1 md:flex-none px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all hover:scale-105 active:scale-95"
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
};
