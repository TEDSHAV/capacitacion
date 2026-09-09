"use server";

import { createClient } from "@/utils/supabase/server";

export interface TopicRating {
  topicName: string;
  avgRating: number; // 1.0 to 5.0
  reviewCount: number; // count of surveys
  sessionsCount: number; // distinct OSIs taught for this topic
}

export interface FacilitatorPoolItem {
  id: number;
  nombre_apellido: string;
  cedula: string | null;
  rif: string | null;
  email: string | null;
  telefono: string | null;
  is_active: boolean;
  foto_perfil_url: string | null;
  titulo_profesional: string | null;
  nivel_educacion: string | null;
  formacion_academica: string | null;
  experiencia_laboral: string | null;
  competencias_habilidades: string | null;
  notas_observaciones: string | null;
  alcance: string | null;
  id_ciudad: number | null;
  ciudad_nombre: string | null;
  id_estado_geografico: number | null;
  estado_nombre: string | null;
  temas_cursos: string[];
  calificacion: number | null;
  ano_ingreso: number | null;
  fecha_ingreso: string | null;
  fecha_creacion: string | null;
  // Computed Performance Metrics
  overallRating: number; // 0.0 to 5.0
  reviewCount: number; // total surveys
  topicRatings: Record<string, TopicRating>; // keyed by topic name normalized
  evaluacion: {
    condicion_final: string | null;
    porcentaje_total: number | null;
    fecha_evaluacion: string | null;
  } | null;
  totalOsisCount: number;
  totalCertificadosCount: number;
}

export interface FacilitatorPoolResponse {
  facilitadores: FacilitatorPoolItem[];
  allTopics: string[]; // unique list of all course topics taught across pool
  allCities: string[]; // unique list of base cities
  error: string | null;
}

/**
 * Fetch all facilitators enriched with:
 * - Real satisfaction survey ratings (overall and broken down per course topic)
 * - Official RG-CAP-004 evaluation status and score
 * - Location (city, state, reach)
 * - Number of executed services/OSIs and participants certified
 */
export async function getFacilitatorPoolAction(): Promise<FacilitatorPoolResponse> {
  try {
    const supabase = await createClient();

    // 1. Fetch facilitadores with location relations
    const [
      facilitadoresRes,
      assignmentsRes,
      osisRes,
      surveysRes,
      evaluacionesRes,
      certificadosRes,
    ] = await Promise.all([
      supabase
        .from("facilitadores")
        .select(`
          id,
          nombre_apellido,
          cedula,
          rif,
          email,
          telefono,
          is_active,
          foto_perfil_url,
          titulo_profesional,
          nivel_educacion,
          formacion_academica,
          experiencia_laboral,
          competencias_habilidades,
          notas_observaciones,
          alcance,
          id_ciudad,
          id_estado_geografico,
          temas_cursos,
          calificacion,
          ano_ingreso,
          fecha_ingreso,
          fecha_creacion,
          cat_ciudades!left ( id, nombre_ciudad ),
          cat_estados_venezuela!left ( id, nombre_estado )
        `)
        .order("nombre_apellido", { ascending: true }),

      supabase
        .from("facilitador_osi_assignments")
        .select("osi_id, facilitador_id")
        .eq("is_active", true),

      supabase
        .from("v_osi_lista")
        .select("id_osi, servicio, id_servicio"),

      supabase
        .from("course_satisfaction_surveys")
        .select("id_osi, q1, q2, q3, q4, q5"),

      supabase
        .from("facilitador_evaluaciones")
        .select("facilitador_id, condicion_final, porcentaje_total, puntaje_total, fecha_evaluacion")
        .order("fecha_evaluacion", { ascending: false }),

      supabase
        .from("certificados")
        .select("id_facilitador, nro_osi")
        .not("id_facilitador", "is", null),
    ]);

    if (facilitadoresRes.error) {
      console.error("[getFacilitatorPoolAction] Error fetching facilitadores:", facilitadoresRes.error);
      return { facilitadores: [], allTopics: [], allCities: [], error: facilitadoresRes.error.message };
    }

    const rawFacilitadores = facilitadoresRes.data || [];
    const assignments = assignmentsRes.data || [];
    const osis = osisRes.data || [];
    const surveys = surveysRes.data || [];
    const evaluaciones = evaluacionesRes.data || [];
    const certificados = certificadosRes.data || [];

    // Map: id_osi -> course topic name
    const osiToTopic = new Map<number, string>();
    for (const o of osis) {
      if (o.id_osi && o.servicio) {
        osiToTopic.set(o.id_osi, o.servicio.trim());
      }
    }

    // Map: id_osi -> Set<facilitador_id>
    const osiToFacilitators = new Map<number, Set<number>>();
    for (const a of assignments) {
      if (a.osi_id && a.facilitador_id) {
        let set = osiToFacilitators.get(a.osi_id);
        if (!set) {
          set = new Set<number>();
          osiToFacilitators.set(a.osi_id, set);
        }
        set.add(a.facilitador_id);
      }
    }

    // Fallback mapping from certificados if OSI had no assignment
    for (const c of certificados) {
      if (c.id_facilitador && c.nro_osi) {
        // Find corresponding id_osi if available
        const numericOsi = typeof c.nro_osi === "number" ? c.nro_osi : parseInt(String(c.nro_osi), 10);
        if (!isNaN(numericOsi)) {
          let set = osiToFacilitators.get(numericOsi);
          if (!set) {
            set = new Set<number>();
            osiToFacilitators.set(numericOsi, set);
          }
          set.add(c.id_facilitador);
        }
      }
    }

    // Map: facilitador_id -> Set of distinct OSIs taught
    const facilitadorOsiCount = new Map<number, Set<number>>();
    for (const [osiId, fids] of osiToFacilitators.entries()) {
      for (const fid of fids) {
        let set = facilitadorOsiCount.get(fid);
        if (!set) {
          set = new Set<number>();
          facilitadorOsiCount.set(fid, set);
        }
        set.add(osiId);
      }
    }

    // Map: facilitador_id -> count of certificates
    const facilitadorCertCount = new Map<number, number>();
    for (const c of certificados) {
      if (c.id_facilitador) {
        facilitadorCertCount.set(
          c.id_facilitador,
          (facilitadorCertCount.get(c.id_facilitador) || 0) + 1,
        );
      }
    }

    // Map: facilitador_id -> latest evaluacion
    const facilitadorLatestEval = new Map<
      number,
      { condicion_final: string | null; porcentaje_total: number | null; fecha_evaluacion: string | null }
    >();
    for (const ev of evaluaciones) {
      if (ev.facilitador_id && !facilitadorLatestEval.has(ev.facilitador_id)) {
        facilitadorLatestEval.set(ev.facilitador_id, {
          condicion_final: ev.condicion_final,
          porcentaje_total: ev.porcentaje_total != null ? Number(ev.porcentaje_total) : null,
          fecha_evaluacion: ev.fecha_evaluacion,
        });
      }
    }

    // Process surveys:
    // facilitador_id -> { totalScore, count }
    // facilitador_id -> topicName -> { totalScore, count, osiSet }
    const facOverallSurvey = new Map<number, { totalScore: number; count: number }>();
    const facTopicSurvey = new Map<
      number,
      Map<string, { totalScore: number; count: number; osis: Set<number> }>
    >();

    for (const s of surveys) {
      const fids = osiToFacilitators.get(s.id_osi);
      if (!fids || fids.size === 0) continue;

      const surveyAvg = (s.q1 + s.q2 + s.q3 + s.q4 + s.q5) / 5;
      const topicName = osiToTopic.get(s.id_osi) || "General";

      for (const fid of fids) {
        // Overall
        let overall = facOverallSurvey.get(fid);
        if (!overall) {
          overall = { totalScore: 0, count: 0 };
          facOverallSurvey.set(fid, overall);
        }
        overall.totalScore += surveyAvg;
        overall.count += 1;

        // Per topic
        let topicsMap = facTopicSurvey.get(fid);
        if (!topicsMap) {
          topicsMap = new Map();
          facTopicSurvey.set(fid, topicsMap);
        }
        let tStats = topicsMap.get(topicName);
        if (!tStats) {
          tStats = { totalScore: 0, count: 0, osis: new Set<number>() };
          topicsMap.set(topicName, tStats);
        }
        tStats.totalScore += surveyAvg;
        tStats.count += 1;
        tStats.osis.add(s.id_osi);
      }
    }

    const allTopicsSet = new Set<string>();
    const allCitiesSet = new Set<string>();

    const pool: FacilitatorPoolItem[] = rawFacilitadores.map((fac) => {
      const cityData = fac.cat_ciudades as any;
      const stateData = fac.cat_estados_venezuela as any;
      const ciudadNombre = cityData?.nombre_ciudad || null;
      const estadoNombre = stateData?.nombre_estado || null;

      if (ciudadNombre) allCitiesSet.add(ciudadNombre);

      const temas = Array.isArray(fac.temas_cursos) ? fac.temas_cursos : [];
      for (const t of temas) {
        if (t && t.trim()) allTopicsSet.add(t.trim());
      }

      // Overall rating
      const overallData = facOverallSurvey.get(fac.id);
      const overallRating =
        overallData && overallData.count > 0
          ? Number((overallData.totalScore / overallData.count).toFixed(1))
          : fac.calificacion && fac.calificacion > 0
            ? fac.calificacion
            : 0;
      const reviewCount = overallData?.count || 0;

      // Topic ratings
      const topicRatings: Record<string, TopicRating> = {};
      const topicsMap = facTopicSurvey.get(fac.id);

      // 1. Add ratings for topics derived from surveys
      if (topicsMap) {
        for (const [topicName, tStats] of topicsMap.entries()) {
          allTopicsSet.add(topicName);
          const avg = Number((tStats.totalScore / tStats.count).toFixed(1));
          topicRatings[topicName.toLowerCase().trim()] = {
            topicName,
            avgRating: avg,
            reviewCount: tStats.count,
            sessionsCount: tStats.osis.size,
          };
        }
      }

      // 2. Also ensure each topic listed in temas_cursos is represented
      for (const topicName of temas) {
        const key = topicName.toLowerCase().trim();
        if (!topicRatings[key]) {
          topicRatings[key] = {
            topicName,
            avgRating: 0,
            reviewCount: 0,
            sessionsCount: 0,
          };
        }
      }

      return {
        id: fac.id,
        nombre_apellido: fac.nombre_apellido || "",
        cedula: fac.cedula,
        rif: fac.rif,
        email: fac.email,
        telefono: fac.telefono,
        is_active: fac.is_active,
        foto_perfil_url: fac.foto_perfil_url,
        titulo_profesional: fac.titulo_profesional,
        nivel_educacion: fac.nivel_educacion,
        formacion_academica: fac.formacion_academica,
        experiencia_laboral: fac.experiencia_laboral,
        competencias_habilidades: fac.competencias_habilidades,
        notas_observaciones: fac.notas_observaciones,
        alcance: fac.alcance,
        id_ciudad: fac.id_ciudad,
        ciudad_nombre: ciudadNombre,
        id_estado_geografico: fac.id_estado_geografico,
        estado_nombre: estadoNombre,
        temas_cursos: temas,
        calificacion: fac.calificacion,
        ano_ingreso: fac.ano_ingreso,
        fecha_ingreso: fac.fecha_ingreso,
        fecha_creacion: fac.fecha_creacion,
        overallRating,
        reviewCount,
        topicRatings,
        evaluacion: facilitadorLatestEval.get(fac.id) || null,
        totalOsisCount: facilitadorOsiCount.get(fac.id)?.size || 0,
        totalCertificadosCount: facilitadorCertCount.get(fac.id) || 0,
      };
    });

    return {
      facilitadores: pool,
      allTopics: Array.from(allTopicsSet).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" })),
      allCities: Array.from(allCitiesSet).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" })),
      error: null,
    };
  } catch (err) {
    console.error("[getFacilitatorPoolAction] Uncaught exception:", err);
    return {
      facilitadores: [],
      allTopics: [],
      allCities: [],
      error: err instanceof Error ? err.message : "Error al cargar el pool de facilitadores.",
    };
  }
}
