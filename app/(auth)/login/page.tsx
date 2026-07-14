import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  // Use getSession() (cookie-only, no API call) to avoid hitting auth rate limits.
  // The proxy/middleware will validate properly when navigating to /dashboard.
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoginForm />
    </div>
  );
}
