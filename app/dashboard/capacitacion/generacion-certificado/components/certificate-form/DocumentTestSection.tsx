"use client";

import { Beaker } from "lucide-react";

interface DocumentTestSectionProps {
  isTestingDocs: boolean;
  selections: {
    includeCertificacionCompetencias: boolean;
    includeNotaEntrega: boolean;
    includeValidacionDatos: boolean;
  };
  onSelectionsChange: (selections: any) => void;
  onTest: () => void;
  disabled: boolean;
}

export const DocumentTestSection = ({
  isTestingDocs,
  selections,
  onSelectionsChange,
  onTest,
  disabled,
}: DocumentTestSectionProps) => {
  const handleToggle = (field: string) => {
    onSelectionsChange({
      ...selections,
      [field]: !selections[field as keyof typeof selections],
    });
  };

  return (
    <div className="mt-8 pt-6 border-t border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-amber-50 rounded-md">
          <Beaker className="h-4 w-4 text-amber-600" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">
          Laboratorio de Documentos (Solo Pruebas)
        </h3>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        Genera y descarga los documentos adicionales basados en los datos
        actuales sin afectar la base de datos. Ideal para verificar saltos de
        página y diseño.
      </p>

      <div className="flex flex-wrap gap-6 mb-6">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="test-cert"
            checked={selections.includeCertificacionCompetencias}
            onChange={() => handleToggle("includeCertificacionCompetencias")}
            disabled={isTestingDocs || disabled}
            className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded cursor-pointer"
          />
          <label
            htmlFor="test-cert"
            className="text-xs font-medium text-gray-700 cursor-pointer select-none"
          >
            Certificación de Competencias
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="test-nota"
            checked={selections.includeNotaEntrega}
            onChange={() => handleToggle("includeNotaEntrega")}
            disabled={isTestingDocs || disabled}
            className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded cursor-pointer"
          />
          <label
            htmlFor="test-nota"
            className="text-xs font-medium text-gray-700 cursor-pointer select-none"
          >
            Nota de Entrega
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="test-val"
            checked={selections.includeValidacionDatos}
            onChange={() => handleToggle("includeValidacionDatos")}
            disabled={isTestingDocs || disabled}
            className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded cursor-pointer"
          />
          <label
            htmlFor="test-val"
            className="text-xs font-medium text-gray-700 cursor-pointer select-none"
          >
            Validación de Datos
          </label>
        </div>
      </div>

      <button
        type="button"
        onClick={onTest}
        disabled={isTestingDocs || disabled}
        className="inline-flex items-center px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-md hover:bg-amber-700 transition-colors disabled:bg-amber-300 disabled:cursor-not-allowed shadow-sm"
      >
        {isTestingDocs ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Generando Pruebas...
          </>
        ) : (
          <>
            <Beaker className="mr-2 h-4 w-4" />
            Probar Documentos Seleccionados
          </>
        )}
      </button>
    </div>
  );
};
