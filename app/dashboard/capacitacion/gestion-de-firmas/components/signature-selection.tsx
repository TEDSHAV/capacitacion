"use client";

import { useState, useEffect } from "react";
import { Signature, SignatureType } from "@/types";

interface SignatureSelectionProps {
  facilitatorSignatureId?: string;
  shaSignatureId?: string;
  onFacilitatorChange: (id: string) => void;
  onShaChange: (id: string) => void;
}

export const SignatureSelection = ({
  facilitatorSignatureId,
  shaSignatureId,
  onFacilitatorChange,
  onShaChange,
}: SignatureSelectionProps) => {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSignatures();
  }, []);

  const loadSignatures = async () => {
    try {
      const response = await fetch("/api/signatures");
      if (response.ok) {
        const data = await response.json();
        setSignatures(data);
      }
    } catch (error) {
      console.error("Error loading signatures:", error);
    } finally {
      setLoading(false);
    }
  };

  const facilitatorSignatures = signatures.filter(s => s.type === SignatureType.FACILITADOR);
  const shaSignatures = signatures.filter(s => s.type === SignatureType.REPRESENTANTE_SHA);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Facilitator Signature Selection */}
      <div>
        <label
          htmlFor="facilitator-signature"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Firma del Facilitador
        </label>
        <select
          id="facilitator-signature"
          value={facilitatorSignatureId || ""}
          onChange={(e) => onFacilitatorChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Seleccionar firma...</option>
          {facilitatorSignatures.map((signature) => (
            <option key={signature.id} value={signature.id}>
              {signature.name}
            </option>
          ))}
        </select>
        {facilitatorSignatures.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">
            No hay firmas de facilitadores registradas. 
            <a href="/dashboard/capacitacion/certificados/gestion-de-firmas" className="text-blue-600 hover:underline ml-1">
              Agregar firmas
            </a>
          </p>
        )}
      </div>

      {/* SHA Representative Signature Selection */}
      <div>
        <label
          htmlFor="sha-signature"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Firma del Representante SHA
        </label>
        <select
          id="sha-signature"
          value={shaSignatureId || ""}
          onChange={(e) => onShaChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Seleccionar firma...</option>
          {shaSignatures.map((signature) => (
            <option key={signature.id} value={signature.id}>
              {signature.name}
            </option>
          ))}
        </select>
        {shaSignatures.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">
            No hay firmas de representantes SHA registradas. 
            <a href="/dashboard/capacitacion/certificados/gestion-de-firmas" className="text-blue-600 hover:underline ml-1">
              Agregar firmas
            </a>
          </p>
        )}
      </div>
    </div>
  );
};
