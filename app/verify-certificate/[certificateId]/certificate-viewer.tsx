"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ControlNumbers, Carnet } from "@/types";

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

  const [certificate, setCertificate] = useState<CertificateDetails | null>(
    null,
  );
  const [carnets, setCarnets] = useState<Carnet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfReady, setPdfReady] = useState(false);
  const [carnetPdfReady, setCarnetPdfReady] = useState<{
    [key: number]: boolean;
  }>({});

  useEffect(() => {
    const verifyCertificate = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `/api/verify-certificate/${certificateId}`,
        );
        const data = await response.json();

        if (!response.ok || !data.isValid) {
          setError(data.error || "Certificate not found or invalid");
          return;
        }

        setCertificate(data.certificate);
        setPdfReady(true);

        // Fetch carnets for this certificate
        const carnetsResponse = await fetch(
          `/api/carnets/by-certificate/${certificateId}`,
        );
        if (carnetsResponse.ok) {
          const carnetsData = await carnetsResponse.json();
          if (carnetsData.success && carnetsData.data) {
            setCarnets(carnetsData.data);
            const ready: { [key: number]: boolean } = {};
            carnetsData.data.forEach((c: Carnet) => {
              ready[c.id] = true;
            });
            setCarnetPdfReady(ready);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Verification failed");
      } finally {
        setIsLoading(false);
      }
    };

    if (certificateId) {
      verifyCertificate();
    }
  }, [certificateId]);

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
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              No se ha encontrado el certificado
            </h1>
            <p className="text-gray-600">
              {error || "This certificate could not be verified."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const certPdfUrl = `/api/generate-certificate-pdf/${certificateId}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                Verificación de Certificados
              </h1>
              <p className="text-blue-100 text-sm">
                Este certificado ha sido marcado como auténtico
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span className="text-green-100 font-semibold">Verificado</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Certificate Section */}
        {pdfReady && (
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
            {/* Sidebar — details + download */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-6 space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Detalles del Certificado
                </h3>
                <div>
                  <label className="block text-xs font-medium text-gray-500">
                    Participante
                  </label>
                  <p className="text-sm text-gray-900">
                    {certificate.participantName}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">
                    Curso
                  </label>
                  <p className="text-sm text-gray-900">
                    {certificate.courseName}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">
                    Fecha de Emisión
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date(certificate.issueDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">
                    Libro
                  </label>
                  <p className="text-sm text-gray-900">
                    {certificate.controlNumbers.nro_libro}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">
                    Hoja
                  </label>
                  <p className="text-sm text-gray-900">
                    {certificate.controlNumbers.nro_hoja}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">
                    Línea
                  </label>
                  <p className="text-sm text-gray-900">
                    {certificate.controlNumbers.nro_linea}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">
                    Control
                  </label>
                  <p className="text-sm text-gray-900">
                    {certificate.controlNumbers.nro_control}
                  </p>
                </div>
                <div className="pt-2">
                  <a
                    href={certPdfUrl}
                    className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Ver / Descargar Certificado
                  </a>
                </div>
              </div>
            </div>

            {/* PDF viewer — all screen sizes */}
            <div className="lg:col-span-4">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Certificado
                </h3>
                <object
                  data={`${certPdfUrl}#view=FitH&toolbar=0`}
                  type="application/pdf"
                  className="w-full border border-gray-300 rounded"
                  style={{ minHeight: "70vh" }}
                >
                  <div className="flex flex-col items-center justify-center py-12 space-y-4 bg-gray-50 rounded">
                    <p className="text-gray-600 text-sm text-center px-4">
                      Tu dispositivo no puede previsualizar el PDF directamente.
                    </p>
                    <a
                      href={certPdfUrl}
                      className="bg-blue-600 text-white text-center py-3 px-6 rounded-md hover:bg-blue-700 transition-colors font-medium"
                    >
                      Abrir Certificado PDF
                    </a>
                  </div>
                </object>
              </div>
            </div>
          </div>
        )}

        {/* Carnets Section */}
        {carnets.length > 0 && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-6 gap-6">
            {/* Sidebar — carnet details + download */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Detalles del Carnet
                </h3>
                {carnets.map((carnet, index) => {
                  const isExpired = carnet.fecha_vencimiento
                    ? new Date(carnet.fecha_vencimiento) < new Date()
                    : false;
                  return (
                    <div
                      key={carnet.id}
                      className={`border rounded-lg p-4 ${index > 0 ? "mt-2" : ""} ${isExpired ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">
                          Carnet #{carnet.id}
                        </h4>
                        {isExpired && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-600 text-white">
                            VENCIDO
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-500">
                            Participante
                          </label>
                          <p className="text-sm text-gray-900">
                            {carnet.nombre_participante}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">
                            Cédula
                          </label>
                          <p className="text-sm text-gray-900">
                            {carnet.cedula_participante}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">
                            Curso
                          </label>
                          <p className="text-sm text-gray-900">
                            {carnet.titulo_curso}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">
                            Emisión
                          </label>
                          <p className="text-sm text-gray-900">
                            {new Date(
                              carnet.fecha_emision + "T12:00:00",
                            ).toLocaleDateString("es-VE")}
                          </p>
                        </div>
                        {carnet.fecha_vencimiento && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500">
                              Vencimiento
                            </label>
                            <p
                              className={`text-sm font-medium ${isExpired ? "text-red-700" : "text-gray-900"}`}
                            >
                              {new Date(
                                carnet.fecha_vencimiento + "T12:00:00",
                              ).toLocaleDateString("es-VE")}
                            </p>
                          </div>
                        )}
                      </div>
                      {carnetPdfReady[carnet.id] && (
                        <div className="mt-3">
                          <a
                            href={`/api/generate-carnet-pdf/${carnet.id}`}
                            className="block w-full bg-green-600 text-white text-center py-2 px-4 rounded-md hover:bg-green-700 transition-colors text-sm"
                          >
                            Ver / Descargar Carnet
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Carnet PDF viewer — all screen sizes */}
            <div className="lg:col-span-4">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Vista del Carnet
                </h3>
                <div className="space-y-6">
                  {carnets.map((carnet) => (
                    <div
                      key={carnet.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">
                          Carnet #{carnet.id}
                        </h4>
                        {(() => {
                          const exp = carnet.fecha_vencimiento
                            ? new Date(carnet.fecha_vencimiento) < new Date()
                            : false;
                          return carnet.fecha_vencimiento ? (
                            <span
                              className={`text-xs font-medium ${exp ? "text-red-600" : "text-gray-500"}`}
                            >
                              {exp ? "⚠ VENCIDO – " : "Vence: "}
                              {new Date(
                                carnet.fecha_vencimiento + "T12:00:00",
                              ).toLocaleDateString("es-VE")}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <object
                        data={`/api/generate-carnet-pdf/${carnet.id}#view=FitH&toolbar=0`}
                        type="application/pdf"
                        className="w-full border border-gray-300 rounded"
                        style={{ minHeight: "50vh" }}
                      >
                        <div className="flex flex-col items-center justify-center py-10 space-y-3 bg-gray-50 rounded">
                          <p className="text-gray-600 text-sm text-center px-4">
                            Tu dispositivo no puede previsualizar el PDF.
                          </p>
                          <a
                            href={`/api/generate-carnet-pdf/${carnet.id}`}
                            className="bg-green-600 text-white text-center py-2 px-5 rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            Abrir Carnet PDF
                          </a>
                        </div>
                      </object>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Este certificado fue emitido por el sistema de gestión de
            capacitación y es digitalmente verificable.
          </p>
          <p className="mt-1">
            Verificación realizada el {new Date().toLocaleDateString()} a las{" "}
            {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}
