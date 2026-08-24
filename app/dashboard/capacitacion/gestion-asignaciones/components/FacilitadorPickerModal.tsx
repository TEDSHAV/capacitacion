"use client";

import { useState, useEffect } from "react";
import { X, Search, Loader2, User } from "lucide-react";
import { getFacilitatorsAction } from "@/app/actions/facilitators-crud";
import { toTitleCase } from "@/utils/string-utils";
import type { Facilitador } from "@/types";

interface FacilitadorPickerModalProps {
  title: string;
  onClose: () => void;
  onSelect: (facilitador: { id: number; name: string }) => void;
  excludeIds?: number[];
}

interface FacilitadorOption {
  id: number;
  nombre_apellido: string;
  cedula: string | null;
  email: string | null;
  is_active: boolean;
}

/**
 * Searchable modal for picking an active facilitador.
 * Used by the "Nueva Asignación" and "Nuevas Credenciales" flows
 * in the Asignaciones y Credenciales module.
 */
export default function FacilitadorPickerModal({
  title,
  onClose,
  onSelect,
  excludeIds = [],
}: FacilitadorPickerModalProps) {
  const [loading, setLoading] = useState(true);
  const [facilitadores, setFacilitadores] = useState<FacilitadorOption[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    async function load() {
      const result = await getFacilitatorsAction();
      if (result.data) {
        const active = (result.data as Facilitador[])
          .filter((f) => f.is_active === true)
          .map((f) => ({
            id: f.id,
            nombre_apellido: f.nombre_apellido || "",
            cedula: f.cedula ?? null,
            email: f.email ?? null,
            is_active: f.is_active,
          }))
          .filter((f) => !excludeIds.includes(f.id))
          .sort((a, b) =>
            (a.nombre_apellido || "").localeCompare(b.nombre_apellido || "", "es", {
              sensitivity: "base",
            }),
          );
        setFacilitadores(active);
      }
      setLoading(false);
    }
    load();
  }, [excludeIds]);

  const filtered = facilitadores.filter((f) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      (f.nombre_apellido || "").toLowerCase().includes(term) ||
      (f.cedula || "").toLowerCase().includes(term) ||
      (f.email || "").toLowerCase().includes(term)
    );
  });

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in duration-200 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-lg w-[calc(100%-2rem)] max-h-[85vh] flex flex-col shadow-2xl ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <User className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg p-1.5 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, cédula o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center py-10">
              <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
              <p className="text-sm text-gray-500 mt-2">Cargando facilitadores...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-400 italic">
                {searchTerm
                  ? `No se encontraron facilitadores para "${searchTerm}"`
                  : "No hay facilitadores activos disponibles"}
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {filtered.map((f) => (
                <li key={f.id}>
                  <button
                    onClick={() =>
                      onSelect({
                        id: f.id,
                        name: toTitleCase(f.nombre_apellido || ""),
                      })
                    }
                    className="w-full text-left p-3 rounded-lg hover:bg-blue-50 transition-colors border border-gray-100 hover:border-blue-200"
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {toTitleCase(f.nombre_apellido || "")}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {f.cedula ? `C.I. ${f.cedula}` : ""}
                      {f.cedula && f.email ? " · " : ""}
                      {f.email || ""}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
