"use client";

import { useState, useEffect } from "react";
import { CarnetRelationships, Carnet, CertificateManagement } from "@/types";

interface OSIRelationshipsProps {
  osiId: number;
  className?: string;
}

export function OSIRelationships({
  osiId,
  className = "",
}: OSIRelationshipsProps) {
  const [relationships, setRelationships] =
    useState<CarnetRelationships | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    certificates: true,
    carnets: true,
    participants: false,
    companies: false,
    courses: false,
  });

  useEffect(() => {
    const fetchRelationships = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/carnets/relationships/${osiId}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.error || "Failed to fetch relationships");
          return;
        }

        setRelationships(data.data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch relationships",
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (osiId) {
      fetchRelationships();
    }
  }, [osiId]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Cargando relaciones...</span>
        </div>
      </div>
    );
  }

  if (error || !relationships) {
    return (
      <div
        className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}
      >
        <div className="flex items-center">
          <svg
            className="h-5 w-5 text-red-400 mr-2"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  const getCertificationStatus = (certificate: CertificateManagement) => {
    if (!certificate.fecha_vencimiento)
      return { status: "valid", text: "Vigente", color: "green" };

    const today = new Date();
    const expirationDate = new Date(certificate.fecha_vencimiento);
    const daysUntilExpiration = Math.ceil(
      (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiration < 0)
      return { status: "expired", text: "Vencido", color: "red" };
    if (daysUntilExpiration <= 30)
      return { status: "expiring", text: "Por vencer", color: "yellow" };
    return { status: "valid", text: "Vigente", color: "green" };
  };

  const getCarnetStatus = (carnet: Carnet) => {
    if (!carnet.fecha_vencimiento)
      return { status: "valid", text: "Vigente", color: "green" };

    const today = new Date();
    const expirationDate = new Date(carnet.fecha_vencimiento);
    const daysUntilExpiration = Math.ceil(
      (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiration < 0)
      return { status: "expired", text: "Vencido", color: "red" };
    if (daysUntilExpiration <= 30)
      return { status: "expiring", text: "Por vencer", color: "yellow" };
    return { status: "valid", text: "Vigente", color: "green" };
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* OSI Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Resumen de OSI
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {relationships.osi.nro_osi}
            </div>
            <div className="text-sm text-blue-800">Número OSI</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {relationships.certificates.length}
            </div>
            <div className="text-sm text-green-800">Certificados Emitidos</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {relationships.carnets.length}
            </div>
            <div className="text-sm text-purple-800">Carnets Generados</div>
          </div>
        </div>
      </div>

      {/* Certificates Section */}
      <div className="bg-white rounded-lg shadow">
        <div
          className="p-6 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection("certificates")}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Certificados ({relationships.certificates.length})
            </h3>
            <svg
              className={`w-5 h-5 text-gray-500 transform transition-transform ${expandedSections.certificates ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {expandedSections.certificates && (
          <div className="p-6">
            {relationships.certificates.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No hay certificados para esta OSI
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Participante
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Curso
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Emisión
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vencimiento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Carnet
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {relationships.certificates.map((certificate) => {
                      const status = getCertificationStatus(certificate);
                      const hasCarnet = relationships.carnets.some(
                        (c) => c.id_certificado === certificate.id,
                      );

                      return (
                        <tr key={certificate.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {certificate.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {certificate.participantes_certificados?.nombre ||
                              "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {certificate.cursos?.nombre || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {certificate.fecha_emision
                              ? new Date(
                                  certificate.fecha_emision,
                                ).toLocaleDateString()
                              : "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {certificate.fecha_vencimiento
                              ? new Date(
                                  certificate.fecha_vencimiento,
                                ).toLocaleDateString()
                              : "No aplica"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                status.color === "green"
                                  ? "bg-green-100 text-green-800"
                                  : status.color === "yellow"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                              }`}
                            >
                              {status.text}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {hasCarnet ? (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                ✓ Carnet
                              </span>
                            ) : (
                              <span className="text-gray-400">No</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Carnets Section */}
      <div className="bg-white rounded-lg shadow">
        <div
          className="p-6 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection("carnets")}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Carnets ({relationships.carnets.length})
            </h3>
            <svg
              className={`w-5 h-5 text-gray-500 transform transition-transform ${expandedSections.carnets ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {expandedSections.carnets && (
          <div className="p-6">
            {relationships.carnets.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No hay carnets para esta OSI
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {relationships.carnets.map((carnet) => {
                  const status = getCarnetStatus(carnet);

                  return (
                    <div
                      key={carnet.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">
                          Carnet #{carnet.id}
                        </h4>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            status.color === "green"
                              ? "bg-green-100 text-green-800"
                              : status.color === "yellow"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {status.text}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">
                            Participante:
                          </span>
                          <span className="ml-2 text-gray-900">
                            {carnet.nombre_participante}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">
                            Cédula:
                          </span>
                          <span className="ml-2 text-gray-900">
                            {carnet.cedula_participante}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">
                            Curso:
                          </span>
                          <span className="ml-2 text-gray-900">
                            {carnet.titulo_curso}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">
                            Emisión:
                          </span>
                          <span className="ml-2 text-gray-900">
                            {new Date(
                              carnet.fecha_emision,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        {carnet.fecha_vencimiento && (
                          <div>
                            <span className="font-medium text-gray-700">
                              Vencimiento:
                            </span>
                            <span className="ml-2 text-gray-900">
                              {new Date(
                                carnet.fecha_vencimiento,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <a
                          href={`/verify-certificate/${carnet.id_certificado}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                        >
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                          Ver Certificado
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Participants Summary */}
      <div className="bg-white rounded-lg shadow">
        <div
          className="p-6 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection("participants")}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Participantes Únicos ({relationships.participants.length})
            </h3>
            <svg
              className={`w-5 h-5 text-gray-500 transform transition-transform ${expandedSections.participants ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {expandedSections.participants && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {relationships.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center p-3 bg-gray-50 rounded-lg"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                    {participant.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {participant.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {participant.idNumber}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
