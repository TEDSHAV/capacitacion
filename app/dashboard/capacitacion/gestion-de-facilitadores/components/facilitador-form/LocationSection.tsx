import { FacilitadorFormData, State, City } from "@/types";
import { useState } from "react";

interface LocationSectionProps {
  formData: FacilitadorFormData;
  handleInputChange: (field: keyof FacilitadorFormData, value: any) => void;
  states: State[];
  cities: City[];
  loadingStates: boolean;
  loadingCities: boolean;
  onAddCity: (stateId: number, cityName: string) => Promise<void>;
}

export const LocationSection = ({ formData, handleInputChange, states, cities, loadingStates, loadingCities, onAddCity }: LocationSectionProps) => {
  const [showAddCityBase, setShowAddCityBase] = useState(false);
  const [showAddCityGeo, setShowAddCityGeo] = useState(false);
  const [newCityNameBase, setNewCityNameBase] = useState("");
  const [newCityNameGeo, setNewCityNameGeo] = useState("");
  const [addingCity, setAddingCity] = useState(false);

  const filteredCitiesBase = cities.filter(city => city.id_estado === formData.id_estado_base);
  const filteredCitiesGeo = cities.filter(city => city.id_estado === formData.id_estado_geografico);

  const handleAddCity = async (stateId: number | null, cityName: string, type: 'base' | 'geo') => {
    if (!stateId || !cityName.trim()) return;
    
    setAddingCity(true);
    try {
      await onAddCity(stateId, cityName.trim());
      if (type === 'base') {
        setNewCityNameBase("");
        setShowAddCityBase(false);
      } else {
        setNewCityNameGeo("");
        setShowAddCityGeo(false);
      }
    } catch (error) {
      alert("Error al agregar ciudad: " + (error instanceof Error ? error.message : "Error desconocido"));
    } finally {
      setAddingCity(false);
    }
  };

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
            onChange={(e) => {
              handleInputChange("id_estado_base", e.target.value ? parseInt(e.target.value) : null);
              handleInputChange("id_ciudad_base", null);
            }}
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
            Ciudad Base
          </label>
          <div className="flex gap-2">
            <select
              value={formData.id_ciudad_base || ""}
              onChange={(e) => handleInputChange("id_ciudad_base", e.target.value ? parseInt(e.target.value) : null)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!formData.id_estado_base || loadingCities}
            >
              <option value="">Seleccionar ciudad...</option>
              {filteredCitiesBase.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.nombre_ciudad}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowAddCityBase(!showAddCityBase)}
              className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!formData.id_estado_base || addingCity}
              title="Agregar nueva ciudad"
            >
              +
            </button>
          </div>
          {showAddCityBase && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newCityNameBase}
                onChange={(e) => setNewCityNameBase(e.target.value)}
                placeholder="Nombre de la nueva ciudad"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleAddCity(formData.id_estado_base, newCityNameBase, 'base')}
              />
              <button
                type="button"
                onClick={() => handleAddCity(formData.id_estado_base, newCityNameBase, 'base')}
                disabled={addingCity || !newCityNameBase.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {addingCity ? 'Agregando...' : 'Agregar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddCityBase(false);
                  setNewCityNameBase("");
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          )}
          {!formData.id_estado_base && (
            <p className="text-xs text-gray-500 mt-1">Selecciona un estado primero</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estado Geográfico
          </label>
          <select
            value={formData.id_estado_geografico || ""}
            onChange={(e) => {
              handleInputChange("id_estado_geografico", e.target.value ? parseInt(e.target.value) : null);
              handleInputChange("id_ciudad_geografico", null);
            }}
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
            Ciudad Geográfica
          </label>
          <div className="flex gap-2">
            <select
              value={formData.id_ciudad_geografico || ""}
              onChange={(e) => handleInputChange("id_ciudad_geografico", e.target.value ? parseInt(e.target.value) : null)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!formData.id_estado_geografico || loadingCities}
            >
              <option value="">Seleccionar ciudad...</option>
              {filteredCitiesGeo.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.nombre_ciudad}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowAddCityGeo(!showAddCityGeo)}
              className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!formData.id_estado_geografico || addingCity}
              title="Agregar nueva ciudad"
            >
              +
            </button>
          </div>
          {showAddCityGeo && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newCityNameGeo}
                onChange={(e) => setNewCityNameGeo(e.target.value)}
                placeholder="Nombre de la nueva ciudad"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleAddCity(formData.id_estado_geografico, newCityNameGeo, 'geo')}
              />
              <button
                type="button"
                onClick={() => handleAddCity(formData.id_estado_geografico, newCityNameGeo, 'geo')}
                disabled={addingCity || !newCityNameGeo.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {addingCity ? 'Agregando...' : 'Agregar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddCityGeo(false);
                  setNewCityNameGeo("");
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          )}
          {!formData.id_estado_geografico && (
            <p className="text-xs text-gray-500 mt-1">Selecciona un estado primero</p>
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
          placeholder="Dirección completa incluyendo calle, edificio, etc."
        />
      </div>
    </div>
  );
};
