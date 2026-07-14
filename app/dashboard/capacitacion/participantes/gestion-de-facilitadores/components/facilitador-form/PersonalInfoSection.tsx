import { FacilitadorFormData } from "@/types";

interface PersonalInfoSectionProps {
  formData: FacilitadorFormData;
  handleInputChange: (field: keyof FacilitadorFormData, value: any) => void;
}

export const PersonalInfoSection = ({ formData, handleInputChange }: PersonalInfoSectionProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-md font-medium text-gray-900">Información Personal</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre y Apellido *
          </label>
          <input
            type="text"
            value={formData.nombre_apellido}
            onChange={(e) => handleInputChange("nombre_apellido", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Nombre completo"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cédula *
          </label>
          <input
            type="text"
            value={formData.cedula}
            onChange={(e) => handleInputChange("cedula", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="V-XXXXXXXX-X"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="correo@ejemplo.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Teléfono *
          </label>
          <input
            type="tel"
            value={formData.telefono}
            onChange={(e) => handleInputChange("telefono", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="+58 414 XXX XXXX"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            RIF
          </label>
          <input
            type="text"
            value={formData.rif}
            onChange={(e) => handleInputChange("rif", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="J-XXXXXXXX-X"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Año de Ingreso
          </label>
          <input
            type="number"
            value={formData.ano_ingreso}
            onChange={(e) => handleInputChange("ano_ingreso", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="2023"
            min="1900"
            max={new Date().getFullYear()}
          />
        </div>
      </div>
    </div>
  );
};
