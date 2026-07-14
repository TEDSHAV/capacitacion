import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface CreatePlantillaCursoButtonProps {
  onCreatePlantilla: () => void;
}

export function CreatePlantillaCursoButton({ onCreatePlantilla }: CreatePlantillaCursoButtonProps) {
  return (
    <Button onClick={onCreatePlantilla} className="bg-[var(--primary-blue)] hover:bg-[var(--primary-blue-hover)]">
      <Plus className="w-4 h-4 mr-2" />
      Nueva Plantilla
    </Button>
  );
}
