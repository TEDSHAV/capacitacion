import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { nombre, empresa_id, contenido } = await request.json();

    // Validate required fields
    if (!nombre || !contenido) {
      return NextResponse.json(
        {
          error: "Name and content are required",
        },
        { status: 400 },
      );
    }

    // Create the course in catalogo_servicios
    const { data, error } = await supabase
      .from("catalogo_servicios")
      .insert({
        nombre,
        contenido_curso: contenido,
        esta_activo: true,
        id_departamento_ejecutante: 3, // Capacitacion
        tipo_servicio: 1,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating course:", error);
      return NextResponse.json(
        {
          error: "Failed to create course",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/cursos:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all active services from catalogo_servicios for Capacitacion
    const { data, error } = await supabase
      .from("catalogo_servicios")
      .select(
        `
        *
      `,
      )
      .eq("esta_activo", true)
      .eq("id_departamento_ejecutante", 3)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching courses:", error);
      return NextResponse.json(
        {
          error: "Failed to fetch courses",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error in GET /api/cursos:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
