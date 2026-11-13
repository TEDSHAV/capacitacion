import React from "react";
import { getActiveCoursesCatalog } from "@/app/actions/evaluaciones-cursos";
import PlantillaFormPage from "../PlantillaFormPage";

export const metadata = {
  title: "Nueva Plantilla de Examen | Capacitación SHA",
};

export default async function NuevaPlantillaPage() {
  const courses = await getActiveCoursesCatalog();

  return <PlantillaFormPage courses={courses} />;
}

