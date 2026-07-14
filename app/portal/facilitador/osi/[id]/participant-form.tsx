"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  UserPlus
} from "lucide-react";
import { saveParticipants } from "@/app/actions/facilitador-portal";

interface Participant {
  nombre_apellido: string;
  cedula: string;
  score: string | number;
}

interface ParticipantFormProps {
  osiId: number;
  facilitadorId: number;
  initialParticipants: any[];
}

export const ParticipantForm = ({
  osiId,
  facilitadorId,
  initialParticipants,
}: ParticipantFormProps) => {
  const [participants, setParticipants] = useState<Participant[]>(
    initialParticipants.length > 0 
      ? initialParticipants.map(p => ({
          nombre_apellido: p.nombre_apellido,
          cedula: p.cedula,
          score: p.score || "",
        }))
      : [{ nombre_apellido: "", cedula: "", score: "" }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const addParticipant = () => {
    setParticipants([...participants, { nombre_apellido: "", cedula: "", score: "" }]);
    setSuccess(null);
  };

  const removeParticipant = (index: number) => {
    const newParticipants = [...participants];
    newParticipants.splice(index, 1);
    setParticipants(newParticipants);
    setSuccess(null);
  };

  const updateParticipant = (index: number, field: keyof Participant, value: string) => {
    const newParticipants = [...participants];
    newParticipants[index] = { ...newParticipants[index], [field]: value };
    setParticipants(newParticipants);
    setSuccess(null);
    setError(null);
  };

  const handleSave = async (status: "draft" | "final" = "draft") => {
    // Basic validation
    const emptyRows = participants.some(p => !p.nombre_apellido || !p.cedula);
    if (emptyRows) {
      setError("Por favor completa el nombre y cédula de todos los participantes");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await saveParticipants(
      osiId,
      facilitadorId,
      participants.map(p => ({
        ...p,
        score: p.score === "" ? null : Number(p.score)
      })),
      status
    );

    if (result.success) {
      setSuccess(status === "final" 
        ? "Listado finalizado y enviado exitosamente" 
        : "Borrador guardado correctamente"
      );
    } else {
      setError(result.error || "Error al guardar el listado");
    }
    setSaving(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          Listado de Participantes
          <span className="text-sm font-normal text-gray-500">
            ({participants.length})
          </span>
        </h3>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={addParticipant}
          className="text-blue-600 border-blue-200 hover:bg-blue-50"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar Participante
        </Button>
      </div>

      <div className="space-y-3">
        {participants.map((p, index) => (
          <div 
            key={index} 
            className="flex flex-col sm:flex-row gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100 group transition-colors hover:border-blue-100 hover:bg-white"
          >
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Nombre Completo</label>
              <Input
                value={p.nombre_apellido}
                onChange={(e) => updateParticipant(index, "nombre_apellido", e.target.value)}
                placeholder="Nombre y Apellido"
                className="bg-white"
              />
            </div>
            <div className="w-full sm:w-40 space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Cédula / RIF</label>
              <Input
                value={p.cedula}
                onChange={(e) => updateParticipant(index, "cedula", e.target.value)}
                placeholder="V-12345678"
                className="bg-white"
              />
            </div>
            <div className="w-full sm:w-24 space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Nota</label>
              <Input
                type="number"
                min="0"
                max="20"
                value={p.score}
                onChange={(e) => updateParticipant(index, "score", e.target.value)}
                placeholder="0-20"
                className="bg-white text-center font-bold"
              />
            </div>
            <div className="flex items-end pb-1">
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                onClick={() => removeParticipant(index)}
                className="text-red-400 hover:text-red-600 hover:bg-red-50"
                disabled={participants.length === 1}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 pt-6 border-t border-gray-100">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-100 rounded-lg flex items-start gap-3 text-green-700 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-400 italic">
            * Asegúrate de guardar tus cambios antes de salir.
          </p>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => handleSave("draft")}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar Borrador
            </Button>
            <Button 
              onClick={() => handleSave("final")}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Finalizar y Enviar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
