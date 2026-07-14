import { FacilitadorFormData } from "@/types";

interface AdditionalInfoSectionProps {
  formData: FacilitadorFormData;
  handleInputChange: (field: keyof FacilitadorFormData, value: any) => void;
}

export const AdditionalInfoSection = ({ formData, handleInputChange }: AdditionalInfoSectionProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-md font-medium text-gray-900">Información Adicional</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Conocimientos Técnicos
        </label>
        <textarea
          value={formData.ficha_tecnica}
          onChange={(e) => handleInputChange("ficha_tecnica", e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Describe los conocimientos técnicos y experiencia del facilitador..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notas y Observaciones
        </label>
        <textarea
          value={formData.notas_observaciones}
          onChange={(e) => handleInputChange("notas_observaciones", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Notas adicionales sobre el facilitador..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Calificación (para implementación futura)
        </label>
        <input
          type="number"
          min="1"
          max="5"
          step="0.1"
          value={formData.calificacion || ""}
          onChange={(e) => handleInputChange("calificacion", e.target.value ? parseFloat(e.target.value) : null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="1-5"
          disabled
        />
        <p className="text-xs text-gray-500 mt-1">Esta funcionalidad se implementará próximamente</p>
      </div>
    </div>
  );
};
