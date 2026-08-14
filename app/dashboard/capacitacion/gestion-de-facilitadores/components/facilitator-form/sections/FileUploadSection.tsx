"use client";

import React from "react";
import { SectionCard } from "./SectionCard";
import { Upload } from "lucide-react";

interface FileUploadSectionProps {
  signatureFile: File | null;
  onFileSelect: (
    event: React.ChangeEvent<HTMLInputElement>,
    fileType: "signature",
  ) => void;
  isEdit?: boolean;
}

export const FileUploadSection = ({
  signatureFile,
  onFileSelect,
  isEdit = false,
}: FileUploadSectionProps) => {
  return (
    <SectionCard title="Archivos Adjuntos" icon={<Upload className="w-4 h-4" />}>
      <div className="grid grid-cols-1 gap-3">
        {/* Signature Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Firma Digital
          </label>
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.gif"
            onChange={(e) => onFileSelect(e, "signature")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Formatos aceptados: PNG, JPG, GIF (Máx. 5MB)
          </p>
          {isEdit && !signatureFile && (
            <p className="text-xs text-blue-600 mt-1">
              💡 Dejar vacío para mantener la firma actual
            </p>
          )}
          {signatureFile && (
            <p className="text-sm text-green-600 mt-1">
              ✓ {signatureFile.name} (
              {(signatureFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>
      </div>
    </SectionCard>
  );
};
