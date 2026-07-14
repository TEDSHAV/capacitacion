"use client";

import { CertificateGenerator } from "@/lib/certificate-generator";
import { CertificateGeneration, CertificateParticipant } from "@/types";
import { useState, useEffect } from "react";

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

  useEffect(() => {
    if (isOpen && certificateData.participants.length > 0) {
      generatePreview();
    }
  }, [isOpen, certificateData]);

  const generatePreview = async () => {
    setIsGenerating(true);
    setError("");

    try {
      const generator = new CertificateGenerator();
      
      // Use the first participant for preview
      const previewParticipant: CertificateParticipant = certificateData.participants[0];
      
      // Get template and seal images
      const templateImage = "/templates/certificado.png";
      const sealImage = "/templates/sello.png";

      // Fetch active SHA signature if not already in certificateData
      let certificateDataWithSHA = { ...certificateData };
      if (!certificateData.sha_signature_id) {
        try {
          const signaturesResponse = await fetch("/api/signatures");
          if (signaturesResponse.ok) {
            const signatures = await signaturesResponse.json();
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
          console.warn("Could not fetch SHA signature for preview:", error);
        }
      }

      const blob = await generator.generateCertificate({
        participant: previewParticipant,
        certificateData: certificateDataWithSHA,
        templateImage,
        sealImage,
      });

      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      console.error("Error generating preview:", err);
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
                <p>Vista previa para: <strong>{certificateData.participants[0]?.name}</strong></p>
                {certificateData.horas_estimadas && (
                  <p className="text-blue-600">
                    Duración del curso: {certificateData.horas_estimadas} horas
                  </p>
                )}
                {certificateData.participants.length > 1 && (
                  <p className="text-blue-600">
                    Nota: Esta es una vista previa del primer participante. Se generarán {certificateData.participants.length} certificados en total.
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

              <div className="flex justify-end space-x-3">
                <button
                  onClick={generatePreview}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Actualizar Vista Previa
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
