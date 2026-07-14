"use client";
import { useSearchParams } from "next/navigation";
import {handleLogin} from "@/app/actions";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="max-w-md w-full space-y-8">
      <div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
          Iniciar sesión
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          ¿No tienes una cuenta?{" "}
          <a
            href="/signup"
            className="font-medium text-primary hover:text-primary/80"
          >
            Regístrate
          </a>
        </p>
      </div>
      <form action={handleLogin} className="mt-8 space-y-6">
        <div className="rounded-md shadow-sm -space-y-px">
          <div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-input placeholder-muted-foreground text-foreground rounded-t-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:z-10 sm:text-sm bg-background"
              placeholder="Correo electrónico"
            />
          </div>
          <div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-input placeholder-muted-foreground text-foreground rounded-b-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:z-10 sm:text-sm bg-background"
              placeholder="Contraseña"
            />
          </div>
        </div>

        {error && (
          <div className="text-destructive text-sm text-center">{decodeURIComponent(error)}</div>
        )}

        <div>
          <button
            type="submit"
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Iniciar sesión
          </button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Credenciales de demo: admin@company.com / admin123
        </div>
      </form>
    </div>
  );
}
