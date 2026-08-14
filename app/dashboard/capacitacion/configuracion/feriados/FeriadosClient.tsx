"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Calendar, Plus, Trash2, AlertCircle, Loader2, ArrowLeft, Gauge } from "lucide-react";
import type { Feriado } from "@/app/actions/feriados";
import { createFeriado, deleteFeriado } from "@/app/actions/feriados";

interface Props {
  initialFeriados: Feriado[];
  initialError: string | null;
}

function formatDate(s: string): string {
  const d = new Date(s + "T00:00:00");
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("es-VE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function FeriadosClient({
  initialFeriados,
  initialError,
}: Props) {
  const [feriados, setFeriados] = useState<Feriado[]>(initialFeriados);
  const [error, setError] = useState<string | null>(initialError);
  const [fecha, setFecha] = useState("");
  const [nombre, setNombre] = useState("");
  const [esNacional, setEsNacional] = useState(true);
  const [isPending, startTransition] = useTransition();

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!fecha || !nombre.trim()) return;
    setError(null);
    startTransition(async () => {
      const { error: err } = await createFeriado(fecha, nombre, esNacional);
      if (err) {
        setError(err);
        return;
      }
      // Optimistically add to the list (sorted by fecha desc)
      const newFeriado: Feriado = {
        id: Date.now(), // temporary; will be correct after revalidation
        fecha,
        nombre: nombre.trim(),
        es_nacional: esNacional,
      };
      setFeriados((prev) =>
        [newFeriado, ...prev].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)),
      );
      setFecha("");
      setNombre("");
      setEsNacional(true);
    });
  }

  function handleDelete(id: number) {
    setError(null);
    startTransition(async () => {
      const { error: err } = await deleteFeriado(id);
      if (err) {
        setError(err);
        return;
      }
      setFeriados((prev) => prev.filter((f) => f.id !== id));
    });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard/capacitacion/indicadores"
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver a indicadores
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-5 h-5 text-sky-600" />
          <h1 className="text-xl font-bold text-gray-900">
            Calendario de Feriados
          </h1>
        </div>
        <p className="text-sm text-gray-500">
          Gestiona los días feriados venezolanos utilizados para el cálculo de
          días hábiles en los indicadores de certificados. Los feriados se
          excluyen del conteo de días hábiles para el SLA de 3 días.
        </p>
        <Link
          href="/dashboard/capacitacion/indicadores"
          className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-sky-600 hover:text-sky-700"
        >
          <Gauge className="w-3.5 h-3.5" />
          Ver indicadores de certificados
        </Link>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Error</p>
            <p className="text-xs text-red-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Add feriado form */}
      <form
        onSubmit={handleAdd}
        className="bg-white border border-gray-200 rounded-xl p-5 mb-6"
      >
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          Agregar feriado
        </h2>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-700">
              Nombre del feriado
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Ej: Día de la Independencia"
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={esNacional}
              onChange={(e) => setEsNacional(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
            />
            Nacional
          </label>
          <button
            type="submit"
            disabled={isPending || !fecha || !nombre.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-md hover:bg-sky-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Agregar
          </button>
        </div>
      </form>

      {/* Feriados table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            Feriados registrados
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {feriados.length} feriado(s) · ordenados por fecha descendente
          </p>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600 text-xs">
                  Fecha
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600 text-xs">
                  Nombre
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600 text-xs">
                  Tipo
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600 text-xs">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {feriados.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center text-gray-400 text-sm"
                  >
                    No hay feriados registrados
                  </td>
                </tr>
              ) : (
                feriados.map((f) => (
                  <tr
                    key={f.id}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-2.5 text-gray-900 whitespace-nowrap capitalize">
                      {formatDate(f.fecha)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {f.nombre}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                          f.es_nacional
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {f.es_nacional ? "Nacional" : "Regional"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleDelete(f.id)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
