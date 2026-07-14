import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const stateId = searchParams.get("stateId");

    // Start with a simple query to debug
    let query = supabase.from("facilitadores").select(`
        id,
        nombre_apellido,
        cedula,
        email,
        telefono,
        is_active,
        id_estado_geografico
      `);

    if (stateId) {
      query = query.eq("id_estado_geografico", stateId);
    }

    const { data: facilitadores, error } = await query.order("nombre_apellido");

    if (error) {
      console.error("Error fetching facilitadores:", error);
      return NextResponse.json(
        { error: "Error fetching facilitadores", details: error },
        { status: 500 },
      );
    }

    // Count by state
    const { data: stateCounts, error: countError } = await supabase
      .from("facilitadores")
      .select("id_estado_geografico")
      .eq("is_active", true);

    if (countError) {
      console.error("Error counting facilitadores by state:", countError);
      return NextResponse.json(
        { error: "Error counting facilitadores by state", details: countError },
        { status: 500 },
      );
    }

    // Get all states for complete picture
    const { data: allStates } = await supabase
      .from("cat_estados_venezuela")
      .select("id, nombre_estado")
      .order("nombre_estado");

    // Helper function to get state name by ID
    const getStateName = (stateId: number | null) => {
      if (!stateId) return "No definido";
      const state = allStates?.find((s) => s.id === stateId);
      return state?.nombre_estado || "No definido";
    };

    // Count facilitadores by state
    const stateStats = new Map<number, number>();

    if (stateCounts) {
      stateCounts.forEach((facilitador: any) => {
        if (facilitador.id_estado_geografico) {
          const current = stateStats.get(facilitador.id_estado_geografico) || 0;
          stateStats.set(facilitador.id_estado_geografico, current + 1);
        }
      });
    }

    // Combine states with counts and add facilitador details
    const statesWithCounts = (allStates || []).map((state: any) => ({
      id: state.id,
      nombre_estado: state.nombre_estado,
      count: stateStats.get(state.id) || 0,
    }));

    // Add state names to facilitadores
    const facilitadoresWithStateNames = (facilitadores || []).map(
      (facilitador: any) => ({
        ...facilitador,
        estado_geografico_nombre: getStateName(
          facilitador.id_estado_geografico,
        ),
      }),
    );

    return NextResponse.json({
      facilitadores: facilitadoresWithStateNames,
      stateStats: statesWithCounts,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 },
    );
  }
}
