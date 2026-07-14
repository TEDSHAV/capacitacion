"use client";

import { Signature, CertificateGeneration } from "@/types";
import { FacilitatorSelection } from "@/app/dashboard/capacitacion/gestion-de-facilitadores/components/facilitator-selection";

interface SignatureSectionProps {
  shaSignatures: Signature[];
  facilitatorId?: string;
  shaSignatureId?: string;
  onDataChange: (field: keyof CertificateGeneration, value: any) => void;
}

export const SignatureSection = ({
  shaSignatures,
  facilitatorId,
  shaSignatureId,
  onDataChange,
}: SignatureSectionProps) => {
  const handleFacilitatorChange = async (id: string) => {
    onDataChange("facilitator_id", id);

    if (id) {
      try {
        const { getFacilitatorData } = await import("@/app/actions/facilitators");
        const facilitatorData = await getFacilitatorData(id);
        onDataChange("facilitator_data", facilitatorData);
      } catch (error) {
        // Continue without facilitator data
      }
    } else {
      onDataChange("facilitator_data", null);
    }
  };

  const displayName = (() => {
    if (shaSignatureId) {
      const selected = shaSignatures.find(
        (sig: Signature) => sig.id.toString() === shaSignatureId,
      );
      if (selected) return selected.nombre;
    }
    const active = shaSignatures.find((sig: Signature) => sig.is_active);
    return active?.nombre || "No hay firma SHA activa";
  })();

  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Firmas del Certificado
      </h3>

      {/* Facilitator Selection */}
      <div className="mb-4">
        <FacilitatorSelection
          selectedFacilitatorId={facilitatorId}
          onFacilitatorChange={handleFacilitatorChange}
        />
      </div>

      {/* SHA Representative Signature */}
      <div>
        <label
          htmlFor="sha-signature"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Firma del Representante SHA
        </label>
        <input
          type="text"
          id="sha-signature"
          value={displayName}
          readOnly
          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
          placeholder="No hay firma SHA activa"
        />
        <p className="text-xs text-gray-500 mt-1">
          Las firmas SHA se gestionan en el módulo de Gestión de Firmas.
          <a
            href="/dashboard/capacitacion/gestion-de-firmas"
            className="text-blue-600 hover:underline ml-1"
          >
            Gestionar firmas SHA
          </a>
        </p>
      </div>
    </div>
  );
};
