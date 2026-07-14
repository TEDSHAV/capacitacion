"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, memo, useState } from "react";
import Image from "next/image";
import { Department, SidebarProps } from "@/types/dashboard";
import { ChevronLeft, ChevronRight, Home, Users, FileText, Settings } from "lucide-react";

const Sidebar = ({ departamentos }: SidebarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedDepartment, setExpandedDepartment] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    <div className={`bg-gray-900 text-white h-screen flex flex-col transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Logo Section */}
      <div className={`p-4 border-b border-gray-800 ${
        isCollapsed ? 'flex justify-center' : ''
      }`}>
        <div className={`flex items-center ${
          isCollapsed ? 'justify-center' : 'justify-between'
        }`}>
          {/* Logo */}
          <div className={`flex items-center justify-center ${
            isCollapsed ? '' : 'flex-1'
          }`}>
            <Image 
              src="/logo-dark-theme.png" 
              alt="Logo de SHA de Venezuela" 
              width={isCollapsed ? 73 : 125}
              height={isCollapsed ? 73 : 125}
              className="object-contain cursor-pointer hover:opacity-80 transition-opacity duration-200"
              onClick={() => router.push('/dashboard')}
            />
          </div>
          
          {/* Toggle button - only show when not collapsed */}
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors duration-200"
              title="Contraer sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Toggle button for collapsed state */}
        {isCollapsed && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full p-2 rounded-lg hover:bg-gray-800 transition-colors duration-200 flex justify-center mt-2"
            title="Expandir sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Navigation Section */}
      <div className={`flex-1 overflow-y-auto ${
        isCollapsed ? 'p-2' : 'p-6'
      }`}>
        {/* Dashboard Home Link */}
        <button
          onClick={() => router.push('/dashboard')}
          className={`w-full text-left rounded-lg mb-2 transition-colors duration-200 cursor-pointer flex items-center ${
            pathname === '/dashboard' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
          } ${isCollapsed ? 'p-3 justify-center' : 'px-4 py-3'}`}
          title={isCollapsed ? "Inicio" : ""}
        >
          <Home className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="ml-3">Inicio</span>}
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
                  onClick={() => {
                    if (!isCollapsed) {
                      handleDepartmentClick(department.nombre);
                    } else {
                      router.push(`/dashboard/${department.nombre}`);
                    }
                  }}
                  className={`w-full text-left rounded-lg transition-all duration-200 cursor-pointer flex items-center ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  } ${isCollapsed ? 'p-3 justify-center' : 'px-4 py-3'}`}
                  title={isCollapsed ? department.nombre : ""}
                >
                  {/* Icon based on department name */}
                  <div className="flex-shrink-0">
                    {department.nombre === 'capacitacion' ? (
                      <FileText className="w-5 h-5" />
                    ) : department.nombre === 'negocios' ? (
                      <Users className="w-5 h-5" />
                    ) : (
                      <Settings className="w-5 h-5" />
                    )}
                  </div>
                  {!isCollapsed && (
                    <span className="ml-3 font-medium capitalize">{department.nombre}</span>
                  )}
                  {!isCollapsed && departmentSubmodules.length > 0 && (
                    <ChevronRight 
                      className={`w-4 h-4 ml-auto transition-transform duration-200 ${
                        isExpanded ? 'rotate-90' : ''
                      }`} 
                    />
                  )}
                </button>
                
                {/* Show submodules only when department is expanded and sidebar is not collapsed */}
                {!isCollapsed && isExpanded && departmentSubmodules.length > 0 && (
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
