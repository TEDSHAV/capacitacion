"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const INSTALL_PATH_KEY = "pwa_install_path";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
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
