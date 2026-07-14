'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CertificateQRCode } from '@/components/ui/qr-code';
import { QRService } from '@/lib/qr-service';
import { ControlNumbers } from '@/types/qr-code';

interface CertificateDetails {
  id: number;
  participantName: string;
  courseName: string;
  issueDate: string;
  expirationDate?: string;
  controlNumbers: ControlNumbers;
}

export default function CertificateVerificationPage() {
  const params = useParams();
  const certificateId = params.certificateId as string;
  
  const [certificate, setCertificate] = useState<CertificateDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    const verifyCertificate = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Verify certificate and get details
        const response = await fetch(`/api/verify-certificate/${certificateId}`);
        const data = await response.json();

        if (!response.ok || !data.isValid) {
          setError(data.error || 'Certificate not found or invalid');
          return;
        }

        setCertificate(data.certificate);

        // Generate PDF URL
        const pdfResponse = await fetch(`/api/generate-certificate-pdf/${certificateId}`);
        if (pdfResponse.ok) {
          const pdfBlob = await pdfResponse.blob();
          const pdfObjectUrl = URL.createObjectURL(pdfBlob);
          setPdfUrl(pdfObjectUrl);
        } else {
          setError('Failed to generate certificate PDF');
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verification failed');
      } finally {
        setIsLoading(false);
      }
    };

    if (certificateId) {
      verifyCertificate();
    }

    // Cleanup PDF URL on unmount
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [certificateId]); // Remove pdfUrl from dependencies to prevent infinite loop

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying certificate...</p>
        </div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Certificate Not Found</h1>
            <p className="text-gray-600">{error || 'This certificate could not be verified.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const qrData = QRService.generateQRData(certificate.id, certificate.controlNumbers);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Certificate Verification</h1>
              <p className="text-blue-100 text-sm">This certificate has been verified as authentic</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span className="text-green-100 font-semibold">Verified Authentic</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar with certificate info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Certificate Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Certificate ID</label>
                    <p className="text-lg font-mono text-gray-900">#{certificate.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Participant</label>
                    <p className="text-sm text-gray-900">{certificate.participantName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Course</label>
                    <p className="text-sm text-gray-900">{certificate.courseName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Issue Date</label>
                    <p className="text-sm text-gray-900">{new Date(certificate.issueDate).toLocaleDateString()}</p>
                  </div>
                  {certificate.expirationDate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Expiration Date</label>
                      <p className="text-sm text-gray-900">{new Date(certificate.expirationDate).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Control Numbers</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Book</label>
                    <p className="font-mono text-gray-900">{certificate.controlNumbers.nro_libro}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Sheet</label>
                    <p className="font-mono text-gray-900">{certificate.controlNumbers.nro_hoja}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Line</label>
                    <p className="font-mono text-gray-900">{certificate.controlNumbers.nro_linea}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Control</label>
                    <p className="font-mono text-gray-900">{certificate.controlNumbers.nro_control}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">QR Code</h4>
                <div className="flex justify-center">
                  <CertificateQRCode
                    data={qrData}
                    size={150}
                    showLabel={true}
                    label="Scan to verify"
                  />
                </div>
              </div>

              {pdfUrl && (
                <div>
                  <a
                    href={pdfUrl}
                    download={`certificate-${certificate.id}.pdf`}
                    className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Download Certificate
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Main content - Certificate PDF */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Certificate Document</h3>
              {pdfUrl ? (
                <div className="w-full h-[800px]">
                  <iframe
                    src={pdfUrl}
                    className="w-full h-full border border-gray-300 rounded"
                    title="Certificate PDF"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading certificate...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>This certificate was issued by the training management system and is digitally verifiable.</p>
          <p className="mt-1">Verification performed on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
}
