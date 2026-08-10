"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, memo } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@/types/dashboard";
import Image from "next/image";

const Navbar = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient(); // Create client once

  useEffect(() => {
    const checkAuth = async () => {
      // Use getSession() instead of getUser() to avoid hitting Supabase auth API
      // on every page render. getSession reads from cookies/storage only.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
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
    <nav className="bg-white shadow-md z-50 border-b border-gray-100">
      <div className="max-w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          {/* Left - Logo + company name */}
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity duration-200 flex-shrink-0"
            onClick={() => router.push("/dashboard")}
          >
            <Image
              src="/logo.png"
              alt="SHA de Venezuela"
              width={160}
              height={50}
              className="object-contain h-10 sm:h-12 w-auto"
              priority
            />
          </div>

          {/* Right - User menu */}
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    {(user?.user_metadata?.name || user?.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-700 truncate max-w-[140px]">
                    {user?.user_metadata?.name || user?.email}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 bg-red-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 shadow-sm text-xs sm:text-sm font-medium whitespace-nowrap"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:hidden">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span className="hidden sm:inline">Cerrar sesión</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleLoginClick}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors duration-200 font-medium whitespace-nowrap"
              >
                Iniciar sesión
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default memo(Navbar);
