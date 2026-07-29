"use client";

import { Download, Award, FileText, Eye } from "lucide-react";
import { ClienteCertificateRow } from "@/types";

interface ClienteResultsProps {
  certificates: ClienteCertificateRow[];
  nroOsi?: number;
}

export function ClienteResults({
  certificates,
  nroOsi,
}: ClienteResultsProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = dateString.includes("T")
      ? new Date(dateString)
      : new Date(dateString + "T12:00:00");
    return date.toLocaleDateString("es-ES");
  };

  const hasData = certificates.length > 0;

  if (!hasData) {
    return (
      <div className="bg-white border border-dashed border-gray-300 rounded-xl py-16 flex flex-col items-center justify-center">
        <FileText className="w-12 h-12 text-gray-200 mb-4" />
        <p className="text-gray-500">
          No se encontraron resultados con los filtros aplicados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {nroOsi && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-1 rounded">
            OSI #{nroOsi}
          </span>
        </div>
      )}

      {/* Certificates Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-gray-900">
            Certificados ({certificates.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-semibold">Participante</th>
                <th className="px-4 py-3 text-left font-semibold">Cédula</th>
                <th className="px-4 py-3 text-left font-semibold">Curso</th>
                <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                <th className="px-4 py-3 text-left font-semibold">Estado</th>
                <th className="px-4 py-3 text-left font-semibold">Ciudad</th>
                <th className="px-4 py-3 text-center font-semibold">Ver</th>
                <th className="px-4 py-3 text-center font-semibold">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {certificates.map((cert) => (
                <tr key={cert.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {cert.participant_nombre}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {cert.participant_nacionalidad === "extranjero" ? "E-" : "V-"}
                    {cert.participant_cedula}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {cert.course_nombre || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(cert.fecha_emision)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {cert.state_nombre_estado || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {cert.city_nombre_ciudad || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <a
                      href={`/verify-certificate/${cert.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
                      title="Ver certificado y carnets"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <a
                      href={`/api/generate-certificate-pdf/${cert.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center p-2 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Descargar PDF"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
