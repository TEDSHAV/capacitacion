"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getClientSession } from "@/lib/offline/client-session";

const INSTALL_PATH_KEY = "pwa_install_path";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // When embedded in the PRISMA shell iframe, don't redirect — the shell
    // manages the URL and loads specific pages directly.
    if (window.self !== window.top) {
      return;
    }

    async function determineDestination() {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;

      // 1. Check if there's a stored portal path from recent activity
      try {
        const storedPath = localStorage.getItem(INSTALL_PATH_KEY);
        if (storedPath && storedPath.startsWith("/portal")) {
          router.replace(storedPath);
          return;
        }
      } catch {}

      // 2. Check offline/cached sessions
      try {
        const [facSession, cliSession] = await Promise.all([
          getClientSession("facilitador"),
          getClientSession("cliente"),
        ]);

        if (facSession) {
          router.replace("/portal/facilitador/dashboard");
          return;
        }
        if (cliSession) {
          router.replace("/portal/cliente/dashboard");
          return;
        }
      } catch {}

      // 3. For installed standalone PWAs, default to facilitador portal
      // (Admins access through PRISMA shell; field users use the standalone PWA)
      if (standalone) {
        router.replace("/portal/facilitador/login");
        return;
      }

      // 4. Default for direct web browser accesses (e.g. admin direct navigation)
      router.replace("/dashboard/capacitacion");
    }

    determineDestination();
  }, [router]);

  return null;
}

