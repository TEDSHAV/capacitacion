"use client";

import { useState } from 'react';
import { CarnetGeneration, CertificateParticipant } from '@/types';

interface CarnetFormProps {
  carnetData: CarnetGeneration;
  participant: CertificateParticipant;
  onDataChange: (data: CarnetGeneration) => void;
  isGenerating?: boolean;
  showPreview?: boolean;
  onPreview?: () => void;
}

export function CarnetForm({
  carnetData,
  participant,
  onDataChange,
  isGenerating = false,
  showPreview = false,
  onPreview
}: CarnetFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (field: string, value: any): string => {
    switch (field) {
      case 'titulo_curso':
        return !value || value.trim() === '' ? 'El título del curso es requerido' : '';
      case 'fecha_emision':
        return !value ? 'La fecha de emisión es requerida' : '';
      case 'nombre_participante':
        return !value || value.trim() === '' ? 'El nombre del participante es requerido' : '';
      case 'cedula_participante':
        return !value || value.trim() === '' ? 'La cédula del participante es requerida' : '';
      default:
        return '';
    }
  };

  const handleInputChange = (field: keyof CarnetGeneration, value: any) => {
    const error = validateField(field, value);
    
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));

    onDataChange({
      ...carnetData,
      [field]: value
    });
  };

  const hasErrors = Object.values(errors).some(error => error !== '');

  return (
    <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Información del Carnet
        </h3>
        {showPreview && onPreview && (
          <button
            type="button"
            onClick={onPreview}
            disabled={isGenerating || hasErrors}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Vista Previa
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Course Information */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 border-b pb-2">
            Información del Curso
          </h4>
          
          <div>
            <label htmlFor="titulo_curso" className="block text-sm font-medium text-gray-700 mb-1">
              Título del Curso <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="titulo_curso"
              value={carnetData.titulo_curso}
              onChange={(e) => handleInputChange('titulo_curso', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: Manejo de Montacargas"
              disabled={isGenerating}
            />
            {errors.titulo_curso && (
              <p className="mt-1 text-sm text-red-600">{errors.titulo_curso}</p>
            )}
          </div>
        </div>

        {/* Dates Information */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 border-b pb-2">
            Fechas
          </h4>
          
          <div>
            <label htmlFor="fecha_emision" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Emisión <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="fecha_emision"
              value={carnetData.fecha_emision}
              onChange={(e) => handleInputChange('fecha_emision', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isGenerating}
            />
            {errors.fecha_emision && (
              <p className="mt-1 text-sm text-red-600">{errors.fecha_emision}</p>
            )}
          </div>

          <div>
            <label htmlFor="fecha_vencimiento" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Vencimiento
            </label>
            <input
              type="date"
              id="fecha_vencimiento"
              value={carnetData.fecha_vencimiento || ''}
              onChange={(e) => handleInputChange('fecha_vencimiento', e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isGenerating}
              min={carnetData.fecha_emision}
            />
            <p className="mt-1 text-xs text-gray-500">
              Dejar en blanco si el carnet no tiene vencimiento
            </p>
          </div>
        </div>

        {/* Participant Information */}
        <div className="space-y-4 md:col-span-2">
          <h4 className="text-sm font-medium text-gray-700 border-b pb-2">
            Información del Participante
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nombre_participante" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="nombre_participante"
                value={carnetData.nombre_participante}
                onChange={(e) => handleInputChange('nombre_participante', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Juan Pérez"
                disabled={isGenerating}
              />
              {errors.nombre_participante && (
                <p className="mt-1 text-sm text-red-600">{errors.nombre_participante}</p>
              )}
            </div>

            <div>
              <label htmlFor="cedula_participante" className="block text-sm font-medium text-gray-700 mb-1">
                Cédula <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="cedula_participante"
                value={carnetData.cedula_participante}
                onChange={(e) => handleInputChange('cedula_participante', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="V-12345678"
                disabled={isGenerating}
              />
              {errors.cedula_participante && (
                <p className="mt-1 text-sm text-red-600">{errors.cedula_participante}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="empresa_participante" className="block text-sm font-medium text-gray-700 mb-1">
              Empresa
            </label>
            <input
              type="text"
              id="empresa_participante"
              value={carnetData.empresa_participante || ''}
              onChange={(e) => handleInputChange('empresa_participante', e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Empresa XYZ"
              disabled={isGenerating}
            />
          </div>
        </div>

        {/* System Information (Read-only) */}
        <div className="space-y-4 md:col-span-2">
          <h4 className="text-sm font-medium text-gray-700 border-b pb-2">
            Información del Sistema
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID Certificado
              </label>
              <input
                type="text"
                value={carnetData.id_certificado.toString()}
                readOnly
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID Participante
              </label>
              <input
                type="text"
                value={carnetData.id_participante.toString()}
                readOnly
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID OSI
              </label>
              <input
                type="text"
                value={carnetData.id_osi?.toString() || ''}
                readOnly
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Validation Summary */}
      {hasErrors && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Por favor corrige los siguientes errores:
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc list-inside space-y-1">
                  {Object.entries(errors).map(([field, error]) => (
                    error && <li key={field}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
