"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, User, Loader2, AlertCircle, Mail, Phone, WifiOff, ArrowRight } from "lucide-react";
import Image from "next/image";
import { loginFacilitator } from "@/app/actions/facilitador-portal";
import { getClientSession, saveClientSession } from "@/lib/offline/client-session";

export function FacilitadorLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [offlineSession, setOfflineSession] = useState<{ nombre: string } | null>(null);
  // Ref guard prevents concurrent submissions even before React re-renders with disabled state
  const isSubmitting = useRef(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    // Check for a client-side session (for offline access banner)
    getClientSession("facilitador").then((s) => {
      if (s) setOfflineSession({ nombre: s.nombre });
    });
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting.current) return;
    if (!username || !password) {
      setError("Usuario y contraseña son requeridos");
      return;
    }

    isSubmitting.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await loginFacilitator(username, password);

      if (result.success) {
        // Save client-side session mirror for offline access
        // We don't have the facilitador_id here, but we can use 0 as placeholder
        // The real auth is the httpOnly cookie — this is just a hint
        saveClientSession("facilitador", 0, username).catch(() => {});
        router.push("/portal/facilitador/dashboard");
      } else {
        setError(result.error || "Error al iniciar sesión");
        isSubmitting.current = false;
        setLoading(false);
      }
    } catch (err) {
      setError("Error inesperado al iniciar sesión");
      isSubmitting.current = false;
      setLoading(false);
    }
  };

  // Offline + has a previous session → show cached dashboard access
  if (isOffline && offlineSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center">
          <div className="flex flex-col items-center mb-6">
            <Image
              src="/logo.png"
              alt="SHA de Venezuela"
              width={96}
              height={96}
              className="w-24 h-24 object-contain mb-4"
            />
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-3">
              <WifiOff className="w-7 h-7 text-amber-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Sin conexión</h1>
          </div>
          <p className="text-gray-600 mb-1">
            Hola, <strong>{offlineSession.nombre}</strong>.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            No se puede iniciar sesión sin conexión, pero puedes acceder a tu
            panel con los últimos datos guardados.
          </p>
          <Button
            onClick={() => router.push("/portal/facilitador/dashboard")}
            className="w-full py-3"
          >
            Abrir mi panel
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <p className="text-xs text-gray-400 mt-4">
            Algunas funciones no estarán disponibles hasta que vuelvas a tener conexión.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-100 p-8">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/logo.png"
            alt="SHA de Venezuela"
            width={128}
            height={128}
            className="w-32 h-32 object-contain mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900">Portal de Facilitadores</h1>
          <p className="text-gray-600 text-center mt-2">
            Ingresa tus credenciales para gestionar tus servicios
          </p>
        </div>

        {isOffline && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-800 text-sm">
            <WifiOff className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Sin conexión</p>
              <p className="text-xs text-amber-700 mt-0.5">
                El inicio de sesión requiere conexión a internet. Conéctate para continuar.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Usuario</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10"
                placeholder="nombre.apellido"
                autoComplete="username"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Key className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" className="w-full py-6 text-lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              "Iniciar Sesión"
            )}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500">
            ¿Tienes problemas para ingresar? <br />
            Contacta al administrador del sistema.
          </p>
          <div className="mt-3 flex flex-col items-center gap-2 text-sm">
            <a href="mailto:capacitacion@shadevenezuela.com.ve" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline">
              <Mail className="w-4 h-4" />
              capacitacion@shadevenezuela.com.ve
            </a>
            <a href="tel:04120449046" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline">
              <Phone className="w-4 h-4" />
              0412-044-9046
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
