"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FacilitatorManagement } from "./components/facilitator-management";

export default function GestionDeFacilitadoresPage() {
  const router = useRouter();

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

      <FacilitatorManagement />
    </div>
  );
}
