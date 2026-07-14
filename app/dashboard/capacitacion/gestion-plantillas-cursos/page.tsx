import { getPlantillaCursosAction, getCoursesAction, getEmpresasAction } from './actions';
import GestionPlantillasCursosClient from './GestionPlantillasCursosClient';

export default async function GestionPlantillasCursosPage() {
  const [plantillasResult, coursesResult, empresasResult] = await Promise.all([
    getPlantillaCursosAction(1, 10, ""),
    getCoursesAction(),
    getEmpresasAction(),
  ]);

  return (
    <GestionPlantillasCursosClient
      initialPlantillas={plantillasResult.success ? (plantillasResult.data ?? []) : []}
      initialTotal={plantillasResult.success ? (plantillasResult.total ?? 0) : 0}
      initialCourses={coursesResult.success ? (coursesResult.data ?? []) : []}
      initialEmpresas={empresasResult.success ? (empresasResult.data ?? []) : []}
    />
  );
}
