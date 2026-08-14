import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getFeriadosAdmin } from "@/app/actions/feriados";
import FeriadosClient from "./FeriadosClient";

export default async function FeriadosPage() {
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    feriadosResult,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getFeriadosAdmin(),
  ]);

  if (!user) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }

  return (
    <FeriadosClient
      initialFeriados={feriadosResult.data ?? []}
      initialError={feriadosResult.error}
    />
  );
}
