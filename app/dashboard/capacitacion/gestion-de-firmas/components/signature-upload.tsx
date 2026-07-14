"use client";

import { useState } from "react";

interface SignatureUploadProps {
  onSignatureUploaded: () => void;
}

export const SignatureUpload = ({ onSignatureUploaded }: SignatureUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [signatureType, setSignatureType] = useState<string>("facilitador");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !signatureName) {
      alert("Por favor selecciona una imagen y proporciona un nombre");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", signatureName);
      formData.append("type", signatureType);

      const response = await fetch("/api/signatures/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        alert("Firma subida exitosamente");
        setSignatureName("");
        setSignatureType("facilitador");
        setSelectedFile(null);
        setPreview("");
        onSignatureUploaded();
      } else {
        throw new Error("Error al subir la firma");
      }
    } catch (error) {
      alert("Error al subir la firma. Por favor intenta nuevamente.");
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const signatureTypeLabels = {
    "facilitador": "Facilitador",
    "representante_sha": "Representante SHA",
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Subir Nueva Firma
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form Section */}
        <div className="space-y-4">
          <div>
            <label
              htmlFor="signature-name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Nombre de la Persona *
            </label>
            <input
              type="text"
              id="signature-name"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: Juan Pérez"
            />
          </div>

          <div>
            <label
              htmlFor="signature-type"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Tipo de Firma *
            </label>
            <select
              id="signature-type"
              value={signatureType}
              onChange={(e) => setSignatureType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="facilitador">
                Facilitador
              </option>
              <option value="representante_sha">
                Representante SHA
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="signature-file"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Imagen de la Firma *
            </label>
            <input
              type="file"
              id="signature-file"
              accept="image/*"
              onChange={handleFileSelect}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Formatos permitidos: PNG, JPG, JPEG. Tamaño máximo: 5MB
            </p>
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading || !selectedFile || !signatureName}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {uploading ? "Subiendo..." : "Subir Firma"}
          </button>
        </div>

        {/* Preview Section */}
        <div>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 h-64 flex items-center justify-center">
            {preview ? (
              <img
                src={preview}
                alt="Vista previa de la firma"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-center text-gray-500">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="mt-2">Vista previa de la firma</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
