"use client";

import { CertificateGenerator } from "@/lib/certificate-generator";
import { CertificateGeneration, CertificateParticipant } from "@/types";
import { useState, useEffect } from "react";
import { getSignaturesForDropdownAction } from "../../../../../actions/dropdown-data";

interface CertificatePreviewProps {
  certificateData: CertificateGeneration;
  selectedOSI: any;
  isOpen: boolean;
  onClose: () => void;
}

export const CertificatePreview = ({
  certificateData,
  isOpen,
  onClose,
}: CertificatePreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>("");
  const [selectedParticipantIndex, setSelectedParticipantIndex] = useState(0);

  useEffect(() => {
    if (isOpen && certificateData.participants.length > 0) {
      generatePreview();
    }
  }, [isOpen, certificateData, selectedParticipantIndex]);

  const generatePreview = async () => {
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
      
      // Get template and seal images
      let templateImage = "/templates/certificado.png";
      let sealImage = "/templates/sello.png";

      // Get actual template if available
      if (certificateData.id_plantilla_certificado) {
        try {
          const templatesResult = await getSignaturesForDropdownAction();
          if (templatesResult.data) {
            // Find certificate templates from the signatures result
            const certificateTemplates = templatesResult.data.filter((sig: any) => sig.tipo === 'plantilla_certificado');
            const selectedTemplate = certificateTemplates.find((tmpl: any) => tmpl.id === certificateData.id_plantilla_certificado);
            if (selectedTemplate?.url_imagen) {
              templateImage = selectedTemplate.url_imagen;
            }
          }
        } catch (error) {
          // Could not fetch template for preview
        }
      }

      // Fetch active SHA signature if not already in certificateData
      let certificateDataWithSHA = { ...certificateData };
      if (!certificateData.sha_signature_id) {
        try {
          const signaturesResult = await getSignaturesForDropdownAction();
          if (signaturesResult.data) {
            const signatures = signaturesResult.data;
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
        } catch (error) {
          // Could not fetch SHA signature for preview
        }
      }

      // Fetch facilitator data for preview
      if (certificateDataWithSHA.facilitator_id) {
        try {
          const { getFacilitatorData } = await import("../../../../../actions/facilitators");
          const facilitatorData = await getFacilitatorData(certificateDataWithSHA.facilitator_id);
          if (facilitatorData) {
            certificateDataWithSHA = {
              ...certificateDataWithSHA,
              facilitator_data: facilitatorData
            };
            console.log('Fetched facilitator data for preview:', facilitatorData);
          }
        } catch (error) {
          console.error('Could not fetch facilitator for preview:', error);
        }
      }

      // Fetch SHA signature data for preview
      if (certificateDataWithSHA.sha_signature_id) {
        try {
          const signaturesResult = await getSignaturesForDropdownAction();
          if (signaturesResult.data) {
            const shaSignatures = signaturesResult.data.filter((sig: any) => sig.tipo === 'representante_sha');
            const selectedSHASignature = shaSignatures.find((sig: any) => sig.id.toString() === certificateDataWithSHA.sha_signature_id);
            if (selectedSHASignature) {
              certificateDataWithSHA = {
                ...certificateDataWithSHA,
                sha_signature_data: selectedSHASignature
              };
              console.log('Fetched SHA signature for preview:', selectedSHASignature);
            }
          }
        } catch (error) {
          console.error('Could not fetch SHA signature for preview:', error);
        }
      }

      const blob = await generator.generateCertificate({
        participant: previewParticipant,
        certificateData: certificateDataWithSHA,
        templateImage,
        sealImage,
        isPreview: true
      });

      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      setError("Error al generar la vista previa. Por favor intenta nuevamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }
    setSelectedParticipantIndex(0); // Reset to first participant
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Vista Previa del Certificado
          </h3>
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

        <div className="p-6">
          {/* Participant Selection */}
          {certificateData.participants.length > 1 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Participante para Vista Previa:
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

          {isGenerating && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Generando vista previa...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {previewUrl && !isGenerating && !error && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <p>Vista previa para: <strong>{certificateData.participants[selectedParticipantIndex]?.name}</strong></p>
                <p className="text-blue-600">
                  Cédula: {certificateData.participants[selectedParticipantIndex]?.id_number}
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
                <iframe
                  src={previewUrl}
                  className="w-full h-[600px]"
                  title="Certificate Preview"
                />
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
                    onClick={generatePreview}
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
