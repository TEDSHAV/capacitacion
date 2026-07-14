"use client";

import { CertificateManagement } from '@/types';
import { Button } from '@/components/ui/button';

interface CertificateTableProps {
  certificates: CertificateManagement[];
  loading?: boolean;
  onViewCertificate?: (certificate: CertificateManagement) => void;
  onDownloadCertificate?: (certificate: CertificateManagement) => void;
  onVerifyCertificate?: (certificate: CertificateManagement) => void;
}

export default function CertificateTableComponent({
  certificates,
  loading,
  onViewCertificate,
  onDownloadCertificate,
  onVerifyCertificate
}: CertificateTableProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  const formatCedula = (cedula: string, nacionalidad: string) => {
    const prefix = nacionalidad === 'extranjero' ? 'E' : 'V';
    return `${prefix}-${cedula}`;
  };

  const getStatusBadge = (isActive: boolean, fechaVencimiento: string | null) => {
    const now = new Date();
    const isExpired = fechaVencimiento && new Date(fechaVencimiento) < now;

    if (!isActive) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
          Inactivo
        </span>
      );
    }

    if (isExpired) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
          Expirado
        </span>
      );
    }

    return (
      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
        Activo
      </span>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 font-medium';
    if (score >= 80) return 'text-blue-600 font-medium';
    if (score >= 70) return 'text-yellow-600 font-medium';
    return 'text-red-600 font-medium';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        </div>
        <div className="divide-y divide-gray-200">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="px-6 py-4 animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron certificados</h3>
        <p className="mt-1 text-sm text-gray-500">
          No hay certificados que coincidan con los criterios de búsqueda actuales.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Certificados ({certificates.length})
        </h3>
      </div>

      <table className="w-full table-fixed divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-[17%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participante</th>
            <th className="w-[17%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
            <th className="w-[22%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Curso</th>
            <th className="hidden lg:table-cell w-[13%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Facilitador</th>
            <th className="w-[11%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emisión</th>
            <th className="hidden lg:table-cell w-[11%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimiento</th>
            <th className="w-[7%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pts</th>
            <th className="w-[15%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {certificates.map((certificate) => (
            <tr key={certificate.id} className="hover:bg-gray-50">
              <td className="px-3 py-3">
                <div className="text-sm font-medium text-gray-900 truncate" title={certificate.participantes_certificados?.nombre || ''}>
                  {certificate.participantes_certificados?.nombre || '-'}
                </div>
                <div className="text-xs text-gray-500">
                  {certificate.participantes_certificados && formatCedula(
                    certificate.participantes_certificados.cedula,
                    certificate.participantes_certificados.nacionalidad
                  )}
                </div>
              </td>

              <td className="px-3 py-3">
                <div className="text-sm text-gray-900 truncate" title={certificate.empresas?.razon_social || ''}>
                  {certificate.empresas?.razon_social || '-'}
                </div>
                <div className="text-xs text-gray-500 truncate">{certificate.empresas?.rif || ''}</div>
              </td>

              <td className="px-3 py-3">
                <div className="text-sm text-gray-900 line-clamp-2" title={certificate.cursos?.nombre || ''}>
                  {certificate.cursos?.nombre || '-'}
                </div>
                <div className="text-xs text-gray-500">
                  {certificate.cursos?.horas_estimadas ? `${certificate.cursos.horas_estimadas}h` : ''}
                </div>
              </td>

              <td className="hidden lg:table-cell px-3 py-3">
                <div className="text-sm text-gray-900 truncate" title={certificate.facilitadores?.nombre_apellido || ''}>
                  {certificate.facilitadores?.nombre_apellido || '-'}
                </div>
              </td>

              <td className="px-3 py-3 whitespace-nowrap">
                <div className="text-sm text-gray-900">{formatDate(certificate.fecha_emision)}</div>
                {certificate.nro_osi && (
                  <div className="text-xs text-gray-500">OSI: {certificate.nro_osi}</div>
                )}
              </td>

              <td className="hidden lg:table-cell px-3 py-3 whitespace-nowrap">
                <div className="text-sm text-gray-900">{formatDate(certificate.fecha_vencimiento)}</div>
              </td>

              <td className="px-3 py-3 whitespace-nowrap">
                <div className={`text-sm font-medium ${getScoreColor(certificate.calificacion)}`}>
                  {certificate.calificacion.toFixed(1)}
                </div>
              </td>

              <td className="px-3 py-3">
                <div className="flex flex-col gap-1">
                  {onViewCertificate && (
                    <button
                      onClick={() => onViewCertificate(certificate)}
                      className="w-full text-xs text-center py-1 px-2 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      title="Ver certificado"
                    >
                      Ver
                    </button>
                  )}
                  {onDownloadCertificate && (
                    <button
                      onClick={() => onDownloadCertificate(certificate)}
                      className="w-full text-xs text-center py-1 px-2 rounded border border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300 transition-colors"
                      title="Descargar certificado"
                    >
                      Descargar
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
