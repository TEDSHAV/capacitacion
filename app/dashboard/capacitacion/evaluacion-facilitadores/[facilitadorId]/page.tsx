import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import EvaluacionFormClient from "./components/EvaluacionFormClient";

export default async function FacilitadorEvaluacionPage({
  params,
}: {
  params: Promise<{ facilitadorId: string }>;
}) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }

  const { facilitadorId } = await params;
  const id = parseInt(facilitadorId);
  if (isNaN(id)) {
    redirect("/dashboard/capacitacion/evaluacion-facilitadores");
  }

  // Prefill evaluador fields with the current user's info
  const { data: { user } } = await supabase.auth.getUser();
  let evaluadorNombre = "";
  let evaluadorCargo = "";
  if (user) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("nombre_apellido, cargo")
      .eq("id_auth", user.id)
      .single();
    if (usuario) {
      evaluadorNombre = usuario.nombre_apellido || "";
      evaluadorCargo = usuario.cargo || "";
    }
  }

  return (
    <EvaluacionFormClient
      facilitadorId={id}
      evaluadorNombre={evaluadorNombre}
      evaluadorCargo={evaluadorCargo}
    />
  );
}
