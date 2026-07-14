import { PlantillaCurso } from "./types";
import { Pagination } from "./Pagination";
import { Button } from "@/components/ui/button";
import { stripHtml } from "@/lib/strip-html";

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
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Search Bar */}
      <div className="px-6 py-4 border-b border-gray-200">
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
      <div className="overflow-x-auto w-full">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Descripción
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Curso
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Empresa
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Creado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  Cargando...
                </td>
              </tr>
            ) : plantillas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No se encontraron plantillas
                </td>
              </tr>
            ) : (
              plantillas.map((plantilla) => (
                <tr key={plantilla.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {plantilla.descripcion}
                    </div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {stripHtml(plantilla.contenido || '').substring(0, 100)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {plantilla.curso_nombre || 'General'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {plantilla.empresa_nombre || 'General'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      plantilla.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {plantilla.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {plantilla.created_at 
                      ? new Date(plantilla.created_at).toLocaleDateString('es-ES')
                      : 'N/A'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(plantilla)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(plantilla.id)}
                      >
                        Eliminar
                      </Button>
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
