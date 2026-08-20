"use client";

import { useEffect, useState } from "react";
import { Download, X, Share, Plus, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Captures the `beforeinstallprompt` event and shows a custom "Install app"
 * button. On iOS (which doesn't support beforeinstallprompt), shows
 * instructions to use Share → Add to Home Screen.
 *
 * The banner auto-dismisses for 7 days if the user closes it.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Don't show if embedded in the PRISMA shell iframe — the shell handles its own UI
    if (window.self !== window.top) return;

    // Don't show if already installed (running in standalone mode)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // Check if user dismissed recently
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < DISMISS_DURATION) return;
    }

    // Detect iOS (Safari doesn't support beforeinstallprompt)
    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
    setIsIOS(ios && isSafari);

    // Check if we're in a secure context (HTTPS or localhost).
    // beforeinstallprompt only fires in secure contexts.
    const isSecureContext = window.isSecureContext;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // For iOS, show the banner after a short delay (no beforeinstallprompt event)
    if (ios && isSafari) {
      const timer = setTimeout(() => setShowBanner(true), 2000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    // For non-iOS, non-secure contexts (e.g. HTTP over LAN IP on mobile),
    // beforeinstallprompt will never fire. Show a hint after a delay so the
    // user knows the app is installable but needs HTTPS.
    if (!isSecureContext && !ios) {
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setShowBanner(false);
      setIsStandalone(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  if (isStandalone || !showBanner) return null;

  // iOS: no beforeinstallprompt, show instructions
  if (isIOS) {
    return (
      <>
        {/* Compact button */}
        <button
          onClick={() => setShowIOSInstructions(true)}
          className="fixed bottom-4 left-4 z-30 inline-flex items-center gap-2 bg-blue-700 text-white px-4 py-2.5 rounded-full shadow-lg hover:bg-blue-800 transition-colors text-sm font-medium"
        >
          <Smartphone className="w-4 h-4" />
          Instalar app
        </button>

        {/* Full instructions modal */}
        {showIOSInstructions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 text-lg">
                  Instalar en iPhone
                </h3>
                <button
                  onClick={() => {
                    setShowIOSInstructions(false);
                    handleDismiss();
                  }}
                  className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="space-y-4 text-sm text-gray-700">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 font-semibold text-blue-600 text-xs">
                    1
                  </div>
                  <p>
                    Toca el botón <strong>Compartir</strong> en la barra de
                    navegación de Safari:
                  </p>
                </div>
                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2">
                    <Share className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium">Compartir</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 font-semibold text-blue-600 text-xs">
                    2
                  </div>
                  <p>
                    Selecciona <strong>"Añadir a pantalla de inicio"</strong> en
                    el menú:
                  </p>
                </div>
                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2">
                    <Plus className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium">
                      Añadir a pantalla de inicio
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 font-semibold text-blue-600 text-xs">
                    3
                  </div>
                  <p>
                    Confirma y la app aparecerá en tu pantalla de inicio con
                    acceso directo y modo offline.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowIOSInstructions(false);
                  handleDismiss();
                }}
                className="w-full mt-6 px-4 py-2.5 bg-blue-700 text-white rounded-lg font-medium hover:bg-blue-800 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Android / Desktop: use beforeinstallprompt
  // If deferredPrompt is null (non-secure context, e.g. HTTP over LAN),
  // show a message explaining HTTPS is needed to install.
  const canInstall = !!deferredPrompt;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-4 sm:right-auto z-30 sm:max-w-sm">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-blue-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            Instalar aplicación
          </p>
          <p className="text-xs text-gray-500">
            {canInstall
              ? "Acceso rápido y uso sin conexión"
              : "Requiere conexión HTTPS para instalar"}
          </p>
        </div>
        {canInstall ? (
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 bg-blue-700 text-white text-xs font-medium rounded-lg hover:bg-blue-800 transition-colors shrink-0"
          >
            Instalar
          </button>
        ) : (
          <span className="text-xs text-gray-400 shrink-0">HTTPS</span>
        )}
        <button
          onClick={handleDismiss}
          className="p-1 rounded-md hover:bg-gray-100 transition-colors shrink-0"
          title="No ahora"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}
