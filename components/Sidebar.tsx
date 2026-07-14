"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, memo, useState, useEffect, useRef } from "react";
import Image from "next/image";
import { SidebarProps } from "@/types";
import { ChevronLeft, ChevronRight, Home, Users, FileText, Settings } from "lucide-react";

const Sidebar = ({ departamentos }: SidebarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedDepartment, setExpandedDepartment] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isUserHovering, setIsUserHovering] = useState(false);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Auto-hide timer functionality
  const startAutoHideTimer = useCallback(() => {
    // Clear any existing timer
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
    }
    
    // Only start timer if user is not hovering and sidebar is expanded
    if (!isUserHovering && !isCollapsed) {
      const timer = setTimeout(() => {
        setIsCollapsed(true);
        autoHideTimerRef.current = null;
      }, 1000);
      autoHideTimerRef.current = timer;
    }
  }, [isUserHovering, isCollapsed]);

  const stopAutoHideTimer = useCallback(() => {
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
  }, []);

  // Clear timer when component unmounts
  useEffect(() => {
    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
    };
  }, []);

  // Timer management based on hover state
  useEffect(() => {
    if (!isCollapsed && !isUserHovering) {
      // Sidebar is expanded and user is not hovering - start timer
      startAutoHideTimer();
    } else {
      // Either collapsed or user is hovering - stop timer
      stopAutoHideTimer();
    }
  }, [isCollapsed, isUserHovering, startAutoHideTimer, stopAutoHideTimer]);

  return (
    <div 
      className={`bg-gray-900 text-white h-screen flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
      onMouseEnter={() => {
        setIsUserHovering(true);
        if (isCollapsed) {
          setIsCollapsed(false);
        }
      }}
      onMouseLeave={() => {
        setIsUserHovering(false);
      }}
    >
      {/* Logo Section */}
      <div className={`border-b border-gray-800 ${
        isCollapsed ? 'p-4 flex justify-center' : 'py-2'
      }`}>
        <div className={`flex items-center justify-center ${
          isCollapsed ? '' : ''
        }`}>
          {/* Logo */}
          <div className={`flex items-center justify-center ${
            isCollapsed ? '' : 'flex-1'
          }`}>
            <div className={`relative overflow-hidden transition-all duration-300 w-[32px] h-[32px]`}>
              <Image 
                src="/favicon.ico" 
                alt="Logo de SHA de Venezuela" 
                fill
                className="object-contain cursor-pointer hover:opacity-80 transition-opacity duration-200"
                onClick={() => router.push('/dashboard')}
                sizes="32px"
              />
            </div>
          </div>
        </div>
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
          } ${isCollapsed ? 'w-8 h-8 p-1 justify-center' : 'px-2 py-1 h-8'}`}
          title={isCollapsed ? "Inicio" : ""}
        >
          <Home className="w-4 h-4 flex-shrink-0" />
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
                  } ${isCollapsed ? 'w-8 h-8 p-1 justify-center' : 'px-2 py-1 h-8'}`}
                  title={isCollapsed ? department.nombre : ""}
                >
                  {/* Icon based on department name */}
                  <div className="flex-shrink-0">
                    {department.nombre === 'capacitacion' ? (
                      <FileText className="w-4 h-4" />
                    ) : department.nombre === 'negocios' ? (
                      <Users className="w-4 h-4" />
                    ) : (
                      <Settings className="w-4 h-4" />
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
      
      {/* Toggle Button Section */}
      <div className={`p-4 border-t border-gray-800 ${
        isCollapsed ? 'flex justify-center' : ''
      }`}>
        {isCollapsed ? (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors duration-200"
            title="Expandir sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full p-2 rounded-lg hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center"
            title="Contraer sidebar"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            <span className="text-sm">Contraer</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default memo(Sidebar);
