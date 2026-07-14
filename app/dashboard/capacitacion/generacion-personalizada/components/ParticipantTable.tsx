"use client";

import { useState } from "react";
import { CustomParticipant } from "@/lib/custom-participant-types";
import { ExcelUploader } from "./ExcelUploader";
import { Plus, Trash2 } from "lucide-react";

interface ParticipantTableProps {
  participants: CustomParticipant[];
  onParticipantsChange: (participants: CustomParticipant[]) => void;
  passingGrade?: number;
}

export function ParticipantTable({
  participants,
  onParticipantsChange,
  passingGrade = 14,
}: ParticipantTableProps) {
  const [showUploader, setShowUploader] = useState(false);

  const addRow = () => {
    onParticipantsChange([
      ...participants,
      {
        name: "",
        idNumber: "",
        nationality: "venezolano",
        score: 0,
        nro_libro: 0,
        nro_hoja: 0,
        nro_linea: 0,
        nro_control: 0,
      },
    ]);
  };

  const removeRow = (index: number) => {
    onParticipantsChange(participants.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof CustomParticipant, value: any) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };
    onParticipantsChange(updated);
  };

  const handleParticipantsLoaded = (loaded: CustomParticipant[]) => {
    onParticipantsChange(loaded);
    setShowUploader(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900">
          Participantes ({participants.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowUploader(!showUploader)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Cargar Excel/CSV
          </button>
          <button
            onClick={addRow}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar
          </button>
        </div>
      </div>

      {showUploader && (
        <div className="mb-4">
          <ExcelUploader onParticipantsLoaded={handleParticipantsLoaded} />
        </div>
      )}

      {participants.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          No hay participantes. Carga un Excel/CSV o agrega manualmente.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-600">
                <th className="py-2 px-2 font-medium">#</th>
                <th className="py-2 px-2 font-medium">Nombre</th>
                <th className="py-2 px-2 font-medium">Nac.</th>
                <th className="py-2 px-2 font-medium">Cédula</th>
                <th className="py-2 px-2 font-medium">Calif.</th>
                <th className="py-2 px-2 font-medium text-center" colSpan={4}>
                  Números de Control
                </th>
                <th className="py-2 px-2 font-medium"></th>
              </tr>
              <tr className="border-b border-gray-200 text-left text-gray-400">
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th className="py-1 px-2 font-normal text-center">Libro</th>
                <th className="py-1 px-2 font-normal text-center">Hoja</th>
                <th className="py-1 px-2 font-normal text-center">Línea</th>
                <th className="py-1 px-2 font-normal text-center">Ctrl</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1.5 px-2 text-gray-500">{i + 1}</td>
                  <td className="py-1.5 px-2">
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => updateRow(i, "name", e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Nombre completo"
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <select
                      value={p.nationality || "venezolano"}
                      onChange={(e) => updateRow(i, "nationality", e.target.value)}
                      className="px-1 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="venezolano">V</option>
                      <option value="extranjero">E</option>
                    </select>
                  </td>
                  <td className="py-1.5 px-2">
                    <input
                      type="text"
                      value={p.idNumber}
                      onChange={(e) => updateRow(i, "idNumber", e.target.value)}
                      className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Cédula"
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={1}
                      value={p.score ?? 0}
                      onChange={(e) => updateRow(i, "score", parseFloat(e.target.value) || 0)}
                      className={`w-14 px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        (p.score ?? 0) >= passingGrade
                          ? "border-green-300 bg-green-50"
                          : "border-red-300 bg-red-50"
                      }`}
                    />
                  </td>
                  <td className="py-1.5 px-1">
                    <input
                      type="number"
                      min={1}
                      value={p.nro_libro ?? 0}
                      onChange={(e) => updateRow(i, "nro_libro", parseInt(e.target.value) || 0)}
                      className="w-14 px-1 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-1.5 px-1">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={p.nro_hoja ?? 0}
                      onChange={(e) => updateRow(i, "nro_hoja", parseInt(e.target.value) || 0)}
                      className="w-14 px-1 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-1.5 px-1">
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={p.nro_linea ?? 0}
                      onChange={(e) => updateRow(i, "nro_linea", parseInt(e.target.value) || 0)}
                      className="w-12 px-1 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-1.5 px-1">
                    <input
                      type="number"
                      min={1}
                      value={p.nro_control ?? 0}
                      onChange={(e) => updateRow(i, "nro_control", parseInt(e.target.value) || 0)}
                      className="w-20 px-1 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <button
                      onClick={() => removeRow(i)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
