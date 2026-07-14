import { FacilitadorFormData, State } from "@/types";

interface LocationSectionProps {
  formData: FacilitadorFormData;
  handleInputChange: (field: keyof FacilitadorFormData, value: any) => void;
  states: State[];
  loadingStates: boolean;
}

export const LocationSection = ({ formData, handleInputChange, states, loadingStates }: LocationSectionProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-md font-medium text-gray-900">Ubicación</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estado Base
          </label>
          <select
            value={formData.id_estado_base || ""}
            onChange={(e) => handleInputChange("id_estado_base", e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loadingStates}
          >
            <option value="">Seleccionar estado...</option>
            {states.map((state) => (
              <option key={state.id} value={state.id}>
                {state.nombre_estado}
              </option>
            ))}
          </select>
          {loadingStates && (
            <p className="text-xs text-gray-500 mt-1">Cargando estados...</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estado Geográfico
          </label>
          <select
            value={formData.id_estado_geografico || ""}
            onChange={(e) => handleInputChange("id_estado_geografico", e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loadingStates}
          >
            <option value="">Seleccionar estado...</option>
            {states.map((state) => (
              <option key={state.id} value={state.id}>
                {state.nombre_estado}
              </option>
            ))}
          </select>
          {loadingStates && (
            <p className="text-xs text-gray-500 mt-1">Cargando estados...</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dirección Completa
        </label>
        <textarea
          value={formData.direccion}
          onChange={(e) => handleInputChange("direccion", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Dirección completa incluyendo ciudad, municipio, etc."
        />
      </div>
    </div>
  );
};
