"use client";

import React, { useState, useEffect } from "react";
import { PersonalInfoSectionProps } from "@/types";

export const PersonalInfoSection = ({
  formData,
  handleInputChange,
}: PersonalInfoSectionProps) => {
  const [cedulaType, setCedulaType] = useState("V");
  const [cedulaNumber, setCedulaNumber] = useState("");
  const [rifType, setRifType] = useState("J");
  const [rifNumber, setRifNumber] = useState("");

  // Parse existing values on mount or when formData changes
  useEffect(() => {
    if (formData.cedula) {
      const parts = formData.cedula.split("-");
      if (parts.length === 2) {
        setCedulaType(parts[0].toUpperCase());
        setCedulaNumber(parts[1]);
      } else {
        setCedulaNumber(formData.cedula);
      }
    }
    if (formData.rif) {
      const parts = formData.rif.split("-");
      if (parts.length === 2) {
        setRifType(parts[0].toUpperCase());
        setRifNumber(parts[1]);
      } else {
        setRifNumber(formData.rif);
      }
    }
  }, [formData.cedula, formData.rif]);

  const handleCedulaTypeChange = (type: string) => {
    setCedulaType(type.toUpperCase());
    if (cedulaNumber) {
      handleInputChange("cedula", `${type.toUpperCase()}-${cedulaNumber}`);
    }
  };

  const handleCedulaNumberChange = (number: string) => {
    const numericOnly = number.replace(/\D/g, "");
    setCedulaNumber(numericOnly);
    if (numericOnly) {
      handleInputChange("cedula", `${cedulaType.toUpperCase()}-${numericOnly}`);
    } else {
      handleInputChange("cedula", "");
    }
  };

  const handleRifTypeChange = (type: string) => {
    setRifType(type.toUpperCase());
    if (rifNumber) {
      handleInputChange("rif", `${type.toUpperCase()}-${rifNumber}`);
    }
  };

  const handleRifNumberChange = (number: string) => {
    const numericOnly = number.replace(/\D/g, "");
    setRifNumber(numericOnly);
    if (numericOnly) {
      handleInputChange("rif", `${rifType.toUpperCase()}-${numericOnly}`);
    } else {
      handleInputChange("rif", "");
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-md font-medium text-gray-900">
        Información Personal
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre y Apellido *
          </label>
          <input
            type="text"
            value={formData.nombre_apellido}
            onChange={(e) =>
              handleInputChange("nombre_apellido", e.target.value)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ej: Juan Pérez"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cédula *
          </label>
          <div className="flex gap-2">
            <select
              value={cedulaType}
              onChange={(e) => handleCedulaTypeChange(e.target.value)}
              className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="V">V</option>
              <option value="E">E</option>
            </select>
            <input
              type="text"
              value={cedulaNumber}
              onChange={(e) => handleCedulaNumberChange(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: 12345678"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            RIF
          </label>
          <div className="flex gap-2">
            <select
              value={rifType}
              onChange={(e) => handleRifTypeChange(e.target.value)}
              className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="V">V</option>
              <option value="E">E</option>
              <option value="J">J</option>
              <option value="G">G</option>
            </select>
            <input
              type="text"
              value={rifNumber}
              onChange={(e) => handleRifNumberChange(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: 123456789"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Teléfono *
          </label>
          <input
            type="tel"
            value={formData.telefono}
            onChange={(e) =>
              handleInputChange("telefono", e.target.value.replace(/\D/g, ""))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ej: 04121234567"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Correo Electrónico
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ej: correo@ejemplo.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha de Ingreso
          </label>
          <input
            type="date"
            value={formData.fecha_ingreso}
            onChange={(e) => handleInputChange("fecha_ingreso", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Fuente
        </label>
        <select
          value={formData.fuente}
          onChange={(e) => handleInputChange("fuente", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Seleccionar fuente...</option>
          <option value="recomendacion">Recomendación</option>
          <option value="linkedin">LinkedIn</option>
          <option value="web">Página Web</option>
          <option value="rrss">Redes Sociales</option>
          <option value="interno">Referencia Interna</option>
          <option value="otro">Otro</option>
        </select>
      </div>
    </div>
  );
};
