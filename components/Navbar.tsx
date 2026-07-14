"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useCallback, memo } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@/types/dashboard";
import Image from "next/image";

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient(); // Create client once

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = useCallback(async () => {
    const { handleLogout: logout } = await import("@/app/actions/auth");
    await logout();
  }, []);

  const handleLoginClick = useCallback(() => {
    router.push("/login");
  }, []);

  return (
    <nav className="bg-white shadow-md z-50">
      <div className="max-w-full px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-2 sm:gap-4">
          {/* Left side - Spacer for symmetry */}
          <div className="flex items-center w-8 sm:w-12 flex-shrink-0">
            {/* Back button removed - now in sidebar */}
          </div>

          {/* Center - Logo */}
          <div className="flex-1 flex items-center justify-center min-w-0">
            <Image
              src="/logo.png"
              alt="Logo de la Empresa"
              width={120}
              height={120}
              className="object-contain cursor-pointer hover:opacity-80 transition-opacity duration-200 w-24 sm:w-32 h-auto"
              onClick={() => router.push("/dashboard")}
            />
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center gap-2 sm:gap-6 flex-shrink-0 flex-wrap sm:flex-nowrap justify-end">
            {user ? (
              <>
                <span className="hidden sm:block text-xs sm:text-sm text-gray-700 truncate max-w-[150px]">
                  Bienvenido, {user?.user_metadata?.name || user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white px-2 sm:px-4 py-2 rounded-md hover:bg-red-700 transition-colors duration-200 shadow-md text-xs sm:text-sm whitespace-nowrap"
                  style={{ backgroundColor: "#dc2626", color: "white" }}
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleLoginClick}
                  className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 px-2 sm:px-3 py-2 rounded-md hover:bg-blue-50 transition-colors duration-200 whitespace-nowrap"
                >
                  Iniciar sesión
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default memo(Navbar);
