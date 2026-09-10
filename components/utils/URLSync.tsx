"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function URLSync() {
  const pathname = usePathname();

  useEffect(() => {
    // Send the pathname to the parent window (the shell).
    // Only send the pathname — not query params — because:
    // 1. The shell only needs the pathname to update the browser URL
    // 2. Including ?shell=1 causes a comparison mismatch in ShellURLSync
    //    (window.location.pathname never includes query params)
    // 3. useSearchParams() can return a new reference on each render,
    //    causing this effect to re-fire repeatedly and creating an
    //    infinite replaceState loop between cached iframes
    if (window.parent !== window) {
      window.parent.postMessage({
        type: "IFRAME_NAVIGATION",
        path: pathname,
        appId: "capacitacion" // This should match the ID in the shell config
      }, "*");
    }
  }, [pathname]);

  return null;
}
