"use server";

import { createClient } from "@/utils/supabase/server";
import { ParticipanteCertificado, ParticipantFormData } from "@/types";

export async function getParticipantsPaginated(
  page: number = 1,
  limit: number = 20,
  search: string = "",
): Promise<{
  participants: ParticipanteCertificado[] | null;
  total: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const offset = (page - 1) * limit;

    let query = supabase
      .from("participantes_certificados")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .order("nombre", { ascending: true });

    if (search.trim()) {
      query = query.or(`nombre.ilike.%${search}%,cedula.ilike.%${search}%`);
    }

    const { data, error, count } = await query.range(
      offset,
      offset + limit - 1,
    );

    if (error) throw error;

    return { participants: data || [], total: count || 0 };
  } catch (error) {
    console.error("Error en participantes:", error);
    return {
      participants: null,
      total: 0,
      error:
        error instanceof Error
          ? error.message
          : "Error al cargar los participantes.",
    };
  }
}

export async function getParticipants(): Promise<{
  participants: ParticipanteCertificado[] | null;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data: participants, error } = await supabase
      .from("participantes_certificados")
      .select("*")
      .eq("is_active", true)
      .order("nombre", { ascending: true });

    if (error) {
      throw error;
    }

    return { participants: participants || [] };
  } catch (error) {
    console.error("Error en participantes:", error);
    return {
      participants: null,
      error:
        error instanceof Error
          ? error.message
          : "Error al cargar los participantes. Por favor intente nuevamente.",
    };
  }
}

export async function getRecentParticipants(): Promise<
  ParticipanteCertificado[] | null
> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("participantes_certificados")
      .select("*")
      .eq("is_active", true)
      .order("id", { ascending: false })
      .limit(5);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error en participantes recientes:", error);
    return null;
  }
}

export async function createParticipant(
  formData: ParticipantFormData,
): Promise<{
  success: boolean;
  error?: string;
  data?: ParticipanteCertificado;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("participantes_certificados")
      .insert([
        {
          nombre: formData.nombre.trim(),
          cedula: formData.cedula.trim(),
          nacionalidad: formData.nacionalidad,
          is_active: true, // Ensure new participants are active
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al crear el participante",
    };
  }
}

export async function updateParticipant(
  id: number,
  formData: ParticipantFormData,
): Promise<{
  success: boolean;
  error?: string;
  data?: ParticipanteCertificado;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("participantes_certificados")
      .update({
        nombre: formData.nombre.trim(),
        cedula: formData.cedula.trim(),
        nacionalidad: formData.nacionalidad,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al actualizar el participante",
    };
  }
}

export async function deleteParticipant(
  id: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Soft delete: set is_active to false instead of deleting the record
    const { error } = await supabase
      .from("participantes_certificados")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al eliminar el participante",
    };
  }
}

export async function getParticipantMetrics(): Promise<any> {
  try {
    const supabase = await createClient();

    const [
      { count: totalParticipants },
      { data: certs, error },
      { data: topCompaniesData },
    ] = await Promise.all([
      supabase
        .from("participantes_certificados")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("certificados")
        .select(
          `
          id_participante,
          id_curso,
          id_estado,
          id_empresa,
          cat_estados_venezuela (nombre_estado),
          cursos (nombre),
          empresas (razon_social)
        `,
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(2000),
      // Direct aggregation for top companies if possible, otherwise we do it in-memory
      supabase
        .from("certificados")
        .select("id_empresa, empresas(razon_social)")
        .eq("is_active", true)
        .limit(1000),
    ]);

    if (error) throw error;

    const stateMap: Record<string, number> = {};
    const courseMap: Record<string, number> = {};
    const companyMap: Record<string, number> = {};

    certs?.forEach((cert: any) => {
      const stateName =
        cert.cat_estados_venezuela?.nombre_estado || "Desconocido";
      stateMap[stateName] = (stateMap[stateName] || 0) + 1;

      const courseName = cert.cursos?.nombre || "Desconocido";
      courseMap[courseName] = (courseMap[courseName] || 0) + 1;

      const companyName = cert.empresas?.razon_social || "Desconocido";
      companyMap[companyName] = (companyMap[companyName] || 0) + 1;
    });

    const topStates = Object.entries(stateMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const topCourses = Object.entries(courseMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const topCompanies = Object.entries(companyMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      total_participants: totalParticipants || 0,
      top_states: topStates,
      top_courses: topCourses,
      top_companies: topCompanies,
    };
  } catch (error) {
    console.error("Error fetching participant metrics:", error);
    return null;
  }
}

export async function getFacilitatorMetrics(): Promise<any> {
  try {
    const supabase = await createClient();

    const [
      { count: totalFacilitators },
      { count: activeFacilitators },
      { data: facilitators, error },
    ] = await Promise.all([
      supabase
        .from("facilitadores")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("facilitadores")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      supabase.from("facilitadores").select(`
            id,
            id_estado_geografico,
            cat_estados_venezuela (nombre_estado),
            temas_cursos,
            is_active
          `),
    ]);

    if (error) throw error;

    const stateMap: Record<string, number> = {};
    const courseThemeMap: Record<string, number> = {};

    facilitators?.forEach((f: any) => {
      // Only count active ones for state and theme popularity
      if (f.is_active) {
        const stateName =
          f.cat_estados_venezuela?.nombre_estado || "Desconocido";
        stateMap[stateName] = (stateMap[stateName] || 0) + 1;

        if (Array.isArray(f.temas_cursos)) {
          f.temas_cursos.forEach((tema: string) => {
            courseThemeMap[tema] = (courseThemeMap[tema] || 0) + 1;
          });
        }
      }
    });

    const topStates = Object.entries(stateMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const topThemes = Object.entries(courseThemeMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      total_facilitators: totalFacilitators || 0,
      active_facilitators: activeFacilitators || 0,
      top_states: topStates,
      top_themes: topThemes,
    };
  } catch (error) {
    console.error("Error fetching facilitator metrics:", error);
    return null;
  }
}

export async function getAnalyticsMetrics(): Promise<any> {
  try {
    const supabase = await createClient();

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const [{ data: certs, error }, { count: totalParticipants }] =
      await Promise.all([
        supabase
          .from("certificados")
          .select(
            "id, is_active, fecha_emision, calificacion, id_curso, id_facilitador, id_participante",
          )
          .limit(3000),
        supabase
          .from("participantes_certificados")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),
      ]);

    if (error) throw error;

    if (!certs || certs.length === 0) {
      return {
        total_certificates: 0,
        active_certificates: 0,
        average_score: 0,
        certificates_this_month: 0,
        certificates_this_year: 0,
        unique_courses_with_certificates: 0,
        unique_facilitators_with_certificates: 0,
        unique_participants_with_certificates: 0,
        total_participants: totalParticipants || 0,
        top_courses: [],
        top_facilitators: [],
      };
    }

    let activeCertificates = 0;
    let totalScore = 0;
    let scoreCount = 0;
    let certificatesThisMonth = 0;
    let certificatesThisYear = 0;

    const uniqueCourses = new Set<number>();
    const uniqueFacilitators = new Set<number>();
    const uniqueParticipants = new Set<number>();

    const courseMap: Record<
      number,
      {
        count: number;
        participantCount: number;
        totalScore: number;
        scoreCount: number;
      }
    > = {};
    const facilitatorMap: Record<
      number,
      {
        count: number;
        participantCount: number;
        totalScore: number;
        scoreCount: number;
      }
    > = {};

    certs.forEach((cert: any) => {
      if (cert.is_active) activeCertificates++;

      if (cert.calificacion != null) {
        totalScore += cert.calificacion;
        scoreCount++;
      }

      if (cert.fecha_emision) {
        const emissionDate = new Date(cert.fecha_emision + "T12:00:00");
        if (
          emissionDate.getMonth() === currentMonth &&
          emissionDate.getFullYear() === currentYear
        ) {
          certificatesThisMonth++;
        }
        if (emissionDate.getFullYear() === currentYear) {
          certificatesThisYear++;
        }
      }

      if (cert.id_curso) {
        uniqueCourses.add(cert.id_curso);
        if (!courseMap[cert.id_curso]) {
          courseMap[cert.id_curso] = {
            count: 0,
            participantCount: 0,
            totalScore: 0,
            scoreCount: 0,
          };
        }
        courseMap[cert.id_curso].count++;
        if (cert.id_participante) courseMap[cert.id_curso].participantCount++;
        if (cert.calificacion != null) {
          courseMap[cert.id_curso].totalScore += cert.calificacion;
          courseMap[cert.id_curso].scoreCount++;
        }
      }

      if (cert.id_facilitador) {
        uniqueFacilitators.add(cert.id_facilitador);
        if (!facilitatorMap[cert.id_facilitador]) {
          facilitatorMap[cert.id_facilitador] = {
            count: 0,
            participantCount: 0,
            totalScore: 0,
            scoreCount: 0,
          };
        }
        facilitatorMap[cert.id_facilitador].count++;
        if (cert.id_participante)
          facilitatorMap[cert.id_facilitador].participantCount++;
        if (cert.calificacion != null) {
          facilitatorMap[cert.id_facilitador].totalScore += cert.calificacion;
          facilitatorMap[cert.id_facilitador].scoreCount++;
        }
      }

      if (cert.id_participante) uniqueParticipants.add(cert.id_participante);
    });

    const topCourseIds = Object.entries(courseMap)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([id]) => parseInt(id));
    const topFacilitatorIds = Object.entries(facilitatorMap)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([id]) => parseInt(id));

    const [{ data: courseNames }, { data: facilitatorNames }] =
      await Promise.all([
        topCourseIds.length > 0
          ? supabase.from("cursos").select("id, nombre").in("id", topCourseIds)
          : Promise.resolve({ data: [] as { id: number; nombre: string }[] }),
        topFacilitatorIds.length > 0
          ? supabase
              .from("facilitadores")
              .select("id, nombre_apellido")
              .in("id", topFacilitatorIds)
          : Promise.resolve({
              data: [] as { id: number; nombre_apellido: string }[],
            }),
      ]);

    const courseNameMap = new Map(
      (courseNames || []).map((c: any) => [c.id, c.nombre]),
    );
    const facilitatorNameMap = new Map(
      (facilitatorNames || []).map((f: any) => [f.id, f.nombre_apellido]),
    );

    const topCourses = topCourseIds.map((id) => {
      const data = courseMap[id];
      return {
        course_name: courseNameMap.get(id) || "Desconocido",
        certificate_count: data.count,
        participant_count: data.participantCount,
        avg_score:
          data.scoreCount > 0
            ? (data.totalScore / data.scoreCount).toFixed(1)
            : "0",
      };
    });

    const topFacilitators = topFacilitatorIds.map((id) => {
      const data = facilitatorMap[id];
      return {
        facilitator_name: facilitatorNameMap.get(id) || "Desconocido",
        certificate_count: data.count,
        participant_count: data.participantCount,
        avg_score:
          data.scoreCount > 0
            ? (data.totalScore / data.scoreCount).toFixed(1)
            : "0",
        total_hours: 0,
      };
    });

    return {
      total_certificates: certs.length,
      active_certificates: activeCertificates,
      average_score:
        scoreCount > 0 ? parseFloat((totalScore / scoreCount).toFixed(1)) : 0,
      certificates_this_month: certificatesThisMonth,
      certificates_this_year: certificatesThisYear,
      unique_courses_with_certificates: uniqueCourses.size,
      unique_facilitators_with_certificates: uniqueFacilitators.size,
      unique_participants_with_certificates: uniqueParticipants.size,
      total_participants: totalParticipants || 0,
      top_courses: topCourses,
      top_facilitators: topFacilitators,
    };
  } catch (error) {
    console.error("Error fetching analytics metrics:", error);
    return null;
  }
}

export async function getParticipantStats(): Promise<{
  totalParticipants: number;
  activeCertificates: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const [
      { count: totalParticipants, error: pError },
      { count: activeCertificates, error: cError },
    ] = await Promise.all([
      supabase
        .from("participantes_certificados")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("certificados")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
    ]);

    if (pError || cError) throw pError || cError;

    return {
      totalParticipants: totalParticipants || 0,
      activeCertificates: activeCertificates || 0,
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    return {
      totalParticipants: 0,
      activeCertificates: 0,
      error: "Error al cargar métricas",
    };
  }
}
