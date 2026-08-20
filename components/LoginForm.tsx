"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { handleLogin } from "@/app/actions";
import { useEffect, useState } from "react";
import { Loader2, AlertCircle, Mail } from "lucide-react";
import Image from "next/image";

const LoginForm = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get("error");
  const [isClearing, setIsClearing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-100 p-8">
      <div className="flex flex-col items-center mb-8">
        <Image
          src="/logo.png"
          alt="SHA de Venezuela"
          width={128}
          height={128}
          className="w-32 h-32 object-contain mb-4"
        />
        <h1 className="text-2xl font-bold text-gray-900">Dashboard de Administración</h1>
        <p className="text-gray-600 text-center mt-2">
          Ingresa tus credenciales para gestionar el sistema de capacitación
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <span>
              {error.includes("rate limit")
                ? "Demasiados intentos de inicio de sesión. Por favor espera 1-2 minutos e intenta de nuevo."
                : error === "Invalid credentials"
                  ? "Email o contraseña incorrectos"
                  : "Error al iniciar sesión: " + error}
            </span>
            {error.includes("rate limit") && (
              <div className="mt-1 text-xs text-red-600">
                Estamos limpiando los datos de sesión. Intenta de nuevo en unos
                momentos.
              </div>
            )}
          </div>
        </div>
      )}

      <form
        className="space-y-6"
        action={handleLogin}
        onSubmit={() => setIsSubmitting(true)}
      >
        <input type="hidden" name="remember" defaultValue="true" />

        <div className="space-y-2">
          <label htmlFor="email-address" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email-address"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={isClearing}
            className="appearance-none block w-full px-4 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50 transition-colors"
            placeholder="correo@ejemplo.com"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={isClearing}
            className="appearance-none block w-full px-4 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50 transition-colors"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isClearing || isSubmitting}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all active:scale-[0.98]"
        >
          {isClearing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Limpiando sesión...
            </>
          ) : isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Iniciando sesión...
            </>
          ) : (
            "Iniciar Sesión"
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-100 text-center">
        <p className="text-sm text-gray-500">
          ¿No tienes una cuenta? <br />
          Contacta al administrador del sistema.
        </p>
        <div className="mt-3 flex flex-col items-center gap-2 text-sm">
          <a href="mailto:capacitacion@shadevenezuela.com.ve" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline">
            <Mail className="w-4 h-4" />
            capacitacion@shadevenezuela.com.ve
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
