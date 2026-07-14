"use client";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { handleLogin } from "@/app/actions";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

const LoginForm = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get("error");
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    // Clear stale session data on component mount to prevent rate limit errors
    const clearStaleSession = async () => {
      try {
        setIsClearing(true);
        // Clear localStorage of any stale Supabase session data
        const keys = Object.keys(localStorage);
        keys.forEach((key) => {
          if (key.includes("supabase") || key.includes("auth")) {
            localStorage.removeItem(key);
          }
        });

        // Clear sessionStorage as well
        const sessionKeys = Object.keys(sessionStorage);
        sessionKeys.forEach((key) => {
          if (key.includes("supabase") || key.includes("auth")) {
            sessionStorage.removeItem(key);
          }
        });

        setIsClearing(false);
      } catch (e) {
        console.error("Error clearing session:", e);
        setIsClearing(false);
      }
    };

    // Only clear if we have a rate limit error
    if (error && error.includes("rate limit")) {
      clearStaleSession();
    }
  }, [error]);

  return (
    <div className="max-w-md w-full space-y-8">
      <div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Iniciar sesión
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Contacta al administrador para crear una cuenta.
        </p>
      </div>
      <form className="mt-8 space-y-6" action={handleLogin}>
        <input type="hidden" name="remember" defaultValue="true" />
        <div className="rounded-md shadow-sm -space-y-px">
          <div>
            <label htmlFor="email-address" className="sr-only">
              Email
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={isClearing}
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:opacity-50"
              placeholder="Email"
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={isClearing}
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:opacity-50"
              placeholder="Contraseña"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-red-800 text-sm">
              {error.includes("rate limit")
                ? "Demasiados intentos de inicio de sesión. Por favor espera 1-2 minutos e intenta de nuevo."
                : error === "Invalid credentials"
                  ? "Email o contraseña incorrectos"
                  : "Error al iniciar sesión: " + error}
            </div>
            {error.includes("rate limit") && (
              <div className="mt-2 text-xs text-red-700">
                Estamos limpiando los datos de sesión. Intenta de nuevo en unos
                momentos.
              </div>
            )}
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={isClearing}
            className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all active:scale-[0.98]"
          >
            {isClearing ? "Limpiando sesión..." : "Iniciar sesión"}
          </button>
        </div>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
            <span className="px-3 bg-gray-50 text-gray-400">O continúe como externo</span>
          </div>
        </div>

        <div>
          <Link
            href="/consultar"
            className="group relative w-full flex justify-center items-center py-2.5 px-4 border-2 border-blue-600 text-sm font-bold rounded-lg text-blue-700 bg-white hover:bg-blue-50 focus:outline-none transition-all duration-300 shadow-sm"
          >
            <ShieldCheck className="w-4 h-4 mr-2 text-blue-600 group-hover:scale-110 transition-transform" />
            Verificar Certificado
          </Link>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;
