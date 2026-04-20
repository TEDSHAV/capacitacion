import { PlantillaCurso } from "./types";
import { Pagination } from "./Pagination";

interface PlantillaCursoListProps {
  plantillas: PlantillaCurso[];
  courses: any[];
  empresas: any[];
  isLoading: boolean;
  onEdit: (plantilla: PlantillaCurso) => void;
  onDelete: (id: number) => void;
  onSearch: (term: string) => void;
  searchTerm: string;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PlantillaCursoList({
  plantillas,
  courses,
  empresas,
  isLoading,
  onEdit,
  onDelete,
  onSearch,
  searchTerm,
  currentPage,
  totalPages,
  onPageChange
}: PlantillaCursoListProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value);
  };

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="max-w-md">
          <input
            type="text"
            placeholder="Buscar plantillas..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="w-full">
        <table className="w-full table-fixed divide-y divide-gray-200">
          <colgroup>
            <col className="w-[35%]" />
            <col className="w-[20%]" />
            <col className="w-[17%]" />
            <col className="w-[8%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Título
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Curso
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Empresa
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Creado
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                  Cargando...
                </td>
              </tr>
            ) : plantillas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                  No se encontraron plantillas
                </td>
              </tr>
            ) : (
              plantillas.map((plantilla) => (
                <tr key={plantilla.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {plantilla.titulo || plantilla.descripcion}
                    </div>
                    <div className="text-xs text-gray-500 truncate mt-0.5">
                      {plantilla.contenido?.substring(0, 80)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 truncate">
                    {plantilla.curso_nombre || 'General'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 truncate">
                    {plantilla.empresa_nombre || 'General'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                      plantilla.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {plantilla.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {plantilla.created_at 
                      ? new Date(plantilla.created_at).toLocaleDateString('es-ES')
                      : 'N/A'
                    }
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => onEdit(plantilla)}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onDelete(plantilla.id)}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-gray-200">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
