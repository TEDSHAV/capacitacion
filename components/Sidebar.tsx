"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, memo, useState, useEffect, useRef } from "react";
import { SidebarProps } from "@/types";
import { ChevronLeft, ChevronRight, Home, Users, FileText, Settings } from "lucide-react";
import { createClient } from '@/utils/supabase/client';
import { User } from '@/types/dashboard';

// Define submodules for each department - moved outside component to prevent re-creation
const submodules = {
  capacitacion: [
    { name: 'Gestión de Cursos', path: '/dashboard/capacitacion/gestion-cursos' },
    { name: 'Plantillas de Certificados', path: '/dashboard/capacitacion/plantillas-certificados' },
    { name: 'Gestión de Participantes', path: '/dashboard/capacitacion/participantes' },
    { name: 'Consulta de Participantes', path: '/dashboard/capacitacion/consulta-participantes' },
    { name: 'Gestión de Facilitadores', path: '/dashboard/capacitacion/gestion-de-facilitadores' },
    { name: 'Generación de Certificados', path: '/dashboard/capacitacion/generacion-certificado' },
    { name: 'Gestión de Certificados', path: '/dashboard/capacitacion/gestion-certificados' },
    { name: 'Gestión de Firmas', path: '/dashboard/capacitacion/gestion-de-firmas' },
    { name: 'Control de Secuencia', path: '/dashboard/capacitacion/control-secuencia' },
    { name: 'Reportes', path: '/dashboard/capacitacion/reportes' }
  ],
  negocios: [
    { name: 'Gestión de OSIs', path: '/dashboard/negocios/gestion-de-osis' }
  ]
};

const Sidebar = ({ departamentos }: SidebarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedDepartment, setExpandedDepartment] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Memoize department click handler
  const handleDepartmentClick = useCallback((nombreDepartamento: string) => {
    // Always navigate to the department page
    router.push(`/dashboard/${nombreDepartamento}`);
    
    // Toggle expansion state
    if (expandedDepartment === nombreDepartamento) {
      setExpandedDepartment(null);
    } else {
      setExpandedDepartment(nombreDepartamento);
    }
  }, [router, expandedDepartment]);

  // Check if a department is currently active
  const isActiveDepartment = useCallback((departmentName: string) => {
    return pathname.includes(`/dashboard/${departmentName}`) || pathname === '/dashboard';
  }, [pathname]);

  // Check if a submodule is active
  const isActiveSubmodule = useCallback((path: string) => {
    return pathname === path;
  }, [pathname]);

  // Memoized event handlers to prevent re-renders
  const handleMouseEnter = useCallback(() => {
    if (isCollapsed) {
      // Add a small delay before expanding to prevent accidental triggers
      setTimeout(() => {
        if (isCollapsed) {
          setIsCollapsed(false);
        }
      }, 400); // Increased from 250ms to 400ms for better UX
    }
  }, [isCollapsed]);

  const handleMouseLeave = useCallback(() => {
    // Mouse leave functionality removed - no auto-hide
  }, []);

  const handleLogoClick = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  const handleDashboardClick = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed(!isCollapsed);
  }, [isCollapsed]);

  const handleBackClick = useCallback(() => {
    router.back();
  }, [router]);


  return (
    <div 
      className={`bg-gradient-to-b from-gray-900 to-gray-800 text-white h-screen flex flex-col transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-64'
      } shadow-2xl`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Top Section - Same height as navbar (h-20) */}
      <div className={`border-b border-gray-700/50 flex items-center justify-center h-20 backdrop-blur-sm bg-gray-900/80 ${
        isCollapsed ? 'px-2' : 'px-4'
      }`}>
        {/* Back button - only shown when user is authenticated and not on dashboard */}
        {user && pathname !== '/dashboard' ? (
          <button
            onClick={handleBackClick}
            className={`p-2 rounded-md hover:bg-gray-700/50 transition-all duration-300 flex items-center justify-center group ${
              isCollapsed ? 'w-8 h-8' : 'w-12 h-12'
            } hover:shadow-lg hover:transform hover:scale-105`}
            title="Volver"
          >
            <ChevronLeft className={`text-white transition-transform duration-200 group-hover:scale-110 ${isCollapsed ? 'w-4 h-4' : 'w-5 h-5'}`} />
          </button>
        ) : (
          /* Invisible spacer to maintain height symmetry */
          <div className={`${isCollapsed ? 'w-8 h-8' : 'w-12 h-12'}`}></div>
        )}
      </div>  
      
      {/* Navigation Section */}
      <div className={`flex-1 overflow-y-auto sidebar-scrollbar ${
        isCollapsed ? 'p-2' : 'p-6'
      }`}>
        {/* Dashboard Home Link */}
        <button
          onClick={handleDashboardClick}
          className={`sidebar-link w-full text-left rounded-lg mb-2 transition-all duration-300 cursor-pointer flex items-center group ${
            pathname === '/dashboard' 
              ? 'bg-blue-600 text-white transform scale-105 sidebar-neon-active' 
              : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white hover:shadow-lg hover:transform hover:scale-105'
          } ${isCollapsed ? 'w-8 h-8 p-1 justify-center' : 'px-3 py-2 h-10'}`}
          title={isCollapsed ? "Inicio" : ""}
        >
          <Home className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
            pathname === '/dashboard' ? 'scale-110' : 'group-hover:scale-110'
          }`} />
          {!isCollapsed && <span className="ml-3 font-medium">Inicio</span>}
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
                  className={`sidebar-link w-full text-left rounded-lg transition-all duration-300 cursor-pointer flex items-center group ${
                    isActive 
                      ? 'bg-blue-600 text-white transform scale-105 sidebar-neon-active' 
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white hover:shadow-lg hover:transform hover:scale-105'
                  } ${isCollapsed ? 'w-8 h-8 p-1 justify-center' : 'px-3 py-2 h-10'}`}
                  title={isCollapsed ? department.nombre : ""}
                >
                  {/* Icon based on department name */}
                  <div className="flex-shrink-0">
                    {department.nombre === 'capacitacion' ? (
                      <FileText className={`w-4 h-4 transition-transform duration-200 ${
                        isActive ? 'scale-110' : 'group-hover:scale-110'
                      }`} />
                    ) : department.nombre === 'negocios' ? (
                      <Users className={`w-4 h-4 transition-transform duration-200 ${
                        isActive ? 'scale-110' : 'group-hover:scale-110'
                      }`} />
                    ) : (
                      <Settings className={`w-4 h-4 transition-transform duration-200 ${
                        isActive ? 'scale-110' : 'group-hover:scale-110'
                      }`} />
                    )}
                  </div>
                  {!isCollapsed && (
                    <span className="ml-3 font-medium capitalize">{department.nombre}</span>
                  )}
                  {!isCollapsed && departmentSubmodules.length > 0 && (
                    <ChevronRight 
                      className={`w-4 h-4 ml-auto transition-all duration-300 ${
                        isExpanded ? 'rotate-90 text-white' : 'text-gray-400 group-hover:text-white'
                      }`} 
                    />
                  )}
                </button>
                
                {/* Show submodules only when department is expanded and sidebar is not collapsed */}
                {!isCollapsed && isExpanded && departmentSubmodules.length > 0 && (
                  <div className="sidebar-expand ml-8 mt-2 space-y-1">
                    {departmentSubmodules.map((submodule, index) => (
                      <button
                        key={index}
                        onClick={() => router.push(submodule.path)}
                        className={`sidebar-link w-full text-left px-4 py-2 rounded-md transition-all duration-300 cursor-pointer text-sm group ${
                          isActiveSubmodule(submodule.path)
                            ? 'bg-gray-700 text-white shadow-md transform translate-x-1'
                            : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800 hover:transform hover:translate-x-1'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            isActiveSubmodule(submodule.path) 
                              ? 'bg-blue-400 shadow-sm shadow-blue-400/50 scale-125' 
                              : 'bg-gray-500 group-hover:bg-gray-400 group-hover:scale-125'
                          }`}></div>
                          <span className="transition-colors duration-300 group-hover:text-white">{submodule.name}</span>
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
      <div className={`p-4 border-t border-gray-700/50 backdrop-blur-sm bg-gray-900/80 ${
        isCollapsed ? 'flex justify-center' : ''
      }`}>
        {isCollapsed ? (
          <button
            onClick={handleToggleCollapse}
            className="p-2 rounded-lg hover:bg-gray-800 transition-all duration-300 hover:shadow-lg hover:transform hover:scale-105 group"
            title="Expandir sidebar"
          >
            <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
          </button>
        ) : (
          <button
            onClick={handleToggleCollapse}
            className="w-full p-2 rounded-lg hover:bg-gray-800 transition-all duration-300 hover:shadow-lg hover:transform hover:scale-105 flex items-center justify-center group"
            title="Contraer sidebar"
          >
            <ChevronLeft className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
            <span className="text-sm font-medium transition-colors duration-200 group-hover:text-gray-200">Contraer</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default memo(Sidebar);
