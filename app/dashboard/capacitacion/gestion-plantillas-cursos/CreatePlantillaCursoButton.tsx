interface CreatePlantillaCursoButtonProps {
  onCreatePlantilla: () => void;
}

export function CreatePlantillaCursoButton({ onCreatePlantilla }: CreatePlantillaCursoButtonProps) {
  return (
    <button
      onClick={onCreatePlantilla}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      <svg
        className="w-4 h-4 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg>
      Nueva Plantilla
    </button>
  );
}
