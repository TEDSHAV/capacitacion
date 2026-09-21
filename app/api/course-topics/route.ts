import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const includeAll = request.nextUrl.searchParams.get("all") === "true";

    // Get all active courses from catalogo_servicios for Capacitacion (tipo_servicio = 1)
    let { data, error } = await supabase
      .from("catalogo_servicios")
      .select(
        `
        id,
        nombre,
        mostrar_en_catalogo
      `,
      )
      .eq("esta_activo", true)
      .eq("id_departamento_ejecutante", 3)
      .eq("tipo_servicio", 1)
      .order("nombre", { ascending: true });

    // Fallback if column 'mostrar_en_catalogo' does not exist yet in DB schema
    if (
      error &&
      (error.code === "42703" ||
        error.message?.includes("mostrar_en_catalogo"))
    ) {
      const retry = await supabase
        .from("catalogo_servicios")
        .select(
          `
          id,
          nombre
        `,
        )
        .eq("esta_activo", true)
        .eq("id_departamento_ejecutante", 3)
        .eq("tipo_servicio", 1)
        .order("nombre", { ascending: true });

      data = retry.data as any;
      error = retry.error;
    }

    if (error) {
      console.error("Error fetching course topics:", error);
      return NextResponse.json(
        { error: "Failed to fetch course topics" },
        { status: 500 },
      );
    }

    // Filter by mostrar_en_catalogo:
    // When includeAll is false, filter out courses where mostrar_en_catalogo is explicitly false.
    // Null/undefined values default to true for backwards compatibility with existing rows.
    const result = includeAll
      ? data || []
      : (data || []).filter(
          (course: any) => course.mostrar_en_catalogo !== false,
        );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Course topics fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
