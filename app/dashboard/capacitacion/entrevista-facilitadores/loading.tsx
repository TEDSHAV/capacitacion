import { Loader2, Users } from "lucide-react";

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto py-12 sm:px-6 lg:px-8 flex flex-col items-center justify-center min-h-[50vh]">
      <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center mb-4">
        <Users className="w-6 h-6 animate-pulse" />
      </div>
      <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
        <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
        <span>Cargando entrevistas de facilitadores...</span>
      </div>
    </div>
  );
}
