"use client";

import { useState } from "react";
import { createControlSequence } from "@/app/actions/control-sequences";
import { ControlSequenceFormData } from "@/types";

interface SequenceConfigFormProps {
  onSuccess: () => void;
  disabled?: boolean;
}

export default function SequenceConfigForm({
  onSuccess,
  disabled = false,
}: SequenceConfigFormProps) {
  const [formData, setFormData] = useState<ControlSequenceFormData>({
    nro_libro: 378,
    nro_hoja: 1,
    nro_linea: 1,
    nro_control: 281201755304,
    notes: "Migración desde sistema anterior",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "notes" ? value : value === "" ? "" : parseInt(value, 10),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate inputs
    if (
      !formData.nro_libro ||
      !formData.nro_hoja ||
      !formData.nro_linea ||
      !formData.nro_control
    ) {
      setError("Todos los campos numéricos son requeridos");
      return;
    }

    try {
      setLoading(true);

      const result = await createControlSequence(formData);

      if (!result.success) {
        setError(result.message || "Error al crear la configuración");
        return;
      }

      setSuccess(true);
      setFormData({
        nro_libro: 1,
        nro_hoja: 1,
        nro_linea: 1,
        nro_control: 1,
        notes: "",
      });

      // Call onSuccess callback after a short delay
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      setError("Error inesperado al crear la configuración");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (disabled) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">
          La configuración está bloqueada porque ya existen certificados
          generados.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-700">
            ✓ Configuración guardada exitosamente
          </p>
        </div>
      )}

      <div>
        <label htmlFor="nro_libro" className="block text-sm font-medium text-gray-700 mb-1">
          Libro Nro. *
        </label>
        <input
          type="number"
          id="nro_libro"
          name="nro_libro"
          value={formData.nro_libro}
          onChange={handleChange}
          min="1"
          required
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
        <p className="text-xs text-gray-500 mt-1">Número del libro (ej: 378)</p>
      </div>

      <div>
        <label htmlFor="nro_hoja" className="block text-sm font-medium text-gray-700 mb-1">
          Hoja Nro. *
        </label>
        <input
          type="number"
          id="nro_hoja"
          name="nro_hoja"
          value={formData.nro_hoja}
          onChange={handleChange}
          min="1"
          max="100"
          required
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
        <p className="text-xs text-gray-500 mt-1">Número de hoja (1-100)</p>
      </div>

      <div>
        <label htmlFor="nro_linea" className="block text-sm font-medium text-gray-700 mb-1">
          Línea Nro. *
        </label>
        <input
          type="number"
          id="nro_linea"
          name="nro_linea"
          value={formData.nro_linea}
          onChange={handleChange}
          min="1"
          max="10"
          required
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
        <p className="text-xs text-gray-500 mt-1">Número de línea (1-10)</p>
      </div>

      <div>
        <label htmlFor="nro_control" className="block text-sm font-medium text-gray-700 mb-1">
          Nro. Control *
        </label>
        <input
          type="number"
          id="nro_control"
          name="nro_control"
          value={formData.nro_control}
          onChange={handleChange}
          min="1"
          required
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
        <p className="text-xs text-gray-500 mt-1">
          Número de control (ej: 281201755304)
        </p>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notas (Opcional)
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes || ""}
          onChange={handleChange}
          disabled={loading}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          placeholder="Ej: Migración desde sistema anterior"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
      >
        {loading ? "Guardando..." : "Guardar Configuración"}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Esta configuración solo puede establecerse una vez, antes de generar
        certificados.
      </p>
    </form>
  );
}
