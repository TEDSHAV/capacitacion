import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getEntrevistaById } from "@/app/actions/entrevistas-facilitadores";
import { EntrevistaPrintView } from "../../components/EntrevistaPrintView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return {
    title: `Imprimir Entrevista #${id} | Capacitación`,
    description: "Formato oficial de entrevista para aspirante a facilitador",
  };
}

export default async function EntrevistaImprimirPage({
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

  return <EntrevistaPrintView entrevista={entrevista} />;
}
