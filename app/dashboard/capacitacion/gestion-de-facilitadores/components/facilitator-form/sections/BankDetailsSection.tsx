"use client";

import React, { useState, useEffect } from "react";
import { BankDetailsSectionProps } from "@/types";
import { SectionCard } from "./SectionCard";
import { CreditCard } from "lucide-react";

export const BankDetailsSection = ({
  formData,
  handleInputChange,
  banks,
  loadingBanks,
  onAddBank,
}: BankDetailsSectionProps) => {
  const [showAddBank, setShowAddBank] = useState(false);
  const [newBankName, setNewBankName] = useState("");
  const [isCedulaTitularDirty, setIsCedulaTitularDirty] = useState(false);
  const [isTelefonoPagoMovilDirty, setIsTelefonoPagoMovilDirty] = useState(false);

  // Initialize dirty state if values already exist (e.g., when editing)
  useEffect(() => {
    if (formData.cedula_titular) {
      setIsCedulaTitularDirty(true);
    }
    if (formData.telefono_pago_movil) {
      setIsTelefonoPagoMovilDirty(true);
    }
  }, []);

  // Auto-populate logic for Pago Móvil
  useEffect(() => {
    // Sync if not manually edited (not dirty)
    if (!isTelefonoPagoMovilDirty && formData.telefono) {
      handleInputChange("telefono_pago_movil", formData.telefono);
    }
    if (!isCedulaTitularDirty && formData.cedula) {
      handleInputChange("cedula_titular", formData.cedula);
    }
  }, [formData.telefono, formData.cedula, isTelefonoPagoMovilDirty, isCedulaTitularDirty]);

  const handleAddBank = async () => {
    if (!newBankName.trim()) return;
    try {
      await onAddBank(newBankName.trim());
      setNewBankName("");
      setShowAddBank(false);
    } catch (error) {
      alert("Error al agregar banco. Por favor intenta nuevamente.");
    }
  };

  const handleAccountNumberChange = (value: string) => {
    const numericOnly = value.replace(/\D/g, "").slice(0, 20);
    handleInputChange("nro_cuenta", numericOnly);
  };

  const handlePhonePagoMovilChange = (value: string) => {
    const numericOnly = value.replace(/\D/g, "").slice(0, 11);
    setIsTelefonoPagoMovilDirty(true);
    handleInputChange("telefono_pago_movil", numericOnly);
  };

  const handleCedulaTitularChange = (value: string) => {
    setIsCedulaTitularDirty(true);
    handleInputChange("cedula_titular", value);
  };

  return (
    <SectionCard title="Datos Bancarios" icon={<CreditCard className="w-4 h-4" />}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Bank Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Banco
          </label>
          {loadingBanks ? (
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          ) : (
            <div className="flex gap-2">
              <select
                value={formData.banco || ""}
                onChange={(e) => handleInputChange("banco", e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar banco...</option>
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.nombre}>
                    {bank.nombre}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddBank(!showAddBank)}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                title="Agregar nuevo banco"
              >
                +
              </button>
            </div>
          )}
          {showAddBank && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                placeholder="Nombre del nuevo banco"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleAddBank}
                className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Agregar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddBank(false);
                  setNewBankName("");
                }}
                className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                X
              </button>
            </div>
          )}
        </div>
        {/* Titular ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Cédula/RIF del Titular
          </label>
          <input
            type="text"
            value={formData.cedula_titular}
            onChange={(e) => handleCedulaTitularChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="V-12345678"
          />
        </div>

        {/* Account Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Número de Cuenta (20 dígitos)
          </label>
          <input
            type="text"
            value={formData.nro_cuenta}
            onChange={(e) => handleAccountNumberChange(e.target.value)}
            maxLength={20}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0102..."
          />
        </div>

        {/* Account Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Tipo de Cuenta
          </label>
          <select
            value={formData.tipo_cuenta}
            onChange={(e) => handleInputChange("tipo_cuenta", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Seleccionar tipo...</option>
            <option value="Ahorros">Ahorros</option>
            <option value="Corriente">Corriente</option>
          </select>
        </div>

        {/* Pago Móvil Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Teléfono Pago Móvil
          </label>
          <input
            type="tel"
            value={formData.telefono_pago_movil}
            onChange={(e) => handlePhonePagoMovilChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0412..."
          />
        </div>

      </div>
    </SectionCard>
  );
};
