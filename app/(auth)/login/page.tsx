import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import LoginForm from "@/components/LoginForm";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

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
      <Suspense
        fallback={
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-100 p-8 flex items-center justify-center min-h-[400px]">
            <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
