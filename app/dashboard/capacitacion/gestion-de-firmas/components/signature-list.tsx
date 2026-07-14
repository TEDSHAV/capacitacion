"use client";

import { useState, useEffect } from "react";
import { Signature, SignatureType } from "@/types";

interface SignatureListProps {
  signatures: Signature[];
  onSignatureDeleted: () => void;
  refreshKey: number;
}

export const SignatureList = ({ 
  signatures, 
  onSignatureDeleted, 
  refreshKey 
}: SignatureListProps) => {
  const [signatureList, setSignatureList] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSignatures();
  }, [refreshKey]);

  const loadSignatures = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/signatures");
      if (response.ok) {
        const data = await response.json();
        setSignatureList(data);
      }
    } catch (error) {
      console.error("Error loading signatures:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta firma?")) {
      return;
    }

    try {
      const response = await fetch(`/api/signatures/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("Firma eliminada exitosamente");
        onSignatureDeleted();
      } else {
        throw new Error("Error al eliminar la firma");
      }
    } catch (error) {
      alert("Error al eliminar la firma. Por favor intenta nuevamente.");
      console.error("Delete error:", error);
    }
  };

  const signatureTypeLabels: Record<string, string> = {
    "facilitador": "Facilitador",
    "representante_sha": "Representante SHA",
  };

  const groupedSignatures = signatureList.reduce((acc, signature) => {
    if (!acc[signature.tipo]) {
      acc[signature.tipo] = [];
    }
    acc[signature.tipo].push(signature);
    return acc;
  }, {} as Record<string, any[]>);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Firmas Registradas
      </h2>

      {Object.keys(groupedSignatures).length === 0 ? (
        <div className="text-center py-12">
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-2 text-gray-500">No hay firmas registradas</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedSignatures).map(([type, signatures]) => (
            <div key={type}>
              <h3 className="text-md font-medium text-gray-900 mb-4">
                {signatureTypeLabels[type]}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {signatures.map((signature) => (
                  <div
                    key={signature.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-w-4 aspect-h-3 mb-3">
                      <img
                        src={signature.url_imagen}
                        alt={`Firma de ${signature.nombre}`}
                        className="w-full h-32 object-contain border border-gray-200 rounded bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium text-gray-900">{signature.nombre}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(signature.fecha_creacion).toLocaleDateString("es-ES")}
                      </p>
                      <button
                        onClick={() => handleDelete(signature.id.toString())}
                        className="w-full px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
