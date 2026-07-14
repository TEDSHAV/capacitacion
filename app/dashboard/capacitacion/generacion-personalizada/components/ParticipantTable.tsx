"use client";

import { useState } from "react";
import { CertificateParticipant } from "@/types";
import { ParticipantScannerModal } from "@/app/dashboard/capacitacion/generacion-certificado/components/certificate-form/ParticipantScannerModal";
import { Plus, Trash2, ScanLine } from "lucide-react";

interface ParticipantTableProps {
  participants: CertificateParticipant[];
  onParticipantsChange: (participants: CertificateParticipant[]) => void;
  passingGrade?: number;
}

export function ParticipantTable({
  participants,
  onParticipantsChange,
  passingGrade = 14,
}: ParticipantTableProps) {
  const [scannerOpen, setScannerOpen] = useState(false);

  const addRow = () => {
    onParticipantsChange([
      ...participants,
      { name: "", idNumber: "", nationality: "venezolano", score: 0 },
    ]);
  };

  const removeRow = (index: number) => {
    onParticipantsChange(participants.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof CertificateParticipant, value: any) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };
    onParticipantsChange(updated);
  };

  const handleAddScanned = (scanned: CertificateParticipant[]) => {
    onParticipantsChange([...participants, ...scanned]);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900">
          Participantes ({participants.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setScannerOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <ScanLine className="w-3.5 h-3.5" />
            Escanear
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

      {participants.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          No hay participantes. Agrega manualmente o escanea desde una imagen.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-600">
                <th className="py-2 px-2 font-medium">#</th>
                <th className="py-2 px-2 font-medium">Nombre</th>
                <th className="py-2 px-2 font-medium">Nacionalidad</th>
                <th className="py-2 px-2 font-medium">Cédula</th>
                <th className="py-2 px-2 font-medium">Calificación</th>
                <th className="py-2 px-2 font-medium"></th>
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
                      className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                      className="w-28 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                      className={`w-16 px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        (p.score ?? 0) >= passingGrade
                          ? "border-green-300 bg-green-50"
                          : "border-red-300 bg-red-50"
                      }`}
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

      <ParticipantScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onAddParticipants={handleAddScanned}
      />
    </div>
  );
}
