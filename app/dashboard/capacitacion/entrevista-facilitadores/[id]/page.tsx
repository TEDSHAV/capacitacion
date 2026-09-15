import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getEntrevistaById } from "@/app/actions/entrevistas-facilitadores";
import { EntrevistaFormClient } from "../components/EntrevistaFormClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return {
    title: `Entrevista #${id} | Capacitación`,
    description: "Detalle y edición de formato de entrevista",
  };
}

export default async function EntrevistaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }

  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    notFound();
  }

  const { entrevista, error } = await getEntrevistaById(numId);
  if (error || !entrevista) {
    notFound();
  }

  return (
    <EntrevistaFormClient
      initialData={entrevista}
      mode="editar"
    />
  );
}
