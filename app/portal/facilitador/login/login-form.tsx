"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, User, Loader2, AlertCircle, Mail, Phone } from "lucide-react";
import Image from "next/image";
import { loginFacilitator } from "@/app/actions/facilitador-portal";

export function FacilitadorLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ref guard prevents concurrent submissions even before React re-renders with disabled state
  const isSubmitting = useRef(false);

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
        router.push("/portal/facilitador/dashboard");
        // Don't reset loading — the component will unmount on navigation.
        // Resetting state after router.push can cause React warnings.
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
