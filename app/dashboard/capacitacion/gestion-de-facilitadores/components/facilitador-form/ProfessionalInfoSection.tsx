import { FacilitadorFormData, State } from "@/types";

interface ProfessionalInfoSectionProps {
  formData: FacilitadorFormData;
  handleInputChange: (field: keyof FacilitadorFormData, value: any) => void;
  states: State[];
  loadingStates: boolean;
}

export const ProfessionalInfoSection = ({ formData, handleInputChange, states, loadingStates }: ProfessionalInfoSectionProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-md font-medium text-gray-900">Información Profesional</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fuente
          </label>
          <input
            type="text"
            value={formData.fuente}
            onChange={(e) => handleInputChange("fuente", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Referencia o fuente de contacto"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nivel Técnico
          </label>
          <select
            value={formData.nivel_tecnico}
            onChange={(e) => handleInputChange("nivel_tecnico", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Seleccionar nivel...</option>
            <option value="Básico">Básico</option>
            <option value="Intermedio">Intermedio</option>
            <option value="Avanzado">Avanzado</option>
            <option value="Experto">Experto</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Impacto
          </label>
          <select
            value={formData.tipo_impacto}
            onChange={(e) => handleInputChange("tipo_impacto", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Seleccionar tipo...</option>
            <option value="Nacional">Nacional</option>
            <option value="Internacional">Internacional</option>
            <option value="Regional">Regional</option>
            <option value="Local">Local</option>
          </select>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="formacion_docente_certificada"
            checked={formData.formacion_docente_certificada}
            onChange={(e) => handleInputChange("formacion_docente_certificada", e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="formacion_docente_certificada" className="ml-2 block text-sm text-gray-900">
            Formación Docente Certificada
          </label>
        </div>
      </div>
    </div>
  );
};
