import { redirect } from "next/navigation";
import { getClienteSession } from "@/app/actions/cliente-portal";
import { ClienteLoginForm } from "./login-form";

export default async function ClienteLoginPage() {
  // If already logged in, skip the login form and go straight to dashboard
  const session = await getClienteSession();
  if (session) {
    redirect("/portal/cliente/dashboard");
  }

  return <ClienteLoginForm />;
}
