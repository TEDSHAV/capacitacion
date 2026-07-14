"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FacilitadorCrud, FacilitatorForm } from "./components";

export default function GestionDeFacilitadoresPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const createMode = searchParams.get('create');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    // Show form if in create or edit mode
    if (createMode || editId) {
      setShowForm(true);
    } else {
      setShowForm(false);
    }
  }, [createMode, editId]);

  const handleFacilitadorSaved = () => {
    // Just hide the form, no navigation needed
    setShowForm(false);
  };

  const handleCancel = () => {
    // Just hide the form, no navigation needed
    setShowForm(false);
  };

  if (showForm) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Facilitadores
          </h1>
          <p className="mt-2 text-gray-600">
            Administra la información de los facilitadores de capacitación
            {editId && (
              <span className="ml-2 text-sm text-blue-600">
                (Modo edición activo para ID: {editId})
              </span>
            )}
            {createMode && (
              <span className="ml-2 text-sm text-green-600">
                (Modo creación activo)
              </span>
            )}
          </p>
        </div>

        <FacilitatorForm 
          onFacilitatorSaved={handleFacilitadorSaved}
          onCancel={handleCancel}
          editId={editId}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Gestión de Facilitadores
        </h1>
        <p className="mt-2 text-gray-600">
          Administra la información de los facilitadores de capacitación
        </p>
      </div>

      <FacilitadorCrud 
        onFacilitadorSaved={() => {}}
        onFacilitadorDeleted={() => {}}
        onFacilitadorUpdated={() => {}}
      />
    </div>
  );
}
