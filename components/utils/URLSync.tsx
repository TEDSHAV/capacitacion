"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function URLSync() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Construct the full internal path
    const query = searchParams.toString();
    const fullPath = query ? `${pathname}?${query}` : pathname;

    // Send the path to the parent window (the shell)
    if (window.parent !== window) {
      window.parent.postMessage({
        type: "IFRAME_NAVIGATION",
        path: fullPath,
        appId: "capacitacion" // This should match the ID in the shell config
      }, "*");
    }
  }, [pathname, searchParams]);

  return null;
}
