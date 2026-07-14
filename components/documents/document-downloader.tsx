'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, Users, CheckCircle } from 'lucide-react';

interface DocumentDownloaderProps {
  certificates: any[];
  osiData: any;
  firmanteData: { nombre: string; cargo: string };
  recibidoData?: { nombre: string; cargo: string };
  disabled?: boolean;
}

interface DocumentType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export function DocumentDownloader({
  certificates,
  osiData,
  firmanteData,
  recibidoData,
  disabled = false,
}: DocumentDownloaderProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const documentTypes: DocumentType[] = [
    {
      id: 'certificacion_competencias',
      name: 'Certificación de Competencias',
      description: 'Documento que certifica las competencias de los participantes',
      icon: <CheckCircle className="w-4 h-4" />,
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      id: 'nota_entrega',
      name: 'Nota de Entrega',
      description: 'Comprobante de entrega de certificados',
      icon: <FileText className="w-4 h-4" />,
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      id: 'validacion_datos',
      name: 'Validación de Datos',
      description: 'Formulario para validación de datos de participantes',
      icon: <Users className="w-4 h-4" />,
      color: 'bg-purple-500 hover:bg-purple-600',
    },
  ];

  const handleDownload = async (documentType: string) => {
    if (disabled || !certificates.length) return;

    setLoading(documentType);

    try {
      // Prepare certificate data for server action
      const certificateRecords = certificates.map((cert, index) => ({
        participant_name: cert.participant_name || cert.name || '',
        participant_id_number: cert.participant_id_number || cert.id_number || '',
        course_title: cert.course_title || '',
        company_name: cert.company_name || '',
        osi_number: cert.osi_number || '',
        city: cert.city || 'Puerto La Cruz',
        location: cert.location || '',
        execution_address: cert.execution_address || '',
        execution_date: cert.execution_date || '',
        score: cert.score?.toString() || '',
        control_number: cert.control_number || cert.numero_control || '',
      }));

      // Import server action dynamically to avoid client-side issues
      const { generateDocumentsServer } = await import('@/lib/document-server-actions');
      const { getDocumentFileName } = await import('@/lib/document-client-utils');
      
      // Generate specific document type
      const result = await generateDocumentsServer({
        certificates: certificateRecords,
        osiData: osiData,
        firmanteData: firmanteData,
        options: {
          [documentType === 'certificacion_competencias' ? 'includeCertificacionCompetencias' : 
           documentType === 'nota_entrega' ? 'includeNotaEntrega' : 
           'includeValidacionDatos']: true,
          // Disable other document types
          includeCertificacionCompetencias: documentType === 'certificacion_competencias',
          includeNotaEntrega: documentType === 'nota_entrega',
          includeValidacionDatos: documentType === 'validacion_datos',
          recibidoData: documentType === 'nota_entrega' ? recibidoData : undefined,
        }
      });

      if (!result.success || !result.documents) {
        throw new Error(result.error || 'Failed to generate document');
      }

      // Get the specific document buffer
      const buffer = result.documents[documentType];
      if (!buffer) {
        throw new Error(`Document ${documentType} was not generated`);
      }

      // Create blob and download
      const blob = new Blob([buffer as any], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${documentType}_${Date.now()}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error downloading document:', error);
      alert(`Error al generar el documento: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setLoading(null);
    }
  };

  if (!certificates.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No hay certificados disponibles para generar documentos</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Documentos Adicionales</h3>
        <span className="text-sm text-gray-500">
          {certificates.length} participante{certificates.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid gap-3">
        {documentTypes.map((docType) => (
          <div
            key={docType.id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full text-white ${docType.color}`}>
                {docType.icon}
              </div>
              <div>
                <h4 className="font-medium">{docType.name}</h4>
                <p className="text-sm text-gray-600">{docType.description}</p>
              </div>
            </div>

            <Button
              onClick={() => handleDownload(docType.id)}
              disabled={disabled || loading === docType.id}
              className={`${docType.color} text-white`}
            >
              {loading === docType.id ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Descargar
                </>
              )}
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> Los documentos se generarán con la información de los {certificates.length} 
          certificados seleccionados. Asegúrese de que todos los datos sean correctos antes de descargar.
        </p>
      </div>
    </div>
  );
}
