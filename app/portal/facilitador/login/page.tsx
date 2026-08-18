import { redirect } from "next/navigation";
import { getFacilitatorSession } from "@/app/actions/facilitador-portal";
import { FacilitadorLoginForm } from "./login-form";

export default async function FacilitadorLoginPage() {
  // If already logged in, skip the login form and go straight to dashboard
  const session = await getFacilitatorSession();
  if (session) {
    redirect("/portal/facilitador/dashboard");
  }

  return <FacilitadorLoginForm />;
}
