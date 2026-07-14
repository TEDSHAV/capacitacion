'use client';

import { useState } from 'react';
import { Search, User, Award, Clock, Building, BookOpen, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  type ParticipantLookupResponse, 
  type ParticipantCertificate, 
  type ParticipantStatistics 
} from '@/types';

export default function ParticipantLookup() {
  const [searchId, setSearchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [participantData, setParticipantData] = useState<ParticipantLookupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, ''); // Only allow numbers
    setSearchId(value);
  };

  const handleSearch = async () => {
    if (!searchId.trim()) {
      setError('Por favor ingrese un número de cédula');
      return;
    }

    if (!/^\d+$/.test(searchId.trim())) {
      setError('El número de cédula debe contener solo números');
      return;
    }

    setLoading(true);
    setError(null);
    setParticipantData(null);

    try {
      const response = await fetch(`/api/participants/${encodeURIComponent(searchId.trim())}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Participant not found');
      }

      const data = await response.json();
      setParticipantData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch participant data');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatDate = (dateString: string) => {
    // Parse the YYYY-MM-DD format and create a date at noon local time to avoid timezone shifts
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0); // Month is 0-indexed, use noon to avoid timezone issues
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const downloadCertificate = async (certificateId: number) => {
    try {
      const response = await fetch(`/api/generate-certificate-pdf/${certificateId}`);
      if (!response.ok) throw new Error('Failed to generate PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${certificateId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading certificate:', error);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Consulta de Participantes</h1>
        <p className="text-gray-600">Busque participantes por número de cédula para ver su historial de certificados</p>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={searchId}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Ingrese número de cédula (solo números, ej: 12345678)"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <Button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </Button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Results Section */}
      {participantData && (
        <div className="space-y-8">
          {/* Participant Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Información del Participante</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Nombre</p>
                <p className="font-medium text-gray-900">{participantData.participant.nombre}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Cédula</p>
                <p className="font-medium text-gray-900">{participantData.participant.cedula}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Nacionalidad</p>
                <p className="font-medium text-gray-900 capitalize">{participantData.participant.nacionalidad}</p>
                {participantData.participant.total_records && participantData.participant.total_records > 1 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Nota: {participantData.participant.total_records} registros encontrados para esta cédula
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <Award className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Total de Certificados</p>
                  <p className="text-2xl font-bold text-gray-900">{participantData.statistics.totalCertificates}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-500">Total de Horas</p>
                  <p className="text-2xl font-bold text-gray-900">{participantData.statistics.totalHours}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-500">Puntuación Promedio</p>
                  <p className="text-2xl font-bold text-gray-900">{participantData.statistics.averageScore}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <Building className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-500">Empresas</p>
                  <p className="text-2xl font-bold text-gray-900">{participantData.statistics.uniqueCompaniesCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Certificates List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Historial de Certificados</h2>
            {participantData.certificates.length === 0 ? (
              <p className="text-gray-500">No se encontraron certificados para este participante.</p>
            ) : (
              <div className="space-y-4">
                {participantData.certificates.map((certificate: ParticipantCertificate) => (
                  <div key={certificate.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {certificate.parsed_snapshot?.certificado_detalles?.title || 
                             certificate.cursos?.nombre || 
                             'Certificado'}
                          </h3>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Certificado #{certificate.id}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Fecha de Emisión</p>
                            <p className="font-medium">{formatDate(certificate.fecha_emision)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Empresa</p>
                            <p className="font-medium">{certificate.empresas?.razon_social || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Puntuación</p>
                            <p className="font-medium">
                              {certificate.parsed_snapshot?.participante?.score || 
                               certificate.calificacion || 
                               'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Horas</p>
                            <p className="font-medium">
                              {certificate.parsed_snapshot?.certificado_detalles?.horas_estimadas || 
                               certificate.cursos?.horas_estimadas || 
                               'N/A'}
                            </p>
                          </div>
                        </div>

                        {/* Control Numbers */}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-500 mb-1">Números de Control:</p>
                          <div className="flex gap-4 text-xs font-mono">
                            <span>Libro: {certificate.nro_libro}</span>
                            <span>Hoja: {certificate.nro_hoja}</span>
                            <span>Línea: {certificate.nro_linea}</span>
                            <span>Control: {certificate.nro_control}</span>
                          </div>
                        </div>

                        {/* Facilitator */}
                        {certificate.facilitadores && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">
                              Facilitador: {certificate.facilitadores.nombre_apellido}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/verify-certificate/${certificate.id}`, '_blank')}
                          className="flex items-center gap-1"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Verificar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => downloadCertificate(certificate.id)}
                          className="flex items-center gap-1"
                        >
                          <Download className="h-4 w-4" />
                          Descargar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
