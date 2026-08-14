"use client";

import React from "react";
import dynamic from "next/dynamic";
import { FichaTecnicaFacilitadorSectionProps } from "@/types";
import { FileDown, FileText, Loader2 } from "lucide-react";
import { SectionCard } from "./SectionCard";

const RichTextEditor = dynamic(
  () => import("@/components/ui/rich-text-editor"),
  { ssr: false },
);

export const FichaTecnicaFacilitadorSection = ({
  formData,
  handleInputChange,
  photoFile,
  onPhotoSelect,
  onDownloadFicha,
  generandoPdf,
  isEdit,
}: FichaTecnicaFacilitadorSectionProps) => {
  return (
    <SectionCard
      title="Ficha Técnica de Facilitador"
      icon={<FileText className="w-4 h-4" />}
      action={
        <button
          type="button"
          onClick={onDownloadFicha}
          disabled={generandoPdf}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md font-medium border-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-50"
          style={{
            borderColor: "rgb(12, 63, 105)",
            color: "rgb(12, 63, 105)",
            backgroundColor: "white",
          }}
        >
          {generandoPdf ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <FileDown className="w-4 h-4" />
              Descargar Ficha Técnica
            </>
          )}
        </button>
      }
    >
      <p className="text-xs text-gray-500">
        Esta información se incluye en el PDF de la ficha técnica del
        facilitador. Los campos son opcionales; las secciones vacías no se
        muestran en el documento.
      </p>

      {/* Título Profesional */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Título Profesional
        </label>
        <input
          type="text"
          value={formData.titulo_profesional || ""}
          onChange={(e) =>
            handleInputChange("titulo_profesional", e.target.value)
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Ej: TSU Higiene y Seguridad Industrial"
        />
        <p className="text-xs text-gray-500 mt-1">
          Aparece bajo el nombre en la ficha técnica.
        </p>
      </div>

      {/* Photo upload */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Foto de Perfil
        </label>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={onPhotoSelect}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Formatos aceptados: PNG, JPG (Máx. 5MB).
            </p>
            {isEdit && !photoFile && (
              <p className="text-xs text-blue-600 mt-1">
                Dejar vacío para mantener la foto actual
              </p>
            )}
            {photoFile && (
              <p className="text-sm text-green-600 mt-1">
                {photoFile.name} ({(photoFile.size / 1024 / 1024).toFixed(2)}{" "}
                MB)
              </p>
            )}
          </div>
          {/* Preview of existing photo when editing */}
          {isEdit && formData.foto_perfil_url && !photoFile && (
            <img
              src={formData.foto_perfil_url}
              alt="Foto actual"
              className="w-20 h-20 object-cover rounded-md border border-gray-300"
            />
          )}
          {/* Preview of newly selected file */}
          {photoFile && (
            <img
              src={URL.createObjectURL(photoFile)}
              alt="Nueva foto"
              className="w-20 h-20 object-cover rounded-md border border-gray-300"
            />
          )}
        </div>
      </div>

      {/* Rich-text sections */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Formación Académica
          </label>
          <RichTextEditor
            value={formData.formacion_academica || ""}
            onChange={(html) =>
              handleInputChange("formacion_academica", html)
            }
            rows={5}
            placeholder="Describe la formación académica del facilitador..."
            highlightOverflow={false}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Experiencia Laboral
          </label>
          <RichTextEditor
            value={formData.experiencia_laboral || ""}
            onChange={(html) =>
              handleInputChange("experiencia_laboral", html)
            }
            rows={5}
            placeholder="Describe la experiencia laboral del facilitador..."
            highlightOverflow={false}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Competencias y Habilidades
          </label>
          <RichTextEditor
            value={formData.competencias_habilidades || ""}
            onChange={(html) =>
              handleInputChange("competencias_habilidades", html)
            }
            rows={5}
            placeholder="Describe las competencias y habilidades del facilitador..."
            highlightOverflow={false}
          />
        </div>
      </div>
    </SectionCard>
  );
};
