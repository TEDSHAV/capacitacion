import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { State, CourseTopic } from "@/types";
import ReportesClient from "./ReportesClient";

export default async function ReportesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`)
  }

  // Fetch states for filter dropdown
  const { data: states } = await supabase
    .from("cat_estados_venezuela")
    .select("id, nombre_estado, capital_estado")
    .order("nombre_estado");

  // Fetch courses for filter dropdown
  const { data: courses } = await supabase
    .from("cursos")
    .select("id, nombre, contenido, horas_estimadas, created_at, is_active, nota_aprobatoria, emite_carnet")
    .eq("is_active", true)
    .order("nombre");

  // Transform the data to match State interface
  const typedStates: State[] = (states || []).map(state => ({
    id: Number(state.id),
    nombre_estado: state.nombre_estado,
    capital_estado: state.capital_estado
  }));

  // Transform the data to match CourseTopic interface
  const typedCourses: CourseTopic[] = (courses || []).map(course => ({
    id: course.id.toString(),
    nombre: course.nombre,
    name: course.nombre, // Alias for compatibility
    contenido: course.contenido,
    horas_estimadas: course.horas_estimadas,
    // cliente_asociado: course.cliente_asociado, // Removed - column doesn't exist
    created_at: course.created_at,
    is_active: course.is_active,
    nota_aprobatoria: course.nota_aprobatoria,
    emite_carnet: course.emite_carnet
  }));

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <ReportesClient user={user} states={typedStates} courses={typedCourses} />
    </div>
  );
}
