import React from "react";
import { notFound } from "next/navigation";
import {
  getEvaluacionPlantilla,
  getActiveCoursesCatalog,
} from "@/app/actions/evaluaciones-cursos";
import PlantillaFormPage from "../PlantillaFormPage";

export const metadata = {
  title: "Editar Plantilla de Examen | Capacitación SHA",
};

interface EditPlantillaPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPlantillaPage({ params }: EditPlantillaPageProps) {
  const resolvedParams = await params;
  const templateId = parseInt(resolvedParams.id, 10);
  if (isNaN(templateId)) notFound();

  const [tplRes, courses] = await Promise.all([
    getEvaluacionPlantilla(templateId),
    getActiveCoursesCatalog(),
  ]);

  if (!tplRes.data) {
    notFound();
  }

  return <PlantillaFormPage initialTemplate={tplRes.data} courses={courses} />;
}

