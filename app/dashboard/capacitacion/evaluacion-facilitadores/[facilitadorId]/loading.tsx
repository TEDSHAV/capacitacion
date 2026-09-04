import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white min-h-[60vh] flex flex-col items-center justify-center">
      <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      <p className="text-sm text-gray-500 mt-3">Cargando evaluación...</p>
    </div>
  );
}
