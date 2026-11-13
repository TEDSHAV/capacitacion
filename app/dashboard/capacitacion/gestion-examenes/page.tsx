import React from "react";
import { createAdminClient } from "@/utils/supabase/server";
import {
  getEvaluacionPlantillas,
  getActiveCoursesCatalog,
} from "@/app/actions/evaluaciones-cursos";
import GestionExamenesClient from "./GestionExamenesClient";

export const metadata = {
  title: "Gestión de Evaluaciones Digitales | Capacitación SHA",
  description: "Bancos de preguntas y asignación de exámenes digitales por código QR y Kiosk para las aulas de SHA.",
};

export default async function GestionExamenesPage() {
  const admin = await createAdminClient();

  // 1. Fetch templates
  const templates = await getEvaluacionPlantillas();

  // 2. Fetch active courses catalog (only courses shown in gestion-cursos directory)
  const courses = await getActiveCoursesCatalog();

  // 3. Fetch OSIs with evaluation status and submission counts
  // Fetch active / recent OSIs from v_osi_formato_completo
  const { data: osiRows } = await admin
    .from("v_osi_formato_completo")
    .select("id_osi, nro_osi, servicio, nombre_empresa")
    .order("id_osi", { ascending: false })
    .limit(100);

  const osiIds = (osiRows || []).map((o: any) => o.id_osi);

  // Check which OSIs have evaluations
  const { data: osiEvals } = await admin
    .from("capacitacion_osi_evaluaciones")
    .select("id_osi, titulo, preguntas")
    .in("id_osi", osiIds);

  const evalMap = new Map<number, { titulo: string; qCount: number }>();
  for (const e of osiEvals || []) {
    evalMap.set(e.id_osi, {
      titulo: e.titulo,
      qCount: Array.isArray(e.preguntas) ? e.preguntas.length : 0,
    });
  }

  // Count submissions per OSI
  const { data: subCounts } = await admin
    .from("capacitacion_evaluaciones_respuestas")
    .select("id_osi");

  const subCountMap = new Map<number, number>();
  for (const s of subCounts || []) {
    subCountMap.set(s.id_osi, (subCountMap.get(s.id_osi) || 0) + 1);
  }

  const osis = (osiRows || []).map((o: any) => {
    const ev = evalMap.get(o.id_osi);
    return {
      id_osi: o.id_osi,
      nro_osi: o.nro_osi || `OSI-${o.id_osi}`,
      servicio: o.servicio || "Servicio de Capacitación",
      nombre_empresa: o.nombre_empresa || "Cliente",
      has_evaluation: Boolean(ev),
      evaluation_title: ev?.titulo,
      evaluation_questions_count: ev?.qCount || 0,
      submissions_count: subCountMap.get(o.id_osi) || 0,
    };
  });

  return (
    <GestionExamenesClient
      initialTemplates={templates}
      initialOsis={osis}
      courses={courses}
    />
  );
}

