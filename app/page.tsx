"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const INSTALL_PATH_KEY = "pwa_install_path";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // When embedded in the PRISMA shell iframe, don't redirect — the shell
    // manages the URL and loads specific pages directly. The shell-side
    // redirect (app/(shell)/capacitacion/page.tsx) ensures the root URL is
    // never loaded in an iframe. This guard is defense-in-depth to prevent
    // URLSync conflicts if the root URL is ever loaded in an iframe.
    if (window.self !== window.top) {
      return;
    }

    // When launched as an installed PWA (standalone display mode), redirect
    // to the exact page the user was on when they installed (captured by
    // InstallPrompt). Falls back to the dashboard for web visitors and for
    // installs where the path wasn't captured.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (standalone) {
      try {
        const storedPath = localStorage.getItem(INSTALL_PATH_KEY);
        if (storedPath && storedPath.startsWith("/portal")) {
          router.replace(storedPath);
          return;
        }
      } catch {}
    }

    router.replace("/dashboard/capacitacion");
  }, [router]);

  return null;
}
