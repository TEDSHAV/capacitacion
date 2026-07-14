"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, memo } from "react";
import Image from "next/image";
import { Department, SidebarProps } from "@/types/dashboard";

const Sidebar = ({ departamentos }: SidebarProps) => {
  const router = useRouter();
  const pathname = usePathname();

  // Memoize department click handler
  const handleDepartmentClick = useCallback((nombreDepartamento: string) => {
    router.push(`/dashboard/${nombreDepartamento}`);
  }, [router]);

  // Check if a department is currently active
  const isActiveDepartment = useCallback((departmentName: string) => {
    return pathname.includes(`/dashboard/${departmentName}`) || pathname === '/dashboard';
  }, [pathname]);

  return (
    <div className="w-64 bg-gray-900 text-white h-screen flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-center mb-4">
          <Image 
            src="/logo-dark-theme.png" 
            alt="Logo de la Empresa" 
            width={120} 
            height={120}
            loading='lazy'
            className="h-12 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity duration-200"
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
            
            return (
              <button
                key={department.id}
                onClick={() => handleDepartmentClick(department.nombre)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    isActive ? 'bg-white' : 'bg-gray-400'
                  }`}></div>
                  <span className="font-medium capitalize">{department.nombre}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default memo(Sidebar);
