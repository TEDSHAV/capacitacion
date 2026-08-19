"use client";

interface GenerationProgress {
  currentPhase: string;
  percentage: number;
  currentCertificate: number;
  totalCertificates: number;
}

interface FormActionButtonsProps {
  isGenerating: boolean;
  isEditMode: boolean;
  generationProgress?: GenerationProgress;
  onPreview: () => void;
  onGenerate: () => void;
  onSaveDraft?: () => void;
  canSaveDraft?: boolean;
  justSavedDraft?: boolean;
}

export const FormActionButtons = ({
  isGenerating,
  isEditMode,
  generationProgress,
  onPreview,
  onGenerate,
  onSaveDraft,
  canSaveDraft = false,
  justSavedDraft = false,
}: FormActionButtonsProps) => {
  return (
    <>
      {/* Action Buttons */}
      <div className="flex space-x-3 mb-4 mt-6">
        {/* Save Draft Button - hidden in edit mode */}
        {!isEditMode && onSaveDraft && (
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={!canSaveDraft || isGenerating}
            className={`px-4 py-2 rounded-md transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed border ${
              justSavedDraft
                ? "bg-green-50 text-green-700 border-green-300"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {justSavedDraft ? (
              <span className="flex items-center gap-1.5">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Borrador guardado
              </span>
            ) : (
              "Guardar Borrador"
            )}
          </button>
        )}

        {/* Preview Button */}
        <button
          type="button"
          onClick={onPreview}
          disabled={isGenerating}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Vista Previa
        </button>

        {/* Generate Button */}
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className={`px-4 py-2 text-white rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed ${
            isEditMode
              ? "bg-orange-600 hover:bg-orange-700"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isGenerating ? (
            <div className="flex items-center">
              <svg
                className="animate-spin h-4 w-4 mr-2 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v16m1.414 0l3.586-3.586a2 2 0 013.414 3.414L20 8.586a2 2 0 01-3.414-3.414L12 15.414a2 2 0 01-3.414-3.414L4 8.586a2 2 0 013.414 3.414z"
                />
              </svg>
              <span>{isEditMode ? "Guardando..." : "Generando..."}</span>
            </div>
          ) : isEditMode ? (
            "Guardar Cambios"
          ) : (
            "Generar Certificados"
          )}
        </button>
      </div>

      {/* Progress Indicator */}
      {isGenerating && generationProgress && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">
              {generationProgress.currentPhase}
            </span>
            <span className="text-sm text-blue-700">
              {generationProgress.percentage}%
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${generationProgress.percentage}%` }}
            />
          </div>
          {generationProgress.totalCertificates > 0 && (
            <div className="mt-2 text-xs text-blue-700">
              Procesados: {generationProgress.currentCertificate} /{" "}
              {generationProgress.totalCertificates} certificados
            </div>
          )}
        </div>
      )}
    </>
  );
};
