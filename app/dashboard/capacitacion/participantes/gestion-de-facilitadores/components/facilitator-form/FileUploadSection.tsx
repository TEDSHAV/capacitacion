"use client";

import React from "react";
import { FileUploadSectionProps } from "@/types";

export const FileUploadSection = ({ resumeFile, signatureFile, onFileSelect }: FileUploadSectionProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-md font-medium text-gray-900">Archivos</h3>
      
      {/* Resume Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Currículum Vitae (PDF, DOC, DOCX - Máx. 10MB)
        </label>
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(e) => onFileSelect(e, 'resume')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {resumeFile && (
          <p className="text-sm text-gray-600 mt-1">
            Archivo seleccionado: {resumeFile.name}
          </p>
        )}
      </div>

      {/* Signature Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Firma Digital (PNG, JPG, GIF - Máx. 5MB)
        </label>
        <input
          type="file"
          accept=".png,.jpg,.jpeg,.gif"
          onChange={(e) => onFileSelect(e, 'signature')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {signatureFile && (
          <div className="mt-2">
            <p className="text-sm text-gray-600">
              Archivo seleccionado: {signatureFile.name}
            </p>
            <div className="mt-2 border border-gray-200 rounded-md p-2 max-w-xs">
              <img 
                src={URL.createObjectURL(signatureFile)} 
                alt="Firma preview" 
                className="max-h-20 mx-auto"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
