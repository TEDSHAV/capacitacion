import React from "react";
import { createAdminClient } from "@/utils/supabase/server";
import {
  getEvaluacionPlantillas,
  getActiveCoursesCatalog,
} from "@/app/actions/evaluaciones-cursos";
import { SALONES } from "@/types/evaluacion";
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
    .select("id_osi, nro_osi, servicio, nombre_empresa, fecha_inicio_real, fecha_fin_real")
    .order("id_osi", { ascending: false })
    .limit(100);

  const osiIds = (osiRows || []).map((o: { id_osi: number }) => o.id_osi);

  // Check which OSIs have evaluations
  const { data: osiEvals } = await admin
    .from("capacitacion_osi_evaluaciones")
    .select("id_osi, titulo, preguntas")
    .in("id_osi", osiIds);

  const evalMap = new Map<number, { titulo: string; qCount: number; salonNombre?: string | null }>();
  for (const e of osiEvals || []) {
    const rawPreguntas = Array.isArray(e.preguntas) ? (e.preguntas as Array<Record<string, unknown>>) : [];
    const meta = rawPreguntas.find((p) => p && p._is_salon_meta === true);
    const cleanCount = rawPreguntas.filter((p) => !p || p._is_salon_meta !== true).length;
    let salonNombre: string | null = null;
    if (meta && typeof meta.salon_id === "string") {
      const s = SALONES.find((sl) => sl.id === meta.salon_id);
      if (s) salonNombre = s.nombre;
    }
    evalMap.set(e.id_osi, {
      titulo: e.titulo,
      qCount: cleanCount,
      salonNombre,
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

  const osis = (osiRows || []).map((o: {
    id_osi: number;
    nro_osi?: string | null;
    servicio?: string | null;
    nombre_empresa?: string | null;
    fecha_inicio_real?: string | null;
    fecha_fin_real?: string | null;
  }) => {
    const ev = evalMap.get(o.id_osi);
    return {
      id_osi: o.id_osi,
      nro_osi: o.nro_osi || `OSI-${o.id_osi}`,
      servicio: o.servicio || "Servicio de Capacitación",
      nombre_empresa: o.nombre_empresa || "Cliente",
      fecha_inicio_real: o.fecha_inicio_real || null,
      fecha_fin_real: o.fecha_fin_real || null,
      has_evaluation: Boolean(ev),
      evaluation_title: ev?.titulo,
      evaluation_questions_count: ev?.qCount || 0,
      salon_nombre: ev?.salonNombre || null,
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

