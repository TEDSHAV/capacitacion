interface CreatePlantillaCursoButtonProps {
  onCreatePlantilla: () => void;
}

export function CreatePlantillaCursoButton({ onCreatePlantilla }: CreatePlantillaCursoButtonProps) {
  return (
    <button
      onClick={onCreatePlantilla}
      className="inline-flex items-center px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors shadow-md"
      style={{ backgroundColor: 'var(--primary-blue)' }}
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
