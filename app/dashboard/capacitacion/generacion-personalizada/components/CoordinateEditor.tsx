"use client";

import { useState } from "react";
import {
  CertCoordinateConfig,
  CarnetCoordinateConfig,
  DEFAULT_CERT_COORDINATES,
  DEFAULT_CARNET_COORDINATES,
} from "@/lib/custom-coordinate-types";

interface CoordinateEditorProps {
  certCoords: CertCoordinateConfig;
  carnetCoords: CarnetCoordinateConfig;
  onCertCoordsChange: (coords: CertCoordinateConfig) => void;
  onCarnetCoordsChange: (coords: CarnetCoordinateConfig) => void;
  certTemplateKey?: string;
  carnetTemplateKey?: string;
}

export function CoordinateEditor({
  certCoords,
  carnetCoords,
  onCertCoordsChange,
  onCarnetCoordsChange,
  certTemplateKey,
  carnetTemplateKey,
}: CoordinateEditorProps) {
  const [activeTab, setActiveTab] = useState<"cert" | "carnet">("cert");

  const saveToLocalStorage = (
    type: "cert" | "carnet",
    key: string,
    coords: CertCoordinateConfig | CarnetCoordinateConfig,
  ) => {
    const storageKey = `custom_coords_${type}_${key}`;
    localStorage.setItem(storageKey, JSON.stringify(coords));
  };

  const loadFromLocalStorage = (
    type: "cert" | "carnet",
    key: string,
  ): CertCoordinateConfig | CarnetCoordinateConfig | null => {
    const storageKey = `custom_coords_${type}_${key}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  };

  const handleSave = () => {
    if (activeTab === "cert" && certTemplateKey) {
      saveToLocalStorage("cert", certTemplateKey, certCoords);
    } else if (activeTab === "carnet" && carnetTemplateKey) {
      saveToLocalStorage("carnet", carnetTemplateKey, carnetCoords);
    }
  };

  const handleLoad = () => {
    if (activeTab === "cert" && certTemplateKey) {
      const loaded = loadFromLocalStorage("cert", certTemplateKey) as CertCoordinateConfig | null;
      if (loaded) onCertCoordsChange(loaded);
    } else if (activeTab === "carnet" && carnetTemplateKey) {
      const loaded = loadFromLocalStorage("carnet", carnetTemplateKey) as CarnetCoordinateConfig | null;
      if (loaded) onCarnetCoordsChange(loaded);
    }
  };

  const handleReset = () => {
    if (activeTab === "cert") {
      onCertCoordsChange({ ...DEFAULT_CERT_COORDINATES });
    } else {
      onCarnetCoordsChange({ ...DEFAULT_CARNET_COORDINATES });
    }
  };

  const updateCertField = (path: string, value: number | string) => {
    const updated = { ...certCoords };
    const keys = path.split(".");
    let obj: any = updated;
    for (let i = 0; i < keys.length - 1; i++) {
      obj[keys[i]] = { ...obj[keys[i]] };
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    onCertCoordsChange(updated);
  };

  const updateCarnetField = (path: string, value: number | string) => {
    const updated = { ...carnetCoords };
    const keys = path.split(".");
    let obj: any = updated;
    for (let i = 0; i < keys.length - 1; i++) {
      obj[keys[i]] = { ...obj[keys[i]] };
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    onCarnetCoordsChange(updated);
  };

  const numInput = (
    label: string,
    value: number,
    onChange: (v: number) => void,
    step = 0.5,
  ) => (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-600 w-32 shrink-0">{label}</label>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-20 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );

  const textInput = (
    label: string,
    value: string,
    onChange: (v: string) => void,
  ) => (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-600 w-32 shrink-0">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-32 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );

  const sectionTitle = (title: string) => (
    <h4 className="text-sm font-semibold text-gray-700 mt-4 mb-2 first:mt-0">{title}</h4>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">Editor de Coordenadas</h3>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Guardar
          </button>
          <button
            onClick={handleLoad}
            className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Cargar
          </button>
          <button
            onClick={handleReset}
            className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab("cert")}
          className={`px-3 py-1 text-xs rounded-md ${activeTab === "cert" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
        >
          Certificado
        </button>
        <button
          onClick={() => setActiveTab("carnet")}
          className={`px-3 py-1 text-xs rounded-md ${activeTab === "carnet" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
        >
          Carnet
        </button>
      </div>

      {activeTab === "cert" ? (
        <div className="space-y-1 max-h-96 overflow-y-auto pr-2">
          {sectionTitle("Nombre")}
          {numInput("maxWidth", certCoords.name.maxWidth, (v) => updateCertField("name.maxWidth", v))}
          {numInput("maxFontSize", certCoords.name.maxFontSize, (v) => updateCertField("name.maxFontSize", v))}
          {numInput("lineHeight", certCoords.name.lineHeight, (v) => updateCertField("name.lineHeight", v))}
          {textInput("color", certCoords.name.color, (v) => updateCertField("name.color", v))}

          {sectionTitle("Título")}
          {numInput("maxWidth", certCoords.title.maxWidth, (v) => updateCertField("title.maxWidth", v))}
          {numInput("maxFontSize", certCoords.title.maxFontSize, (v) => updateCertField("title.maxFontSize", v))}
          {numInput("lineHeight", certCoords.title.lineHeight, (v) => updateCertField("title.lineHeight", v))}
          {textInput("color", certCoords.title.color, (v) => updateCertField("title.color", v))}

          {sectionTitle("Subtítulo")}
          {numInput("maxWidth", certCoords.subtitle.maxWidth, (v) => updateCertField("subtitle.maxWidth", v))}
          {numInput("maxFontSize", certCoords.subtitle.maxFontSize, (v) => updateCertField("subtitle.maxFontSize", v))}
          {numInput("lineHeight", certCoords.subtitle.lineHeight, (v) => updateCertField("subtitle.lineHeight", v))}
          {textInput("color", certCoords.subtitle.color, (v) => updateCertField("subtitle.color", v))}

          {sectionTitle("Layout")}
          {numInput("centerPoint", certCoords.centerPoint, (v) => updateCertField("centerPoint", v))}
          {numInput("uniformGap", certCoords.uniformGap, (v) => updateCertField("uniformGap", v))}

          {sectionTitle("Facilitador")}
          {numInput("Nombre X", certCoords.facilitatorName.x, (v) => updateCertField("facilitatorName.x", v))}
          {numInput("Nombre Y", certCoords.facilitatorName.y, (v) => updateCertField("facilitatorName.y", v))}
          {numInput("Firma X", certCoords.facilitatorSignature.x, (v) => updateCertField("facilitatorSignature.x", v))}
          {numInput("Firma Y", certCoords.facilitatorSignature.y, (v) => updateCertField("facilitatorSignature.y", v))}

          {sectionTitle("SHA")}
          {numInput("Offset X", certCoords.shaSignatureOffset.x, (v) => updateCertField("shaSignatureOffset.x", v))}
          {numInput("Offset Y", certCoords.shaSignatureOffset.y, (v) => updateCertField("shaSignatureOffset.y", v))}

          {sectionTitle("Fecha y Duración")}
          {numInput("dateY", certCoords.dateY, (v) => updateCertField("dateY", v))}
          {numInput("durationY", certCoords.durationY, (v) => updateCertField("durationY", v))}
          {numInput("durationOffsetX", certCoords.durationOffsetX, (v) => updateCertField("durationOffsetX", v))}

          {sectionTitle("Sello")}
          {numInput("X", certCoords.seal.x, (v) => updateCertField("seal.x", v))}
          {numInput("Y", certCoords.seal.y, (v) => updateCertField("seal.y", v))}
          {numInput("Size", certCoords.seal.size, (v) => updateCertField("seal.size", v))}
        </div>
      ) : (
        <div className="space-y-1 max-h-96 overflow-y-auto pr-2">
          {sectionTitle("Nombre del Participante")}
          {numInput("X", carnetCoords.participantName.x, (v) => updateCarnetField("participantName.x", v))}
          {numInput("Y", carnetCoords.participantName.y, (v) => updateCarnetField("participantName.y", v))}
          {numInput("fontSize", carnetCoords.participantName.fontSize, (v) => updateCarnetField("participantName.fontSize", v), 1)}

          {sectionTitle("Cédula")}
          {numInput("X", carnetCoords.participantId.x, (v) => updateCarnetField("participantId.x", v))}
          {numInput("Y", carnetCoords.participantId.y, (v) => updateCarnetField("participantId.y", v))}
          {numInput("fontSize", carnetCoords.participantId.fontSize, (v) => updateCarnetField("participantId.fontSize", v), 1)}

          {sectionTitle("Título del Curso")}
          {numInput("X", carnetCoords.courseTitle.x, (v) => updateCarnetField("courseTitle.x", v))}
          {numInput("Y", carnetCoords.courseTitle.y, (v) => updateCarnetField("courseTitle.y", v))}
          {numInput("maxWidth", carnetCoords.courseTitle.maxWidth, (v) => updateCarnetField("courseTitle.maxWidth", v))}
          {numInput("fontSize", carnetCoords.courseTitle.fontSize, (v) => updateCarnetField("courseTitle.fontSize", v), 1)}

          {sectionTitle("Subtítulo")}
          {numInput("X", carnetCoords.subtitle.x, (v) => updateCarnetField("subtitle.x", v))}
          {numInput("Y", carnetCoords.subtitle.y, (v) => updateCarnetField("subtitle.y", v))}
          {numInput("maxWidth", carnetCoords.subtitle.maxWidth, (v) => updateCarnetField("subtitle.maxWidth", v))}
          {numInput("fontSize", carnetCoords.subtitle.fontSize, (v) => updateCarnetField("subtitle.fontSize", v), 1)}

          {sectionTitle("Fecha Emisión")}
          {numInput("X", carnetCoords.emissionDate.x, (v) => updateCarnetField("emissionDate.x", v))}
          {numInput("Y", carnetCoords.emissionDate.y, (v) => updateCarnetField("emissionDate.y", v))}

          {sectionTitle("Fecha Vencimiento")}
          {numInput("X", carnetCoords.expirationDate.x, (v) => updateCarnetField("expirationDate.x", v))}
          {numInput("Y", carnetCoords.expirationDate.y, (v) => updateCarnetField("expirationDate.y", v))}

          {sectionTitle("Nro. Control")}
          {numInput("X", carnetCoords.controlNumber.x, (v) => updateCarnetField("controlNumber.x", v))}
          {numInput("Y", carnetCoords.controlNumber.y, (v) => updateCarnetField("controlNumber.y", v))}
        </div>
      )}
    </div>
  );
}
