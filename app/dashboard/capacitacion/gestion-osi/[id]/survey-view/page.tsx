import React from "react";
import { notFound } from "next/navigation";
import { getOSIDataForSurvey, getSurveysByOSI } from "@/app/actions/surveys";
import { getSessionCount } from "@/lib/osi-utils";
import { createAdminClient } from "@/utils/supabase/server";
import SurveyDocumentView from "./SurveyDocumentView";
import Link from "next/link";
import { ArrowLeft, User, Calendar, Layers } from "lucide-react";

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

  // Determine session count and whether to group
  const sessionCount = await (async () => {
    const admin = await createAdminClient();
    const { data: osi } = await admin
      .from("v_osi_formato_completo")
      .select("desglose_recursos_sesiones, sesiones_programadas, sesiones_ejecucion")
      .eq("id_osi", osiId)
      .single();
    return getSessionCount(osi ?? {});
  })();

  const shouldGroup = sessionCount > 1;

  // Fetch facilitador names per session for grouping headers
  const facilitadorBySession = new Map<number, string>();
  if (shouldGroup) {
    const admin = await createAdminClient();
    const { data: assignments } = await admin
      .from("facilitador_osi_assignments")
      .select("nro_sesion, facilitadores(nombre_apellido)")
      .eq("osi_id", osiId)
      .eq("is_active", true);

    for (const a of assignments || []) {
      const facRelation = (a as any).facilitadores;
      const facObj = Array.isArray(facRelation) ? facRelation[0] : facRelation;
      const name = facObj?.nombre_apellido;
      if (name && a.nro_sesion !== null && !facilitadorBySession.has(a.nro_sesion)) {
        facilitadorBySession.set(a.nro_sesion, name);
      }
    }
  }

  // Group surveys by session
  const surveysBySession = new Map<number, typeof surveys>();
  for (const s of surveys) {
    const session = s.nro_sesion ?? 1;
    if (!surveysBySession.has(session)) {
      surveysBySession.set(session, []);
    }
    surveysBySession.get(session)!.push(s);
  }

  // Render a single session's survey list
  const renderSurveyList = (sessionSurveys: typeof surveys, startIndex: number = 0) => (
    <div className="grid grid-cols-1 gap-4">
      {sessionSurveys.map((survey, index) => (
        <Link
          key={survey.id}
          href={`/dashboard/capacitacion/gestion-osi/${id}/survey-view?surveyId=${survey.id}`}
          className="flex items-center justify-between p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 text-blue-600 w-10 h-10 rounded-full flex items-center justify-center font-bold">
              {startIndex + index + 1}
            </div>
            <div>
              <p className="font-bold text-gray-800">Participante {startIndex + index + 1}</p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-3 h-3" />
                {survey.created_at ? (
                  <span suppressHydrationWarning>
                    {new Date(survey.created_at).toISOString().split('T')[0]} {new Date(survey.created_at).toTimeString().split(' ')[0]}
                  </span>
                ) : "Desconocida"}
              </div>
            </div>
          </div>
          <div className="text-blue-600 font-medium group-hover:underline">
            Ver Documento →
          </div>
        </Link>
      ))}
    </div>
  );

  // If multiple surveys exist, show a list (grouped by session if multi-session)
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
            ) : shouldGroup ? (
              <div className="space-y-8">
                <h3 className="font-bold text-gray-700">{surveys.length} Respuesta(s) Recibida(s)</h3>
                {Array.from({ length: sessionCount }, (_, i) => i + 1).map((sessionNum) => {
                  const sessionSurveys = surveysBySession.get(sessionNum) || [];
                  if (sessionSurveys.length === 0) return null;
                  const facilitadorName = facilitadorBySession.get(sessionNum);
                  return (
                    <div key={sessionNum} className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Layers className="w-5 h-5 text-blue-600" />
                        <h4 className="font-bold text-gray-800">Sesión {sessionNum}</h4>
                        {facilitadorName && (
                          <span className="text-sm text-gray-500">— {facilitadorName}</span>
                        )}
                        <span className="ml-auto text-sm text-gray-400 font-medium">
                          {sessionSurveys.length} respuesta(s)
                        </span>
                      </div>
                      {renderSurveyList(sessionSurveys)}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-bold text-gray-700 mb-4">{surveys.length} Respuesta(s) Recibida(s)</h3>
                {renderSurveyList(surveys)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
