import React from "react";
import { notFound } from "next/navigation";
import { getOSIDataForSurvey } from "@/app/actions/surveys";
import SurveyForm from "./SurveyForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SurveyPage({ params }: PageProps) {
  const { id } = await params;
  const osiId = parseInt(id);

  console.log(`[SurveyPage] Accessing survey for OSI ID: ${id} (parsed: ${osiId})`);

  if (isNaN(osiId)) {
    console.warn(`[SurveyPage] Invalid OSI ID provided: ${id}`);
    return notFound();
  }

  const osiData = await getOSIDataForSurvey(osiId);

  if (!osiData) {
    console.warn(`[SurveyPage] No OSI data found for ID: ${osiId}`);
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Enlace Inválido</h1>
          <p className="text-gray-600 mb-6">
            No se pudo encontrar la orden de servicio asociada a esta encuesta. Por favor, verifique el enlace o contacte al administrador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <SurveyForm osiData={osiData} />
    </div>
  );
}
