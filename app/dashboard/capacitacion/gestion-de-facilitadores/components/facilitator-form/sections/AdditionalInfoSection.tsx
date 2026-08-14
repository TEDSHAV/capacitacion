import { AdditionalInfoSectionProps } from "@/types";
import { SectionCard } from "./SectionCard";
import { StickyNote } from "lucide-react";

export const AdditionalInfoSection = ({
  formData,
  handleInputChange,
}: AdditionalInfoSectionProps) => {
  return (
    <SectionCard title="Información Adicional" icon={<StickyNote className="w-4 h-4" />}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Notas y Observaciones
        </label>
        <textarea
          value={formData.notas_observaciones}
          onChange={(e) =>
            handleInputChange("notas_observaciones", e.target.value)
          }
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Notas adicionales sobre el facilitador..."
        />
      </div>
    </SectionCard>
  );
};
