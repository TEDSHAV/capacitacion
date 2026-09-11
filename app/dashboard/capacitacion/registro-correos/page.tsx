import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import RegistroCorreosClient from "./RegistroCorreosClient";

export default async function RegistroCorreosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }

  return <RegistroCorreosClient />;
}
