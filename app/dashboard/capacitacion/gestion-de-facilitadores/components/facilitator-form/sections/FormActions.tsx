"use client";

import React from "react";

interface FormActionsProps {
  onCancel: () => void;
  onSave?: () => void;
  loading?: boolean;
  saveText?: string;
  cancelText?: string;
  disabled?: boolean;
  position?: "top" | "bottom";
  className?: string;
}

export const FormActions = ({
  onCancel,
  onSave,
  loading = false,
  saveText = "Guardar",
  cancelText = "Cancelar",
  disabled = false,
  position = "bottom",
  className = "",
}: FormActionsProps) => {
  const baseClasses = "flex justify-between items-center";
  const positionClasses = position === "top" 
    ? "mb-6 pb-4 border-b border-gray-200" 
    : "mt-6 pt-4 border-t border-gray-200";
  
  return (
    <div className={`${baseClasses} ${positionClasses} ${className}`}>
      <div className="text-sm text-gray-500">
        {position === "top" && (
          <span>
            {loading ? "Guardando cambios..." : "Los campos marcados con * son obligatorios"}
          </span>
        )}
        {position === "bottom" && (
          <span>
            {loading ? "Procesando..." : "Revisa la información antes de guardar"}
          </span>
        )}
      </div>
      
      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cancelText}
        </button>
        <button
          type={position === "bottom" ? "submit" : "button"}
          onClick={position === "top" && onSave ? onSave : undefined}
          disabled={loading || disabled}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Guardando...
            </span>
          ) : (
            saveText
          )}
        </button>
      </div>
    </div>
  );
};
