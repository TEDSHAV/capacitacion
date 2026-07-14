import React from "react";
import { notFound } from "next/navigation";
import { getOSIDataForSurvey, getSurveysByOSI } from "@/app/actions/surveys";
import SurveyDocumentView from "./SurveyDocumentView";
import Link from "next/link";
import { ArrowLeft, User, Calendar } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ surveyId?: string }>;
}

export default async function SurveyViewPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { surveyId } = await searchParams;
  const osiId = parseInt(id);

  if (isNaN(osiId)) {
    return notFound();
  }

  const [osiData, surveys] = await Promise.all([
    getOSIDataForSurvey(osiId),
    getSurveysByOSI(osiId),
  ]);

  if (!osiData) {
    return notFound();
  }

  // If a specific survey is requested, show it
  if (surveyId) {
    const selectedSurvey = surveys.find(s => s.id === surveyId);
    if (selectedSurvey) {
      return <SurveyDocumentView osiData={osiData} survey={selectedSurvey} />;
    }
  }

  // If no specific survey is requested, but there's only one, show it directly
  if (surveys.length === 1) {
    return <SurveyDocumentView osiData={osiData} survey={surveys[0]} />;
  }

  // If multiple surveys exist, show a list
  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link
          href={`/dashboard/capacitacion/gestion-osi`}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Gestión OSI
        </Link>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-blue-600 p-6 text-white">
            <h1 className="text-2xl font-bold">Encuestas de Satisfacción</h1>
            <p className="opacity-90">OSI: {osiData.nro_osi} | {osiData.servicio}</p>
          </div>

          <div className="p-6">
            {surveys.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No hay encuestas registradas</h3>
                <p className="text-gray-500">Aún no se han recibido respuestas para esta orden de servicio.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-bold text-gray-700 mb-4">{surveys.length} Respuesta(s) Recibida(s)</h3>
                <div className="grid grid-cols-1 gap-4">
                  {surveys.map((survey, index) => (
                    <Link
                      key={survey.id}
                      href={`/dashboard/capacitacion/gestion-osi/${id}/survey-view?surveyId=${survey.id}`}
                      className="flex items-center justify-between p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-100 text-blue-600 w-10 h-10 rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">Participante {index + 1}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="w-3 h-3" />
                            {survey.created_at ? new Date(survey.created_at).toLocaleString() : "Desconocida"}
                          </div>
                        </div>
                      </div>
                      <div className="text-blue-600 font-medium group-hover:underline">
                        Ver Documento →
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
