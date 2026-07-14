"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignatureManagement } from "./components/signature-management";

export default function GestionDeFirmasPage() {
  const router = useRouter();

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Gestión de Firmas
        </h1>
        <p className="mt-2 text-gray-600">
          Administra las firmas digitales para los certificados de capacitación
        </p>
      </div>

      <SignatureManagement />
    </div>
  );
}
