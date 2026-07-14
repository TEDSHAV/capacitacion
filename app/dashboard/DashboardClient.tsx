"use client";

import { useRouter } from "next/navigation";
import { useMemo, useCallback, memo } from "react";

interface Department {
  id: string;
  nombre: string;
  color: string;
}

interface DashboardClientProps {
  user: any;
  departamentos: Department[];
}

const DashboardClient = ({
  user,
  departamentos,
}: DashboardClientProps) => {
  const router = useRouter();

  // Memoize static color mappings to prevent recreation on every render
  const departmentColors = useMemo(() => ({
    'negocios': 'from-blue-500 to-blue-600',
    'capacitacion': 'from-purple-500 to-purple-600',
    'recursos': 'from-orange-500 to-orange-600',
    'administracion': 'from-yellow-500 to-yellow-600',
    'finanzas': 'from-indigo-500 to-indigo-600',
    'operaciones': 'from-red-500 to-red-600',
    'calidad': 'from-cyan-500 to-cyan-600'
  } as Record<string, string>), []);

  // Memoize light gradients array
  const lightGradients = useMemo(() => [
    'from-blue-400 to-blue-500',
    'from-green-400 to-green-500', 
    'from-purple-400 to-purple-500',
    'from-orange-400 to-orange-500',
    'from-indigo-400 to-indigo-500',
    'from-pink-400 to-pink-500',
    'from-cyan-400 to-cyan-500',
    'from-amber-400 to-amber-500',
    'from-rose-400 to-rose-500',
    'from-teal-400 to-teal-500'
  ], []);

  // Function to get gradient for department (random if not specified)
  const getDepartmentGradient = useCallback((departmentName: string, index: number) => {
    const normalizedName = departmentName.toLowerCase();
    if (departmentColors[normalizedName]) {
      return departmentColors[normalizedName];
    }
    // Use index-based random assignment for consistency
    return lightGradients[index % lightGradients.length];
  }, [departmentColors, lightGradients]);

  // Memoize the card rendering function
  const renderCardDesign = useCallback((department: any, index: number) => {
    const gradient = getDepartmentGradient(department.nombre, index);
    
    return (
      <div 
        className="relative bg-white rounded-xl shadow-sm hover:shadow-md cursor-pointer transform transition-all duration-300 hover:scale-102 border border-gray-200 overflow-hidden h-full"
        onClick={() => handleDepartmentClick(department.nombre)}
      >
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`}></div>
        <div className="p-6 flex flex-col items-center justify-center text-center h-full">
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br ${gradient} mb-4 flex items-center justify-center shadow-sm overflow-hidden">
            <img 
              src="/favicon.ico" 
              alt="Favicon" 
              className="w-12 h-12 object-contain"
            />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {department.nombre.toUpperCase()}
          </h3>
         
        </div>
      </div>
    );
  }, [getDepartmentGradient]);

  // Memoize department click handler
  const handleDepartmentClick = useCallback((nombreDepartamento: string) => {
    router.push(`/dashboard/${nombreDepartamento}`);
  }, [router]);

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-gray-600">No autenticado</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Simple uniform grid layout - memoized to prevent recreation
  const gridLayout = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
    minHeight: '400px'
  }), []);

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Bienvenido al Panel de Administración
          </h1>
          <p className="mt-2 text-gray-600">
            Selecciona un departamento para administrar sus módulos y recursos
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-6">
          <div style={gridLayout}>
            {departamentos.map((department, index) => (
              <div key={department.id}>
                {renderCardDesign(department, index)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(DashboardClient);
