"use client";

import { useState, useEffect } from "react";

export default function GestionCertificadosPage() {
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState([]);

  useEffect(() => {
    // Load certificates data
    const loadData = async () => {
      try {
        // TODO: Implement certificate fetching logic
        setLoading(false);
      } catch (error) {
        console.error("Error loading certificates:", error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Gestión de Certificados
        </h1>
        <p className="mt-2 text-gray-600">
          Administra los certificados emitidos y su historial
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">
            Funcionalidad de gestión de certificados en desarrollo
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Aquí podrás ver, buscar y gestionar todos los certificados emitidos
          </p>
        </div>
      </div>
    </div>
  );
}
