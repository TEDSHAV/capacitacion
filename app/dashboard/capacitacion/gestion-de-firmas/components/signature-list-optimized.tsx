"use client";

import { useState, useEffect, useMemo } from "react";
import { Signature, SignatureType, Facilitador } from "@/types";

interface SignatureListProps {
  signatures: Signature[];
  facilitadores: Facilitador[];
  onSignatureDeleted: () => void;
  refreshKey: number;
}

export const SignatureListOptimized = ({ 
  signatures, 
  facilitadores,
  onSignatureDeleted, 
  refreshKey 
}: SignatureListProps) => {
  const [loading, setLoading] = useState(false);

  // Memoized computations to avoid re-renders
  const { facilitadoresWithSignatures, otherSignatures, facilitatorsWithoutSignatures } = useMemo(() => {
    // Get facilitators that already have signatures
    const facilitatorsWithSigs = signatures
      .filter(sig => sig.tipo === 'facilitador')
      .map(sig => {
        const facilitador = facilitadores.find(f => f.firma_id === sig.id);
        return facilitador ? { ...facilitador, signature: sig } : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // Get facilitators without signatures
    const facilitatorsWithoutSigs = facilitadores.filter(
      f => !f.firma_id && facilitatorsWithSigs.length > 0
    );

    // Get other signature types (representante_sha) - show all regardless of active status
    const otherSigs = signatures.filter(sig => sig.tipo !== 'facilitador');

    return {
      facilitadoresWithSignatures: facilitatorsWithSigs,
      otherSignatures: otherSigs,
      facilitatorsWithoutSignatures: facilitatorsWithoutSigs
    };
  }, [signatures, facilitadores]);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres desactivar esta firma? Podrás reactivarla más tarde.")) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/signatures/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("Firma desactivada exitosamente");
        onSignatureDeleted();
      } else {
        throw new Error("Error al desactivar la firma");
      }
    } catch (error) {
      alert("Error al desactivar la firma. Por favor intenta nuevamente.");
      console.error("Delete error:", error);
    } finally {
      setLoading(false);
    }
  };

  const signatureTypeLabels: Record<string, string> = {
    "facilitador": "Facilitador",
    "representante_sha": "Representante SHA",
  };

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

      {/* Facilitators with signatures */}
      {facilitadoresWithSignatures.length > 0 && (
        <div className="mb-8">
          <h3 className="text-md font-medium text-gray-900 mb-4">
            Firmas de Facilitadores
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {facilitadoresWithSignatures.map((item: any) => (
              <div
                key={item.signature.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="aspect-w-4 aspect-h-3 mb-3">
                  <img
                    src={item.signature.url_imagen}
                    alt={`Firma de ${item.nombre_apellido}`}
                    className="w-full h-32 object-contain border border-gray-200 rounded bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-gray-900">{item.nombre_apellido}</p>
                  <p className="text-sm text-gray-500">
                    {item.email || 'Sin email'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(item.signature.fecha_creacion).toLocaleDateString("es-ES")}
                  </p>
                  <button
                    onClick={() => handleDelete(item.signature.id.toString())}
                    disabled={loading}
                    className="w-full px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Desactivando...' : 'Desactivar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other signature types */}
      {otherSignatures.length > 0 && (
        <div className="mb-8">
          <h3 className="text-md font-medium text-gray-900 mb-4">
            {signatureTypeLabels['representante_sha']}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherSignatures.map((signature) => (
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
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{signature.nombre}</p>
                    {signature.tipo === 'representante_sha' && (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          signature.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {signature.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(signature.fecha_creacion).toLocaleDateString("es-ES")}
                  </p>
                  <button
                    onClick={() => handleDelete(signature.id.toString())}
                    disabled={loading}
                    className="w-full px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Desactivando...' : 'Desactivar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Facilitators without signatures */}
      {facilitatorsWithoutSignatures.length > 0 && (
        <div className="mb-8">
          <h3 className="text-md font-medium text-gray-900 mb-4">
            Facilitadores sin Firma
          </h3>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {facilitatorsWithoutSignatures.map((facilitador: any) => (
                <div key={facilitador.id} className="flex items-center space-x-3 p-2 bg-white rounded border border-amber-100">
                  <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                  <span className="text-sm text-gray-700">{facilitador.nombre_apellido}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-700 mt-3">
              Estos facilitadores aún no tienen firma registrada.
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {signatures.length === 0 && facilitadores.length === 0 && (
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
          {facilitadores.length === 0 && (
            <p className="text-sm text-gray-400 mt-1">
              Primero registra algunos facilitadores para poder agregar sus firmas.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
