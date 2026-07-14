"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, User, Key, Loader2, AlertCircle } from "lucide-react";
import { loginCliente } from "@/app/actions/cliente-portal";

export default function ClienteLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Usuario y contraseña son requeridos");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await loginCliente(username, password);

    if (result.success) {
      router.push("/portal/cliente/dashboard");
    } else {
      setError(result.error || "Error al iniciar sesión");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-100 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-cyan-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Portal de Clientes
          </h1>
          <p className="text-gray-600 text-center mt-2">
            Consulta tus certificados y carnets emitidos
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
                placeholder="usuario.empresa"
                autoComplete="username"
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
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full py-6 text-lg"
            disabled={loading}
          >
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
            ¿No tienes acceso? <br />
            Contacta a tu ejecutivo de cuenta.
          </p>
        </div>
      </div>
    </div>
  );
}
