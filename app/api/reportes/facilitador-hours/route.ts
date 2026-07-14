import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const stateId = searchParams.get("stateId");

    // Get certificates with facilitator and course information
    let query = supabase
      .from("certificados")
      .select(`
        id_facilitador,
        nro_osi,
        id_curso,
        cursos (
          id,
          nombre,
          horas_estimadas
        ),
        facilitadores (
          id,
          nombre_apellido,
          is_active,
          id_estatus,
          id_estado_base,
          id_estado_geografico,
          conf_estatus (
            nombre_estado,
            definicion
          ),
          estado_base:cat_estados_venezuela (
            nombre_estado
          ),
          estado_geografico:cat_estados_venezuela (
            nombre_estado
          )
        )
      `)
      .eq("is_active", true)
      .not("id_facilitador", "is", null);

    if (stateId) {
      query = query.or(`facilitadores.id_estado_base.eq.${stateId},facilitadores.id_estado_geografico.eq.${stateId}`);
    }

    const { data: certificates, error } = await query;

    if (error) {
      console.error("Error fetching certificates:", error);
      return NextResponse.json(
        { error: "Error fetching certificates" },
        { status: 500 }
      );
    }

    // Calculate teaching hours per facilitator
    const facilitatorHours = new Map<number, {
      facilitatorId: number;
      nombre_apellido: string;
      is_active: boolean;
      estado_nombre: string;
      estatus_nombre: string;
      totalHours: number;
      totalCertificates: number;
      certificates: Array<{
        nro_osi: number;
        course_name: string;
        hours: number;
      }>;
    }>();

    if (certificates) {
      certificates.forEach((cert: any) => {
        if (!cert.facilitadores || !cert.cursos) return;

        const facilitator = cert.facilitadores;
        const course = cert.cursos;
        const hours = course.horas_estimadas || 0;

        const existing = facilitatorHours.get(facilitator.id);
        
        if (existing) {
          existing.totalHours += hours;
          existing.totalCertificates += 1;
          existing.certificates.push({
            nro_osi: cert.nro_osi,
            course_name: course.nombre,
            hours: hours,
          });
        } else {
          facilitatorHours.set(facilitator.id, {
            facilitatorId: facilitator.id,
            nombre_apellido: facilitator.nombre_apellido,
            is_active: facilitator.is_active,
            estado_nombre: facilitator.estado_base?.nombre_estado || facilitator.estado_geografico?.nombre_estado || "No definido",
            estatus_nombre: facilitator.conf_estatus?.nombre_estado || "No definido",
            totalHours: hours,
            totalCertificates: 1,
            certificates: [{
              nro_osi: cert.nro_osi,
              course_name: course.nombre,
              hours: hours,
            }],
          });
        }
      });
    }

    // Convert to array and sort by total hours
    const facilitatorStats = Array.from(facilitatorHours.values())
      .sort((a, b) => b.totalHours - a.totalHours);

    // Also get OSI information for additional hours data
    const { data: osiData } = await supabase
      .from("ejecucion_osi")
      .select(`
        nro_osi,
        id_facilitador,
        dias_servicio,
        facilitadores (
          id,
          nombre_apellido
        )
      `)
      .not("id_facilitador", "is", null);

    // Calculate OSI-based hours (assuming 8 hours per day of service)
    const osiHours = new Map<number, number>();
    
    if (osiData) {
      osiData.forEach((osi: any) => {
        if (osi.facilitadores && osi.dias_servicio) {
          const hours = osi.dias_servicio * 8; // 8 hours per day
          const current = osiHours.get(osi.facilitadores.id) || 0;
          osiHours.set(osi.facilitadores.id, current + hours);
        }
      });
    }

    // Merge OSI hours with certificate hours
    const mergedStats = facilitatorStats.map((stat) => ({
      ...stat,
      osiHours: osiHours.get(stat.facilitatorId) || 0,
      totalCombinedHours: stat.totalHours + (osiHours.get(stat.facilitatorId) || 0),
    }));

    return NextResponse.json({
      facilitatorStats: mergedStats,
      totalFacilitadores: mergedStats.length,
      totalHours: mergedStats.reduce((sum, stat) => sum + stat.totalCombinedHours, 0),
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
