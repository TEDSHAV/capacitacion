import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCompaniesAndCities } from "@/app/actions/companies-cities";
import {
  getCertificateTemplatesAction,
  getCarnetTemplatesAction,
  getSignaturesForDropdownAction,
} from "@/app/actions/dropdown-data";
import { getFacilitatorsAction } from "@/app/actions/facilitators-crud";
import { GeneracionPersonalizadaClient } from "./GeneracionPersonalizadaClient";

export default async function GeneracionPersonalizadaPage() {
  if (process.env.NODE_ENV !== "development") {
    redirect("/dashboard/capacitacion");
  }

  const [companiesResult, certTemplatesResult, carnetTemplatesResult, signaturesResult, facilitadoresResult] =
    await Promise.all([
      getCompaniesAndCities(),
      getCertificateTemplatesAction(),
      getCarnetTemplatesAction(),
      getSignaturesForDropdownAction(),
      getFacilitatorsAction(),
    ]);

  const supabase = await createClient();
  const { data: coursesData } = await supabase
    .from("catalogo_servicios")
    .select(`
      id,
      nombre,
      contenido_curso,
      carga_horaria_std,
      nota_aprobatoria,
      emite_carnet,
      esta_activo
    `)
    .eq("esta_activo", true)
    .eq("id_departamento_ejecutante", 3)
    .order("nombre", { ascending: true })
    .limit(1000);

  const courses = (coursesData || []).map((course: any) => ({
    id: course.id.toString(),
    nombre: course.nombre,
    name: course.nombre,
    description: course.nombre,
    contenido_curso: course.contenido_curso,
    horas_estimadas: course.carga_horaria_std,
    nota_aprobatoria: course.nota_aprobatoria,
    emite_carnet: course.emite_carnet,
  }));

  return (
    <GeneracionPersonalizadaClient
      companies={companiesResult.companies || []}
      cities={companiesResult.cities || []}
      courses={courses}
      certTemplates={certTemplatesResult.data || []}
      carnetTemplates={carnetTemplatesResult.data || []}
      signatures={signaturesResult.data || []}
      facilitadores={facilitadoresResult.data || []}
    />
  );
}
