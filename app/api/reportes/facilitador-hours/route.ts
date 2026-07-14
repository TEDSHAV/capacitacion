import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

interface CertificateInfo {
  nro_osi: number;
  course_name: string;
  hours: number;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const stateId = searchParams.get("stateId");

    // Start with certificate query
    let query = supabase
      .from("certificados")
      .select(
        `
        id_facilitador,
        nro_osi,
        id_curso,
        fecha_emision
      `,
      )
      .not("id_facilitador", "is", null);

    if (stateId) {
      // We'll need to filter facilitadores separately since we can't join in this simplified version
      const { data: facilitadoresInState } = await supabase
        .from("facilitadores")
        .select("id")
        .or(`id_estado_base.eq.${stateId},id_estado_geografico.eq.${stateId}`)
        .eq("is_active", true);

      if (facilitadoresInState) {
        const facilitatorIds = facilitadoresInState.map((f) => f.id);
        query = query.in("id_facilitador", facilitatorIds);
      }
    }

    // Fetch data in parallel to avoid relationship issues
    const [
      { data: certificates, error },
      { data: servicios },
      { data: facilitadores },
      { data: allStates },
      { data: osiData },
    ] = await Promise.all([
      query,
      supabase
        .from("catalogo_servicios")
        .select("id, nombre, carga_horaria_std"),
      supabase
        .from("facilitadores")
        .select(
          `
          id,
          nombre_apellido,
          is_active,
          id_estado_base,
          id_estado_geografico
        `,
        )
        .eq("is_active", true),
      supabase
        .from("cat_estados_venezuela")
        .select("id, nombre_estado")
        .order("nombre_estado"),
      supabase
        .from("ejecucion_osi")
        .select("nro_osi, id_facilitador, dias_servicio")
        .not("id_facilitador", "is", null),
    ]);

    if (error) {
      console.error("Error fetching certificates:", error);
      return NextResponse.json(
        { error: "Error fetching certificates", details: error },
        { status: 500 },
      );
    }

    if (!facilitadores) {
      return NextResponse.json({
        facilitatorStats: [],
        totalFacilitadores: 0,
        totalHours: 0,
      });
    }

    // Create maps for quick lookup
    const serviciosMap = new Map((servicios || []).map((s: any) => [s.id, s]));

    // Helper function to get state name by ID
    const getStateName = (stateId: number | null) => {
      if (!stateId) return "No definido";
      const state = allStates?.find((s) => s.id === stateId);
      return state?.nombre_estado || "No definido";
    };

    // Calculate teaching hours per facilitator
    const facilitatorHours = new Map<
      number,
      {
        facilitatorId: number;
        nombre_apellido: string;
        is_active: boolean;
        estado_nombre: string;
        estatus_nombre: string;
        totalHours: number;
        totalCertificates: number;
        certificates: CertificateInfo[];
      }
    >();

    // Process certificates - use data from catalogo_servicios
    if (certificates && facilitadores) {
      // Create a map to track unique courses per facilitador
      const facilitadorCourses = new Map<
        number,
        Map<number, { course_name: string; hours: number; nro_osi: number }>
      >();

      certificates.forEach((cert: any) => {
        if (!cert.id_facilitador || !cert.id_curso) return;

        const facilitator = facilitadores.find(
          (f: any) => f.id === cert.id_facilitador,
        );
        const servicio = serviciosMap.get(cert.id_curso);

        if (!facilitator || !servicio) return;

        // Use hours directly from the catalogo_servicios table
        const hours = servicio.carga_horaria_std || 0;

        // Only add the course once per facilitador (unique by course ID)
        if (!facilitadorCourses.has(facilitator.id)) {
          facilitadorCourses.set(facilitator.id, new Map());
        }

        const facilitatorCourseMap = facilitadorCourses.get(facilitator.id)!;
        if (!facilitatorCourseMap.has(cert.id_curso)) {
          facilitatorCourseMap.set(cert.id_curso, {
            course_name: servicio.nombre,
            hours: hours,
            nro_osi: cert.nro_osi || 0,
          });
        }
      });

      // Now convert the unique courses map to the facilitatorHours structure
      facilitadorCourses.forEach((courseMap, facilitatorId) => {
        const facilitator = facilitadores.find(
          (f: any) => f.id === facilitatorId,
        );
        if (!facilitator) return;

        const courses = Array.from(courseMap.values());
        const totalHours = courses.reduce(
          (sum, course) => sum + course.hours,
          0,
        );
        const totalCourses = courses.length;

        facilitatorHours.set(facilitatorId, {
          facilitatorId: facilitator.id,
          nombre_apellido: facilitator.nombre_apellido,
          is_active: facilitator.is_active,
          estado_nombre: getStateName(
            facilitator.id_estado_base || facilitator.id_estado_geografico,
          ),
          estatus_nombre: "Activo",
          totalHours: totalHours,
          totalCertificates: totalCourses, // This now represents unique courses taught
          certificates: courses.map((course) => ({
            nro_osi: course.nro_osi,
            course_name: course.course_name,
            hours: course.hours,
          })),
        });
      });
    }

    // Add OSI hours
    const osiHours = new Map<number, number>();
    if (osiData) {
      osiData.forEach((osi: any) => {
        if (osi.id_facilitador && osi.dias_servicio) {
          const hours = osi.dias_servicio * 8; // 8 hours per day
          const current = osiHours.get(osi.id_facilitador) || 0;
          osiHours.set(osi.id_facilitador, current + hours);
        }
      });
    }

    // Convert to array and merge OSI hours
    const facilitatorStats = Array.from(facilitatorHours.values())
      .map((stat) => ({
        ...stat,
        osiHours: osiHours.get(stat.facilitatorId) || 0,
        totalCombinedHours:
          stat.totalHours + (osiHours.get(stat.facilitatorId) || 0),
      }))
      .sort((a, b) => b.totalCombinedHours - a.totalCombinedHours);

    return NextResponse.json({
      facilitatorStats,
      totalFacilitadores: facilitatorStats.length,
      totalHours: facilitatorStats.reduce(
        (sum, stat) => sum + stat.totalCombinedHours,
        0,
      ),
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 },
    );
  }
}
