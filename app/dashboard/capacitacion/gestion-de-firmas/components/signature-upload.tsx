"use client";

import { useState, useEffect } from "react";
import { getFacilitatorsAction } from "@/app/actions/facilitators-crud";
import { Facilitador } from "@/types";
import { toTitleCase } from "@/utils/string-utils";

interface SignatureUploadProps {
  onSignatureUploaded: () => void;
}

export const SignatureUpload = ({
  onSignatureUploaded,
}: SignatureUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFacilitador, setSelectedFacilitador] = useState<string>("");
  const [representanteName, setRepresentanteName] = useState<string>("");
  const [signatureType, setSignatureType] = useState<string>("facilitador");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [facilitadores, setFacilitadores] = useState<Facilitador[]>([]);
  const [loadingFacilitadores, setLoadingFacilitadores] = useState(true);

  useEffect(() => {
    loadFacilitadores();
  }, []);

  useEffect(() => {
    // Reset form fields when signature type changes
    setSelectedFacilitador("");
    setRepresentanteName("");
    setSelectedFile(null);
    setPreview("");
  }, [signatureType]);

  const loadFacilitadores = async () => {
    try {
      setLoadingFacilitadores(true);
      const response = await fetch("/api/facilitators/");
      if (response.ok) {
        const allFacilitadores = await response.json();

        // Load signatures to filter out facilitadores that already have signatures
        const signaturesResponse = await fetch("/api/signatures");
        if (signaturesResponse.ok) {
          const signatures = await signaturesResponse.json();
          const facilitadorSignatureIds = signatures
            .filter((sig: any) => sig.tipo === "facilitador")
            .map((sig: any) => sig.id);

          // Filter out facilitadores that already have signatures
          const availableFacilitadores = allFacilitadores.filter(
            (f: any) =>
              !f.firma_id || !facilitadorSignatureIds.includes(f.firma_id),
          );

          setFacilitadores(availableFacilitadores);
        } else {
          setFacilitadores(allFacilitadores);
        }
      }
    } catch (error) {
      console.error("Error loading facilitadores:", error);
    } finally {
      setLoadingFacilitadores(false);
    }
  };

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
    // Validation based on signature type
    if (!selectedFile) {
      alert("Por favor selecciona una imagen de firma");
      return;
    }

    if (signatureType === "facilitador" && !selectedFacilitador) {
      alert("Por favor selecciona un facilitador");
      return;
    }

    if (signatureType === "representante_sha" && !representanteName.trim()) {
      alert("Por favor ingresa el nombre del representante SHA");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", signatureType);

      if (signatureType === "facilitador") {
        formData.append("facilitadorId", selectedFacilitador);
      } else {
        formData.append("name", representanteName.trim());
      }

      const response = await fetch("/api/signatures/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        alert("Firma subida exitosamente");
        // Reset form
        setSelectedFacilitador("");
        setRepresentanteName("");
        setSignatureType("facilitador");
        setSelectedFile(null);
        setPreview("");
        onSignatureUploaded();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al subir la firma");
      }
    } catch (error) {
      alert(
        `Error al subir la firma: ${error instanceof Error ? error.message : "Por favor intenta nuevamente."}`,
      );
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const getDisplayName = () => {
    if (signatureType === "facilitador") {
      const facilitador = facilitadores.find(
        (f) => f.id.toString() === selectedFacilitador,
      );
      return facilitador ? toTitleCase(facilitador.nombre_apellido || "") : "";
    }
    return representanteName;
  };

  const isFormValid = () => {
    if (!selectedFile) return false;
    if (signatureType === "facilitador") return selectedFacilitador !== "";
    if (signatureType === "representante_sha")
      return representanteName.trim() !== "";
    return false;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Subir Nueva Firma
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form Section */}
        <div className="space-y-4">
          {/* Signature Type Selection - Moved to top */}
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
              <option value="facilitador">Facilitador</option>
              <option value="representante_sha">Representante SHA</option>
            </select>
          </div>

          {/* Conditional fields based on signature type */}
          {signatureType === "facilitador" ? (
            <div>
              <label
                htmlFor="facilitador-select"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Facilitador *
              </label>
              <select
                id="facilitador-select"
                value={selectedFacilitador}
                onChange={(e) => setSelectedFacilitador(e.target.value)}
                disabled={loadingFacilitadores}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="">
                  {loadingFacilitadores
                    ? "Cargando facilitadores..."
                    : "Selecciona un facilitador..."}
                </option>
                {facilitadores.map((facilitador) => (
                  <option
                    key={facilitador.id}
                    value={facilitador.id.toString()}
                  >
                    {toTitleCase(facilitador.nombre_apellido || "")}
                  </option>
                ))}
              </select>
              {facilitadores.length === 0 && !loadingFacilitadores && (
                <p className="text-xs text-amber-600 mt-1">
                  No hay facilitadores disponibles. Todos ya tienen firma
                  registrada.
                </p>
              )}
            </div>
          ) : (
            <div>
              <label
                htmlFor="representante-name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Nombre del Representante SHA *
              </label>
              <input
                type="text"
                id="representante-name"
                value={representanteName}
                onChange={(e) => setRepresentanteName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Juan Pérez - Representante SHA"
              />
            </div>
          )}

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
            disabled={uploading || !isFormValid() || loadingFacilitadores}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {uploading ? "Subiendo..." : "Subir Firma"}
          </button>
        </div>

        {/* Preview Section */}
        <div>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 h-64 flex items-center justify-center">
            {preview ? (
              <div className="text-center">
                <img
                  src={preview}
                  alt="Vista previa de la firma"
                  className="max-w-full max-h-40 object-contain mx-auto mb-2"
                />
                <p className="text-sm text-gray-600 font-medium">
                  {getDisplayName()}
                </p>
                <p className="text-xs text-gray-500">
                  {signatureType === "facilitador"
                    ? "Facilitador"
                    : "Representante SHA"}
                </p>
              </div>
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
                <p className="text-xs mt-1">
                  {signatureType === "facilitador"
                    ? "Selecciona un facilitador y una imagen"
                    : "Ingresa el nombre y una imagen"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
