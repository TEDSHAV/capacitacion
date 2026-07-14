"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, memo, useState } from "react";
import Image from "next/image";
import { Department, SidebarProps } from "@/types/dashboard";

const Sidebar = ({ departamentos }: SidebarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedDepartment, setExpandedDepartment] = useState<string | null>(null);

  // Memoize department click handler
  const handleDepartmentClick = useCallback((nombreDepartamento: string) => {
    if (expandedDepartment === nombreDepartamento) {
      setExpandedDepartment(null);
    } else {
      setExpandedDepartment(nombreDepartamento);
      router.push(`/dashboard/${nombreDepartamento}`);
    }
  }, [router, expandedDepartment]);

  // Check if a department is currently active
  const isActiveDepartment = useCallback((departmentName: string) => {
    return pathname.includes(`/dashboard/${departmentName}`) || pathname === '/dashboard';
  }, [pathname]);

  // Define submodules for each department
  const submodules = {
    capacitacion: [
      { name: 'Gestión de Cursos', path: '/dashboard/capacitacion/gestion-cursos' },
      { name: 'Generación de Certificados', path: '/dashboard/capacitacion/generacion-certificado' }
    ],
    negocios: [
      { name: 'Gestión de Clientes', path: '/dashboard/negocios/gestion-de-clientes' },
      { name: 'Gestión de OSIs', path: '/dashboard/negocios/gestion-de-osis' }
    ]
  };

  // Check if a submodule is active
  const isActiveSubmodule = useCallback((path: string) => {
    return pathname === path;
  }, [pathname]);

  return (
    <div className="w-64 bg-gray-900 text-white h-screen flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-800">
        {/* Favicon-style logo indicator */}
        <div className="flex items-center justify-center">
          <Image 
            src="/favicon.ico" 
            alt="Favicon" 
            width={40}
            height={40}
            className="object-contain cursor-pointer hover:opacity-80 transition-opacity duration-200"
            onClick={() => router.push('/dashboard')}
          />
        </div>
      </div>
      
      {/* Navigation Section */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Dashboard Home Link */}
        <button
          onClick={() => router.push('/dashboard')}
          className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-colors duration-200 cursor-pointer ${
            pathname === '/dashboard' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
          }`}
        >
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Inicio</span>
          </div>
        </button>

        {/* Department Links */}
        <div className="space-y-2">
          {departamentos.map((department) => {
            const isActive = isActiveDepartment(department.nombre);
            const departmentSubmodules = submodules[department.nombre as keyof typeof submodules] || [];
            const isExpanded = expandedDepartment === department.nombre;
            
            return (
              <div key={department.id} className="mb-2">
                <button
                  onClick={() => handleDepartmentClick(department.nombre)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-medium capitalize">{department.nombre}</span>
                    {/* Add chevron icon to indicate expand/collapse */}
                    <svg 
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isExpanded ? 'rotate-90' : ''
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
                
                {/* Show submodules only when department is expanded */}
                {isExpanded && departmentSubmodules.length > 0 && (
                  <div className="ml-8 mt-2 space-y-1">
                    {departmentSubmodules.map((submodule, index) => (
                      <button
                        key={index}
                        onClick={() => router.push(submodule.path)}
                        className={`w-full text-left px-4 py-2 rounded-md transition-all duration-200 cursor-pointer text-sm ${
                          isActiveSubmodule(submodule.path)
                            ? 'bg-gray-700 text-white'
                            : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            isActiveSubmodule(submodule.path) ? 'bg-blue-400' : 'bg-gray-500'
                          }`}></div>
                          <span>{submodule.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default memo(Sidebar);
