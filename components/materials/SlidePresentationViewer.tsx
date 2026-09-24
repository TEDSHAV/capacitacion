"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Presentation,
  Grid,
  Zap,
  Download,
  Info,
} from "lucide-react";

interface SlidePresentationViewerProps {
  url: string;
  title: string;
  courseName: string;
  companyName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function SlidePresentationViewer({
  url,
  title,
  courseName,
  companyName,
  isOpen,
  onClose,
}: SlidePresentationViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isOpen && isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, isTimerRunning]);

  // Keyboard navigation & Fullscreen handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          onClose();
        }
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Auto-hide controls on mouse idle
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3500);
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn("Fullscreen toggle error:", err);
    }
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col select-none overflow-hidden"
    >
      {/* Top Overlay HUD Bar (Fades out when inactive) */}
      <div
        className={`absolute top-0 inset-x-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-slate-950/90 via-slate-950/60 to-transparent transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600/30 border border-blue-400/30 text-blue-300">
            <Presentation className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/20">
                Modo Proyector Offline
              </span>
              <span className="text-xs text-slate-400 font-medium">{companyName}</span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight truncate max-w-md">
              {courseName} — {title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Presenter Timer */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs font-mono">
            <span className="text-emerald-400 font-bold">⏱️ {formatTimer(timerSeconds)}</span>
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="p-1 text-slate-400 hover:text-white rounded"
              title={isTimerRunning ? "Pausar cronómetro" : "Iniciar cronómetro"}
            >
              {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setTimerSeconds(0)}
              className="p-1 text-slate-400 hover:text-white rounded"
              title="Reiniciar cronómetro"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-colors"
            title="Pantalla completa (F)"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/80 border border-rose-800/50 text-rose-300 hover:text-white transition-colors"
            title="Salir de presentación (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Presentation Viewport */}
      <div className="flex-1 w-full h-full flex items-center justify-center bg-slate-950 relative">
        <iframe
          src={`${url}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
          className="w-full h-full border-0 bg-slate-950"
          title="Visor de Presentación PRISMA"
          allow="fullscreen"
        />
      </div>

      {/* Bottom Floating Presenter Toolbar */}
      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-2xl transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Proyectando desde PRISMA
        </span>

        <div className="h-4 w-px bg-slate-700 mx-1" />

        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>Usa</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-mono">
            F
          </kbd>
          <span>pantalla completa</span>
          <span>•</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-mono">
            ESC
          </kbd>
          <span>salir</span>
        </div>

        <div className="h-4 w-px bg-slate-700 mx-1" />

        <button
          onClick={onClose}
          className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors"
        >
          Finalizar
        </button>
      </div>
    </div>
  );
}
