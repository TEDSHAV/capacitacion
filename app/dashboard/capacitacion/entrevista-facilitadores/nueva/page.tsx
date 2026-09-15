import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { EntrevistaFormClient } from "../components/EntrevistaFormClient";

export const metadata = {
  title: "Nueva Entrevista | Capacitación",
  description: "Formato de entrevista para aspirantes a facilitadores",
};

export default async function NuevaEntrevistaPage() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }

  // Prefill interviewer name with current logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentUserNombre = "";
  if (user) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("nombre_apellido")
      .eq("id_auth", user.id)
      .single();

    if (usuario?.nombre_apellido) {
      currentUserNombre = usuario.nombre_apellido;
    }
  }

  return (
    <EntrevistaFormClient
      mode="nueva"
      currentUserNombre={currentUserNombre}
    />
  );
}
