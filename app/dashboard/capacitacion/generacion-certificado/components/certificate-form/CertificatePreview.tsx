"use client";

import { CertificateGenerator } from "@/lib/certificate-generator";
import { CarnetGenerator } from "@/lib/carnet-generator";
import { CertificateGeneration, CertificateParticipant } from "@/types";
import { useState, useEffect, useCallback, useRef } from "react";
import { getSignaturesForDropdownAction } from "@/app/actions/dropdown-data";
import { QRService } from "@/lib/qr-service";

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
  selectedCourse
}: CertificatePreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [carnetPreviewUrl, setCarnetPreviewUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingCarnet, setIsGeneratingCarnet] = useState(false);
  const [error, setError] = useState<string>("");
  const [selectedParticipantIndex, setSelectedParticipantIndex] = useState(0);
  const [showCarnet, setShowCarnet] = useState(false);
  const [cachedSignatures, setCachedSignatures] = useState<any[]>([]);
  const [cachedFacilitators, setCachedFacilitators] = useState<Map<string, any>>(new Map());
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentGenerationRef = useRef<number>(0); // Track current generation to avoid race conditions

  // Debounced preview generation
  const debouncedGeneratePreview = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      generatePreview();
      if (selectedCourse?.emite_carnet) {
        generateCarnetPreview();
      }
    }, 300); // 300ms debounce
  }, [certificateData, selectedParticipantIndex, selectedCourse]);

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

  // Cache and fetch all required data in parallel
  const fetchRequiredData = async () => {
    const promises: Promise<any>[] = [];
    
    // Fetch signatures if not cached
    if (cachedSignatures.length === 0) {
      promises.push(
        getSignaturesForDropdownAction().then(result => {
          if (result.data) {
            setCachedSignatures(result.data);
            return { signatures: result.data };
          }
          return { signatures: [] };
        })
      );
    }
    
    // Fetch facilitator data if not cached
    if (certificateData.facilitator_id && !cachedFacilitators.has(certificateData.facilitator_id)) {
      promises.push(
        import("@/app/actions/facilitators").then(({ getFacilitatorData }) =>
          getFacilitatorData(certificateData.facilitator_id!).then(facilitatorData => {
            if (facilitatorData) {
              setCachedFacilitators(prev => new Map(prev.set(certificateData.facilitator_id!, facilitatorData)));
              return { facilitatorData };
            }
            return { facilitatorData: null };
          })
        )
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
      const previewParticipant: CertificateParticipant = certificateData.participants[selectedParticipantIndex];
      
      if (!previewParticipant) {
        console.error('Participante no válido seleccionado para vista previa de carnet');
        return;
      }

      // Create carnet data for preview
      const carnetData = {
        id_certificado: 0, // Preview certificate ID
        id_participante: typeof previewParticipant.id === 'string' ? parseInt(previewParticipant.id) : (previewParticipant.id || 0),
        id_empresa: null,
        id_curso: selectedCourse?.id || 0,
        id_osi: certificateData.osi_id ? parseInt(certificateData.osi_id) : 0,
        titulo_curso: certificateData.certificate_title,
        fecha_emision: certificateData.date,
        fecha_vencimiento: certificateData.fecha_vencimiento || null,
        nombre_participante: previewParticipant.name,
        cedula_participante: previewParticipant.id_number,
        empresa_participante: previewParticipant.company || '',
        nro_control: 12345, // Placeholder control number for preview
        qr_code: undefined // Preview doesn't need QR code
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
          level: 'M',
          includeMargin: true
        });
        console.log('✅ QR code generated for carnet preview');
      } catch (qrError) {
        console.warn('⚠️ Could not generate QR code for carnet preview:', qrError);
        // Continue without QR code - carnet generator will use placeholder
      }

      const carnetPreviewUrl = await carnetGenerator.previewCarnet({
        participant: previewParticipant,
        carnetData,
        templateImage: '/templates/carnet.png', // Always use default template for preview
        isPreview: true,
        qrDataURL // Pass the QR code data URL
      });
      
      setCarnetPreviewUrl(carnetPreviewUrl);
    } catch (err) {
      console.error('Error generating carnet preview:', err);
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
      const previewParticipant: CertificateParticipant = certificateData.participants[selectedParticipantIndex];
      
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
      let sealImage = "/templates/sello.png";

      // Get actual template if available (use cached signatures)
      if (certificateData.id_plantilla_certificado && signatures.length > 0) {
        const certificateTemplates = signatures.filter((sig: any) => sig.tipo === 'plantilla_certificado');
        const selectedTemplate = certificateTemplates.find((tmpl: any) => tmpl.id === certificateData.id_plantilla_certificado);
        if (selectedTemplate?.url_imagen) {
          templateImage = selectedTemplate.url_imagen;
        }
      }

      // Prepare certificate data with SHA and facilitator info (use cached data)
      let certificateDataWithSHA = { ...certificateData };
      
      // Add SHA signature if not already present (use cached signatures)
      if (!certificateData.sha_signature_id && signatures.length > 0) {
        const activeSHASignature = signatures.find((sig: any) => 
          sig.tipo === 'representante_sha' && sig.is_active
        );
        if (activeSHASignature) {
          certificateDataWithSHA = {
            ...certificateData,
            sha_signature_id: activeSHASignature.id.toString()
          };
        }
      }

      // Add facilitator data (use cached facilitator)
      if (certificateData.facilitator_id && cachedFacilitators.has(certificateData.facilitator_id)) {
        certificateDataWithSHA = {
          ...certificateDataWithSHA,
          facilitator_data: cachedFacilitators.get(certificateData.facilitator_id)
        };
      } else if (facilitatorData) {
        certificateDataWithSHA = {
          ...certificateDataWithSHA,
          facilitator_data: facilitatorData
        };
      }

      // Add SHA signature data (use cached signatures)
      if (certificateDataWithSHA.sha_signature_id && signatures.length > 0) {
        const shaSignatures = signatures.filter((sig: any) => sig.tipo === 'representante_sha');
        const selectedSHASignature = shaSignatures.find((sig: any) => sig.id.toString() === certificateDataWithSHA.sha_signature_id);
        if (selectedSHASignature) {
          certificateDataWithSHA = {
            ...certificateDataWithSHA,
            sha_signature_data: selectedSHASignature
          };
        }
      }

      const blob = await generator.generateCertificate({
        participant: previewParticipant,
        certificateData: certificateDataWithSHA,
        templateImage,
        sealImage,
        isPreview: true
      });

      // Final check before setting state
      if (generationId !== currentGenerationRef.current) {
        return; // Cancelled by newer generation
      }

      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      if (generationId === currentGenerationRef.current) {
        setError("Error al generar la vista previa. Por favor intenta nuevamente.");
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
    setShowCarnet(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">
            Vista Previa del Certificado{selectedCourse?.emite_carnet ? ' y Carnet' : ''}
          </h3>
          <div className="flex items-center space-x-4">
            {selectedCourse?.emite_carnet && (
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setShowCarnet(false)}
                  className={`mx-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    !showCarnet
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Certificado
                </button>
                <button
                  onClick={() => setShowCarnet(true)}
                  className={`mx-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    showCarnet
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Carnet
                </button>
              </div>
            )}
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
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
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {certificateData.participants.length > 1 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Participante:
              </label>
              <div className="flex items-center space-x-4">
                <select
                  value={selectedParticipantIndex}
                  onChange={(e) => setSelectedParticipantIndex(Number(e.target.value))}
                  className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {certificateData.participants.map((participant, index) => (
                    <option key={participant.id || index} value={index}>
                      {participant.name} ({participant.id_number})
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-500">
                  {selectedParticipantIndex + 1} de {certificateData.participants.length}
                </span>
              </div>
            </div>
          )}

          {(isGenerating || (showCarnet && isGeneratingCarnet)) && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">
                {showCarnet ? 'Generando vista previa del carnet...' : 'Generando vista previa...'}
              </span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {((showCarnet ? carnetPreviewUrl : previewUrl) && !(isGenerating || (showCarnet && isGeneratingCarnet)) && !error) && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <p>Vista previa de: <strong>{showCarnet ? 'Carnet' : 'Certificado'}</strong></p>
                <p>Para: <strong>{certificateData.participants[selectedParticipantIndex]?.name}</strong></p>
                <p className="text-blue-600">
                  {certificateData.participants[selectedParticipantIndex]?.nationality === 'extranjero' ? 'Pasaporte' : 'Cédula'}: {certificateData.participants[selectedParticipantIndex]?.id_number}
                </p>
                {certificateData.horas_estimadas && (
                  <p className="text-blue-600">
                    Duración del curso: {certificateData.horas_estimadas} horas
                  </p>
                )}
                {certificateData.participants.length > 1 && (
                  <p className="text-green-600">
                    Mostrando vista previa del participante {selectedParticipantIndex + 1} de {certificateData.participants.length}
                  </p>
                )}
              </div>
              
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <object
                  data={showCarnet ? carnetPreviewUrl : previewUrl}
                  type="application/pdf"
                  className={`w-full ${showCarnet ? 'h-[300px]' : 'h-[400px]'}`}
                  aria-label={`${showCarnet ? 'Carnet' : 'Certificate'} Preview`}
                >
                  <div className="p-4 text-sm text-gray-600 text-center">
                    <p className="mb-2">No se puede mostrar la vista previa del PDF en este navegador.</p>
                    <a
                      href={showCarnet ? carnetPreviewUrl : previewUrl}
                      download={`${showCarnet ? 'carnet' : 'certificado'}-preview.pdf`}
                      className="text-blue-600 underline"
                    >
                      Descargar PDF para visualizar
                    </a>
                  </div>
                </object>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  {certificateData.participants.length > 1 && (
                    <p>Puedes seleccionar cualquier participante para previsualizar su certificado</p>
                  )}
                </div>
                <div className="flex space-x-3">
                  {certificateData.participants.length > 1 && (
                    <button
                      onClick={() => setSelectedParticipantIndex((prev) => 
                        prev === certificateData.participants.length - 1 ? 0 : prev + 1
                      )}
                      className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                    >
                      Siguiente Participante →
                    </button>
                  )}
                  <button
                    onClick={showCarnet ? generateCarnetPreview : generatePreview}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
