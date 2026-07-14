"use client";

import { useState, useEffect } from "react";
import { getSignaturesAction, deleteSignatureAction, updateSignatureAction } from "@/app/actions/signatures-crud";
import { getFacilitatorsAction } from "@/app/actions/facilitators-crud";
import { Signature, SignatureType, Facilitador } from "@/types";

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
  const [facilitadores, setFacilitadores] = useState<Facilitador[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load signatures and facilitadores in parallel
      const [signaturesResult, facilitadoresResult] = await Promise.all([
        getSignaturesAction(),
        getFacilitatorsAction()
      ]);

      if (signaturesResult.data) {
        setSignatureList(signaturesResult.data);
      }
      if (facilitadoresResult.data) {
        setFacilitadores(facilitadoresResult.data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres desactivar esta firma? Podrás reactivarla más tarde.")) {
      return;
    }

    try {
      const result = await deleteSignatureAction(id);
      
      if (result.success) {
        setSignatureList(signatureList.filter(sig => sig.id !== parseInt(id)));
        onSignatureDeleted();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert("Error al desactivar la firma. Por favor intenta nuevamente.");
      console.error("Delete error:", error);
    }
  };

  const handleActivate = async (id: string, signatureName: string) => {
    if (!confirm(`¿Estás seguro de que quieres activar la firma de "${signatureName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/signatures/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ activate: true }),
      });

      if (response.ok) {
        alert("Firma activada exitosamente");
        onSignatureDeleted();
      } else {
        throw new Error("Error al activar la firma");
      }
    } catch (error) {
      alert("Error al activar la firma. Por favor intenta nuevamente.");
      console.error("Activate error:", error);
    }
  };

  const signatureTypeLabels: Record<string, string> = {
    "facilitador": "Facilitador",
    "representante_sha": "Representante SHA",
  };

  // Get facilitators that already have signatures
  const facilitadoresWithSignatures = signatureList
    .filter(sig => sig.tipo === 'facilitador')
    .map(sig => {
      const facilitador = facilitadores.find(f => f.firma_id === sig.id);
      return facilitador ? { ...facilitador, signature: sig } : null;
    })
    .filter(Boolean);

  // Get facilitators without signatures
  const facilitadoresWithoutSignatures = facilitadores.filter(
    f => !f.firma_id && facilitadoresWithSignatures.length > 0
  );

  // Get other signature types (representante_sha) - show all regardless of active status
  const otherSignatures = signatureList.filter(sig => sig.tipo !== 'facilitador');

  // Separate active and inactive SHA signatures
  const activeSHASignatures = otherSignatures.filter(sig => sig.is_active);
  const inactiveSHASignatures = otherSignatures.filter(sig => !sig.is_active);

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
                    className="w-full px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors"
                  >
                    Desactivar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active SHA Signatures */}
      {activeSHASignatures.length > 0 && (
        <div className="mb-8">
          <h3 className="text-md font-medium text-gray-900 mb-4">
            {signatureTypeLabels['representante_sha']} - Activos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeSHASignatures.map((signature) => (
              <div
                key={signature.id}
                className="border border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-green-50"
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
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Activo
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(signature.fecha_creacion).toLocaleDateString("es-ES")}
                  </p>
                  <button
                    onClick={() => handleDelete(signature.id.toString())}
                    className="w-full px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors"
                  >
                    Desactivar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inactive SHA Signatures */}
      {inactiveSHASignatures.length > 0 && (
        <div className="mb-8">
          <h3 className="text-md font-medium text-gray-900 mb-4">
            {signatureTypeLabels['representante_sha']} - Inactivos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveSHASignatures.map((signature) => (
              <div
                key={signature.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50"
              >
                <div className="aspect-w-4 aspect-h-3 mb-3">
                  <img
                    src={signature.url_imagen}
                    alt={`Firma de ${signature.nombre}`}
                    className="w-full h-32 object-contain border border-gray-200 rounded bg-white opacity-75"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-700">{signature.nombre}</p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Inactivo
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(signature.fecha_creacion).toLocaleDateString("es-ES")}
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleActivate(signature.id.toString(), signature.nombre)}
                      className="flex-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                    >
                      Activar
                    </button>
                    <button
                      onClick={() => handleDelete(signature.id.toString())}
                      className="flex-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Facilitators without signatures */}
      {facilitadoresWithoutSignatures.length > 0 && (
        <div className="mb-8">
          <h3 className="text-md font-medium text-gray-900 mb-4">
            Facilitadores sin Firma
          </h3>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {facilitadoresWithoutSignatures.map((facilitador) => (
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
      {signatureList.length === 0 && facilitadores.length === 0 && (
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
