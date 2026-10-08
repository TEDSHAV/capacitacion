import { redirect } from "next/navigation";
import { checkUserNegociosAccess } from "@/lib/negocios-auth";
import GestionDeFacilitadoresClient from "./GestionDeFacilitadoresClient";

export const dynamic = "force-dynamic";

export default async function GestionDeFacilitadoresPage({
  searchParams,
}: {
  searchParams?: Promise<{ edit?: string; create?: string }>;
}) {
  const access = await checkUserNegociosAccess();
  const resolvedSearchParams = searchParams ? await searchParams : {};

  // If Negocios read-only user tries to access edit or create mode, redirect to list
  if (access.isNegociosReadOnly && (resolvedSearchParams.edit || resolvedSearchParams.create)) {
    redirect("/dashboard/capacitacion/gestion-de-facilitadores");
  }

  return <GestionDeFacilitadoresClient isReadOnly={access.isNegociosReadOnly} />;
}
