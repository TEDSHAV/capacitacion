'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CertificateQRCode } from '@/components/ui/qr-code';
import { QRService } from '@/lib/qr-service';
import { ControlNumbers, Carnet } from '@/types';

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
  const [carnets, setCarnets] = useState<Carnet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [carnetPdfUrls, setCarnetPdfUrls] = useState<{ [key: number]: string }>({});

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

        // Fetch carnets for this certificate
        const carnetsResponse = await fetch(`/api/carnets/by-certificate/${certificateId}`);
        if (carnetsResponse.ok) {
          const carnetsData = await carnetsResponse.json();
          if (carnetsData.success && carnetsData.data) {
            setCarnets(carnetsData.data);
            
            // Generate PDF URLs for carnets
            const carnetPdfPromises = carnetsData.data.map(async (carnet: Carnet) => {
              try {
                console.log('🔄 Generating carnet PDF for carnet ID:', carnet.id);
                const pdfResponse = await fetch(`/api/generate-carnet-pdf/${carnet.id}`);
                if (pdfResponse.ok) {
                  const pdfBlob = await pdfResponse.blob();
                  console.log('✅ Carne PDF generated for carnet ID:', carnet.id);
                  return { carnetId: carnet.id, url: URL.createObjectURL(pdfBlob) };
                } else {
                  console.error('❌ Failed to generate carnet PDF:', carnet.id, pdfResponse.status);
                  const errorText = await pdfResponse.text();
                  console.error('Error details:', errorText);
                  return null;
                }
              } catch (error) {
                console.error('💥 Error generating carnet PDF for carnet ID:', carnet.id, error);
                return null;
              }
            });

            const carnetPdfResults = await Promise.all(carnetPdfPromises);
            const pdfUrls: { [key: number]: string } = {};
            carnetPdfResults.forEach(result => {
              if (result) {
                pdfUrls[result.carnetId] = result.url;
              }
            });
            setCarnetPdfUrls(pdfUrls);
          }
        }

        // Generate certificate PDF URL
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

    // Cleanup URLs on unmount
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      Object.values(carnetPdfUrls).forEach(url => URL.revokeObjectURL(url));
    };
  }, [certificateId]); // Remove pdfUrl and carnetPdfUrls from dependencies

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando certificado...</p>
        </div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">No se ha encontrado el certificado</h1>
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
              <h1 className="text-2xl font-bold text-white">Verificación de Certificados </h1>
              <p className="text-blue-100 text-sm">Este certificado ha sido marcado como auténtico</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span className="text-green-100 font-semibold">Verificado</span>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalles del Certificado</h3>
                <div className="space-y-3">
               
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Participante</label>
                    <p className="text-sm text-gray-900">{certificate.participantName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Curso</label>
                    <p className="text-sm text-gray-900">{certificate.courseName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Fecha de Emisión</label>
                    <p className="text-sm text-gray-900">{new Date(certificate.issueDate).toLocaleDateString()}</p>
                  </div>
                  {certificate.expirationDate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Fecha de Vencimiento</label>
                      <p className="text-sm text-gray-900">{new Date(certificate.expirationDate).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Números de Control</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Libro</label>
                    <p className="font-mono text-gray-900">{certificate.controlNumbers.nro_libro}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Hoja</label>
                    <p className="font-mono text-gray-900">{certificate.controlNumbers.nro_hoja}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Línea</label>
                    <p className="font-mono text-gray-900">{certificate.controlNumbers.nro_linea}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Control</label>
                    <p className="font-mono text-gray-900">{certificate.controlNumbers.nro_control}</p>
                  </div>
                </div>
              </div>

              

              {pdfUrl && (
                <div>
                  <a
                    href={pdfUrl}
                    download={`certificate-${certificate.id}.pdf`}
                    className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Descargar Certificado
                  </a>
                </div>
              )}

              {/* Carnets Section */}
              {carnets.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Carnets Disponibles</h4>
                  <div className="space-y-2">
                    {carnets.map((carnet) => (
                      <div key={carnet.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            Carnet #{carnet.id}
                          </span>
                          {carnet.fecha_vencimiento && (
                            <span className="text-xs text-gray-500">
                              Vence: {new Date(carnet.fecha_vencimiento).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {carnetPdfUrls[carnet.id] && (
                          <a
                            href={carnetPdfUrls[carnet.id]}
                            download={`carnet-${carnet.id}.pdf`}
                            className="block w-full bg-green-600 text-white text-center py-1 px-2 rounded text-sm hover:bg-green-700 transition-colors"
                          >
                            Descargar Carnet
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main content - Certificate PDF and Carnets */}
          <div className="lg:col-span-3">
            {/* Certificate Section */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Certificado</h3>
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

            {/* Carnets Section */}
            {carnets.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Carnets</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {carnets.map((carnet) => (
                    <div key={carnet.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Carnet #{carnet.id}</h4>
                        {carnet.fecha_vencimiento && (
                          <span className="text-xs text-gray-500">
                            Vence: {new Date(carnet.fecha_vencimiento).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500">Participante</label>
                          <p className="text-sm text-gray-900">{carnet.nombre_participante}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">Cédula</label>
                          <p className="text-sm text-gray-900">{carnet.cedula_participante}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">Curso</label>
                          <p className="text-sm text-gray-900">{carnet.titulo_curso}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">Emisión</label>
                          <p className="text-sm text-gray-900">{new Date(carnet.fecha_emision).toLocaleDateString()}</p>
                        </div>
                      </div>

                      {carnetPdfUrls[carnet.id] ? (
                        <div className="w-full h-[200px] mb-3">
                          <iframe
                            src={carnetPdfUrls[carnet.id]}
                            className="w-full h-full border border-gray-300 rounded"
                            title={`Carnet ${carnet.id} PDF`}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg mb-3">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto mb-2"></div>
                            <p className="text-sm text-gray-600">Loading carnet...</p>
                          </div>
                        </div>
                      )}

                      {carnetPdfUrls[carnet.id] && (
                        <a
                          href={carnetPdfUrls[carnet.id]}
                          download={`carnet-${carnet.id}.pdf`}
                          className="block w-full bg-green-600 text-white text-center py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                        >
                          Descargar Carnet
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Este certificado fue emitido por el sistema de gestión de capacitación y es digitalmente verificable.</p>
          <p className="mt-1">Verificación realizada el {new Date().toLocaleDateString()} a las {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
}
