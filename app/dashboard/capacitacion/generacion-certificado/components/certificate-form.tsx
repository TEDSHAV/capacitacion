"use client";

import { useState } from "react";
import {
  CertificateGeneration,
  OSI,
  CourseTopic,
  CertificateParticipant,
} from "@/types";

interface CertificateFormProps {
  certificateData: CertificateGeneration;
  selectedOSI: OSI | null;
  selectedCourseTopic: CourseTopic | null;
  onDataChange: (field: keyof CertificateGeneration, value: any) => void;
  onParticipantsChange: (participants: CertificateParticipant[]) => void;
  onGenerate: () => void;
}

export default function CertificateForm({
  certificateData,
  selectedOSI,
  selectedCourseTopic,
  onDataChange,
  onParticipantsChange,
  onGenerate,
}: CertificateFormProps) {
  const [newParticipant, setNewParticipant] = useState({
    name: "",
    id_number: "",
    score: 0,
  });
  const [locationInput, setLocationInput] = useState("");
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [selectedLocationIndex, setSelectedLocationIndex] = useState(0);

  // Venezuelan states and cities data
  const venezuelanLocations = [
    {
      state: "Amazonas",
      cities: ["Puerto Ayacucho", "El Atajo", "San Fernando de Atabapo"],
    },
    {
      state: "Anzoátegui",
      cities: [
        "Barcelona",
        "Lechería",
        "Puerto La Cruz",
        "Clarines",
        "El Tigre",
        "San Tomé",
      ],
    },
    {
      state: "Apure",
      cities: ["San Fernando de Apure", "Achaguas", "Biruaca", "Guasdualito"],
    },
    {
      state: "Aragua",
      cities: ["Barcelona", "Cumaná", "Onoto", "Puerto Píritu"],
    },
    {
      state: "Barinas",
      cities: ["Barinas", "Barinitas", "Socopó", "Ciudad Bolivia"],
    },
    {
      state: "Bolívar",
      cities: ["Ciudad Bolívar", "Ciudad Guayana", "Upata", "Caicara"],
    },
    {
      state: "Carabobo",
      cities: ["Valencia", "Naguanagua", "Guacara", "Los Guayos"],
    },
    {
      state: "Cojedes",
      cities: ["San Carlos", "Tinaquillo", "El Pao", "Las Vegas"],
    },
    {
      state: "Delta Amacuro",
      cities: ["Tucupita", "Pedernales", "Curiapo", "Punta de Piedras"],
    },
    {
      state: "Distrito Capital",
      cities: ["Caracas", "El Hatillo", "Los Teques", "Petare"],
    },
    {
      state: "Falcón",
      cities: ["Coro", "Punto Fijo", "Cabudare", "Churuguara"],
    },
    {
      state: "Guárico",
      cities: [
        "San Juan de los Morros",
        "Calabozo",
        "Altagracia de Orituco",
        "Zaraza",
      ],
    },
    {
      state: "Lara",
      cities: ["Barquisimeto", "Carora", "Cabudare", "El Tocuyo"],
    },
    {
      state: "Mérida",
      cities: ["Mérida", "Ejido", "Timotes", "Santo Domingo"],
    },
    {
      state: "Miranda",
      cities: [
        "Los Teques",
        "Ocumare del Tuy",
        "Charallave",
        "Santa Teresa del Tuy",
      ],
    },
    {
      state: "Monagas",
      cities: ["Maturín", "Caripito", "Punta de Mata", "Temblador"],
    },
    {
      state: "Nueva Esparta",
      cities: ["La Asunción", "Margarita", "Juan Griego"],
    },
    {
      state: "Portuguesa",
      cities: ["Guanare", "Acarigua", "Piritu", "Güigüe"],
    },
    {
      state: "Sucre",
      cities: ["Cumaná", "Carúpano", "Río Caribe", "Yaguaraparo"],
    },
    {
      state: "Táchira",
      cities: ["San Cristóbal", "Rubio", "Táriba", "La Fría"],
    },
    { state: "Trujillo", cities: ["Trujillo", "Valera", "Boconó", "Carache"] },
    {
      state: "Yaracuy",
      cities: ["San Felipe", "Chivacoa", "Aroa", "Yaritagua"],
    },
    {
      state: "Zulia",
      cities: ["Maracaibo", "Cabimas", "Machiques", "Ciudad Ojeda"],
    },
  ];

  const allLocations = venezuelanLocations.flatMap((loc) =>
    loc.cities.map((city) => `${city}, ${loc.state}`),
  );

  const addParticipant = () => {
    if (newParticipant.name.trim() && newParticipant.id_number.trim()) {
      const participant: CertificateParticipant = {
        id: Date.now().toString(),
        name: newParticipant.name.trim(),
        id_number: newParticipant.id_number.trim(),
        score: newParticipant.score || 0,
      };
      onParticipantsChange([...certificateData.participants, participant]);
      setNewParticipant({ name: "", id_number: "", score: 0 });
    }
  };

  const removeParticipant = (id: string) => {
    onParticipantsChange(
      certificateData.participants.filter((p) => p.id !== id),
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addParticipant();
    }
  };

  const filteredLocations = allLocations.filter((location) =>
    location.toLowerCase().includes(locationInput.toLowerCase()),
  );

  const handleLocationSelect = (location: string) => {
    setLocationInput(location);
    setIsLocationDropdownOpen(false);
    onDataChange("location", location);
  };

  const handleLocationInputChange = (value: string) => {
    setLocationInput(value);
    setIsLocationDropdownOpen(true);
    setSelectedLocationIndex(0); // Reset to first item when typing
    onDataChange("location", value);
  };

  const handleLocationKeyDown = (e: React.KeyboardEvent) => {
    const currentFilteredLocations = filteredLocations.slice(0, 10);

    console.log(
      "Key pressed:",
      e.key,
      "Dropdown open:",
      isLocationDropdownOpen,
      "Results:",
      currentFilteredLocations.length,
      "Current index:",
      selectedLocationIndex,
    );

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (currentFilteredLocations.length > 0) {
          setIsLocationDropdownOpen(true);
          setSelectedLocationIndex((prev) => {
            // Ensure index is within bounds
            const safePrev = Math.min(
              prev,
              currentFilteredLocations.length - 1,
            );
            const newIndex =
              safePrev < currentFilteredLocations.length - 1 ? safePrev + 1 : 0;
            console.log(
              "New index (ArrowDown):",
              newIndex,
              "Safe prev:",
              safePrev,
            );
            return newIndex;
          });
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (currentFilteredLocations.length > 0) {
          setIsLocationDropdownOpen(true);
          setSelectedLocationIndex((prev) => {
            // Ensure index is within bounds
            const safePrev = Math.min(
              prev,
              currentFilteredLocations.length - 1,
            );
            const newIndex =
              safePrev > 0 ? safePrev - 1 : currentFilteredLocations.length - 1;
            console.log(
              "New index (ArrowUp):",
              newIndex,
              "Safe prev:",
              safePrev,
            );
            return newIndex;
          });
        }
        break;
      case "Enter":
        e.preventDefault();
        if (
          isLocationDropdownOpen &&
          currentFilteredLocations[selectedLocationIndex]
        ) {
          console.log(
            "Selecting location:",
            currentFilteredLocations[selectedLocationIndex],
          );
          handleLocationSelect(currentFilteredLocations[selectedLocationIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsLocationDropdownOpen(false);
        setSelectedLocationIndex(0);
        break;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Detalles del Certificado
      </h2>

      {/* OSI Information Display */}
      {selectedOSI && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Información de la OSI
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Cliente:</span>
              <input
                type="text"
                value={selectedOSI.cliente_nombre_empresa || ""}
                readOnly
                className="ml-2 px-2 py-1 bg-white border border-gray-300 rounded text-gray-600 w-full sm:w-auto"
              />
            </div>
            <div>
              <span className="font-medium">Tema:</span>
              <input
                type="text"
                value={selectedOSI.tema || ""}
                readOnly
                className="ml-2 px-2 py-1 bg-white border border-gray-300 rounded text-gray-600 w-full sm:w-auto"
              />
            </div>
          </div>
        </div>
      )}

      {/* Certificate Title */}
      <div className="mb-4">
        <label
          htmlFor="certificate_title"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Título del Certificado *
        </label>
        <input
          type="text"
          id="certificate_title"
          value={certificateData.certificate_title}
          onChange={(e) => onDataChange("certificate_title", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Ej: Manejo de Montacargas"
        />
      </div>

      {/* Certificate Subtitle */}
      <div className="mb-4">
        <label
          htmlFor="certificate_subtitle"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Subtítulo (Opcional)
        </label>
        <input
          type="text"
          id="certificate_subtitle"
          value={certificateData.certificate_subtitle || ""}
          onChange={(e) => onDataChange("certificate_subtitle", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Ej: 5 toneladas"
        />
      </div>

      {/* Passing Grade */}
      <div className="mb-4">
        <label
          htmlFor="passing_grade"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Calificación Aprobatoria (Mínimo para aprobar)
        </label>
        <input
          type="number"
          id="passing_grade"
          value={certificateData.passing_grade || 14}
          onChange={(e) =>
            onDataChange("passing_grade", parseInt(e.target.value) || 14)
          }
          min="0"
          max="20"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Los participantes con calificación mayor o igual a este valor serán
          marcados como "Aprobado"
        </p>
      </div>

      {/* Location Search with Autocomplete */}
      <div className="mb-4">
        <label
          htmlFor="location"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Ubicación *
        </label>
        <div className="relative">
          <div className="relative">
            <input
              type="text"
              id="location"
              value={locationInput}
              onChange={(e) => handleLocationInputChange(e.target.value)}
              onKeyDown={handleLocationKeyDown}
              onFocus={() => {
                setIsLocationDropdownOpen(true);
                setSelectedLocationIndex(0);
              }}
              onBlur={() =>
                setTimeout(() => setIsLocationDropdownOpen(false), 150)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Buscar ciudad o estado en Venezuela..."
            />
            {locationInput && (
              <button
                type="button"
                onClick={() => {
                  setLocationInput("");
                  setIsLocationDropdownOpen(false);
                  setSelectedLocationIndex(0);
                  onDataChange("location", "");
                }}
                className="absolute inset-y-0 right-0 w-8 flex items-center justify-center text-white hover:text-gray-200"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Autocomplete Suggestions */}
          {isLocationDropdownOpen && locationInput && (
            <div
              className="absolute mt-2 w-full border border-gray-300 rounded-md shadow-lg bg-white max-h-60 overflow-y-auto z-50"
              onMouseDown={(e) => e.preventDefault()}
            >
              {filteredLocations.length === 0 ? (
                <div className="p-3 text-gray-500 text-center">
                  No se encontraron ubicaciones que coincidan
                </div>
              ) : (
                filteredLocations.slice(0, 8).map((location, index) => (
                  <div
                    key={index}
                    onClick={() => handleLocationSelect(location)}
                    className={`p-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                      index === selectedLocationIndex
                        ? "bg-blue-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="font-medium text-gray-900">{location}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Date */}
      <div className="mb-6">
        <label
          htmlFor="date"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Fecha *
        </label>
        <input
          type="date"
          id="date"
          value={certificateData.date}
          onChange={(e) => onDataChange("date", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Participants */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Participantes *
        </label>

        {/* Add Participant Form */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newParticipant.name}
            onChange={(e) =>
              setNewParticipant((prev) => ({ ...prev, name: e.target.value }))
            }
            onKeyPress={handleKeyPress}
            placeholder="Nombre del participante"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <input
            type="text"
            value={newParticipant.id_number}
            onChange={(e) =>
              setNewParticipant((prev) => ({
                ...prev,
                id_number: e.target.value,
              }))
            }
            onKeyPress={handleKeyPress}
            placeholder="Cédula/ID"
            className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <input
            type="number"
            value={newParticipant.score || ""}
            onChange={(e) =>
              setNewParticipant((prev) => ({
                ...prev,
                score: parseInt(e.target.value) || 0,
              }))
            }
            onKeyPress={handleKeyPress}
            placeholder="Calificación"
            min="0"
            max="100"
            className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={addParticipant}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Agregar
          </button>
        </div>

        {/* Participants List */}
        {certificateData.participants.length > 0 && (
          <div className="border border-gray-200 rounded-md max-h-40 overflow-y-auto">
            {certificateData.participants.map((participant) => (
              <div
                key={participant.id}
                className="flex justify-between items-center p-2 border-b border-gray-100 last:border-b-0"
              >
                <div>
                  <span className="font-medium text-gray-900">
                    {participant.name}
                  </span>
                  <span className="text-gray-500 ml-2">
                    ({participant.id_number})
                  </span>
                  <span className="text-sm text-gray-400 ml-2">
                    {participant.score !== undefined &&
                      `${participant.score} pts`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeParticipant(participant.id!)}
                  className="text-red-600 hover:text-red-800"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 5.14M12 16l-7 7m0 0l7 7-7"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {certificateData.participants.length === 0 && (
          <p className="text-sm text-gray-500">
            Agrega al menos un participante para generar el certificado
          </p>
        )}
      </div>

      {/* Generate Button */}
      <button
        type="button"
        onClick={onGenerate}
        disabled={
          !certificateData.certificate_title ||
          !certificateData.osi_id ||
          !certificateData.course_topic_id ||
          certificateData.participants.length === 0 ||
          !certificateData.location ||
          !certificateData.date
        }
        className="w-full py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
      >
        Generar Certificado(s)
      </button>

      {/* Validation Message */}
      {(!certificateData.certificate_title ||
        !certificateData.osi_id ||
        !certificateData.course_topic_id ||
        certificateData.participants.length === 0 ||
        !certificateData.location ||
        !certificateData.date) && (
        <p className="mt-2 text-sm text-red-600">
          Por favor completa todos los campos obligatorios
        </p>
      )}
    </div>
  );
}
