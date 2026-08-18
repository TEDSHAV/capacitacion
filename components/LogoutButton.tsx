"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearAllClientSessions } from "@/lib/offline/client-session";

interface LogoutButtonProps {
  /** Server action that clears the cookie and redirects */
  logoutAction: () => Promise<void>;
  /** Path to redirect to after logout (login page) */
  loginPath: string;
}

/**
 * Client-side logout button that clears the IndexedDB session mirror
 * before triggering the server-side logout action.
 *
 * This is needed because server actions can't access IndexedDB.
 */
export function LogoutButton({ logoutAction, loginPath }: LogoutButtonProps) {
  const handleClick = async (e: React.FormEvent) => {
    e.preventDefault();
    // Clear client-side session first
    try {
      await clearAllClientSessions();
    } catch {
      // Non-fatal — proceed with server logout anyway
    }
    // Then call the server action
    await logoutAction();
    // Redirect to login page
    window.location.href = loginPath;
  };

  return (
    <form onSubmit={handleClick}>
      <Button
        variant="outline"
        type="submit"
        size="sm"
        className="text-red-600 border-red-200 hover:bg-red-50"
      >
        <LogOut className="w-4 h-4 sm:mr-2" />
        <span className="hidden sm:inline">Cerrar Sesión</span>
      </Button>
    </form>
  );
}
