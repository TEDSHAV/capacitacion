"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Link as LinkIcon,
  Copy,
  Check,
  ShieldCheck,
  Loader2,
  Trash2,
  ExternalLink,
  MessageCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Megaphone,
  User,
  Users,
  Share2,
} from "lucide-react";
import {
  crearPostulacionToken,
  getPostulacionTokens,
  revocarPostulacionToken,
} from "@/app/actions/entrevistas-facilitadores";
import type { FacilitadorPostulacionToken } from "@/types/entrevistas-facilitadores";
import { useToast } from "@/lib/ui/toast-context";

interface EntrevistaLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EntrevistaLinkModal({ isOpen, onClose }: EntrevistaLinkModalProps) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<"generar" | "historial">("generar");

  // Mode: individual vs campana
  const [linkTipo, setLinkTipo] = useState<"individual" | "campana">("individual");

  // Form State - Individual
  const [nombreCandidato, setNombreCandidato] = useState("");
  const [emailCandidato, setEmailCandidato] = useState("");

  // Form State - Campaña
  const [tituloCampana, setTituloCampana] = useState("");
  const [maxUsos, setMaxUsos] = useState<string>("");

  // Common State
  const [diasValidez, setDiasValidez] = useState<number>(7);
  const [notas, setNotas] = useState("");

  const [generating, setGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<FacilitadorPostulacionToken | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  // Historial State
  const [tokens, setTokens] = useState<FacilitadorPostulacionToken[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [historialFilter, setHistorialFilter] = useState<"todos" | "campanas" | "individuales">("todos");

  // Close with Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Load tokens when opening
  useEffect(() => {
    if (isOpen) {
      loadTokensList();
    }
  }, [isOpen]);

  // Adjust default validity when mode changes
  const handleTipoChange = (newTipo: "individual" | "campana") => {
    setLinkTipo(newTipo);
    setDiasValidez(newTipo === "campana" ? 30 : 7);
    setGeneratedUrl(null);
    setGeneratedToken(null);
  };

  const loadTokensList = async () => {
    setLoadingTokens(true);
    try {
      const res = await getPostulacionTokens();
      if (res.tokens) {
        setTokens(res.tokens);
      }
    } catch {
      // Ignored
    } finally {
      setLoadingTokens(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (linkTipo === "campana" && !tituloCampana.trim()) {
      addToast("Por favor ingresa un título o nombre para la campaña", "warning");
      return;
    }

    setGenerating(true);
    setGeneratedUrl(null);
    setGeneratedToken(null);
    setCopiedLink(false);
    setCopiedMsg(false);

    try {
      const parsedMaxUsos = maxUsos.trim() ? parseInt(maxUsos.trim(), 10) : null;

      const res = await crearPostulacionToken({
        tipo: linkTipo,
        titulo_campana: linkTipo === "campana" ? tituloCampana.trim() : undefined,
        max_usos: parsedMaxUsos && parsedMaxUsos > 0 ? parsedMaxUsos : null,
        nombre_candidato: linkTipo === "individual" ? nombreCandidato.trim() || undefined : undefined,
        email_candidato: linkTipo === "individual" ? emailCandidato.trim() || undefined : undefined,
        dias_validez: diasValidez,
        notas: notas.trim() || undefined,
      });

      if (!res.success || !res.url || !res.token) {
        addToast(res.error || "Error al generar enlace", "error");
        return;
      }

      setGeneratedUrl(res.url);
      setGeneratedToken(res.token);
      addToast(
        linkTipo === "campana"
          ? "¡Enlace de campaña creado exitosamente!"
          : "Enlace de postulación generado con éxito",
        "success"
      );
      loadTokensList();
    } catch {
      addToast("Error al conectar con el servidor", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyLink = (urlToCopy?: string) => {
    const targetUrl = urlToCopy || generatedUrl;
    if (!targetUrl) return;
    navigator.clipboard.writeText(targetUrl);
    setCopiedLink(true);
    addToast("Enlace copiado al portapapeles", "success");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyShareMessage = (tokenItem?: FacilitadorPostulacionToken) => {
    const t = tokenItem || generatedToken;
    const url = tokenItem
      ? `${window.location.origin}/postulacion/${tokenItem.token}`
      : generatedUrl;

    if (!url) return;

    let message = "";
    if (t?.tipo === "campana" || (!t && linkTipo === "campana")) {
      const campanaNom = t?.titulo_campana || tituloCampana.trim() || "Convocatoria Abierta";
      message = `📢 *CONVOCATORIA DE FACILITADORES E INSTRUCTORES*\n*SHA de Venezuela, C.A.* te invita a participar en nuestra convocatoria: *${campanaNom}*.\n\nBuscamos profesionales con experiencia en facilitación técnica y capacitación en Seguridad, Salud Ocupacional y Ambiente.\n\n👉 *Postúlate en línea aquí:*\n${url}\n\n¡Esperamos tu postulación!`;
    } else {
      const name = t?.nombre_candidato || nombreCandidato.trim();
      const greeting = name ? `Hola ${name},` : "Hola,";
      message = `${greeting} te compartimos el enlace oficial para completar tu postulación como Facilitador en SHA de Venezuela:\n\n${url}\n\nPor favor completa tus datos y recaudos disponibles. ¡Mucho éxito!`;
    }

    navigator.clipboard.writeText(message);
    setCopiedMsg(true);
    addToast("Mensaje copiado para WhatsApp / Redes", "success");
    setTimeout(() => setCopiedMsg(false), 2500);
  };

  const handleRevoke = async (id: number) => {
    if (!confirm("¿Deseas revocar/pausar este enlace? Ya no permitirá nuevas postulaciones.")) {
      return;
    }
    setRevokingId(id);
    try {
      const res = await revocarPostulacionToken(id);
      if (res.success) {
        addToast("Enlace revocado / cerrado", "success");
        setTokens((prev) =>
          prev.map((t) => (t.id === id ? { ...t, is_active: false } : t))
        );
      } else {
        addToast(res.error || "Error al revocar enlace", "error");
      }
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setRevokingId(null);
    }
  };

  const filteredTokens = tokens.filter((t) => {
    if (historialFilter === "campanas") return t.tipo === "campana";
    if (historialFilter === "individuales") return t.tipo !== "campana";
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-violet-900 to-indigo-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                <LinkIcon className="w-5 h-5 text-violet-200" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Enlaces de Postulación Web</h3>
                <p className="text-xs text-violet-200">
                  Crea enlaces individuales o campañas masivas de captación
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 px-6 pt-3 gap-6 bg-slate-50/50">
            <button
              type="button"
              onClick={() => setActiveTab("generar")}
              className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === "generar"
                  ? "border-violet-600 text-violet-700"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generar Nuevo Enlace
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("historial");
                loadTokensList();
              }}
              className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === "historial"
                  ? "border-violet-600 text-violet-700"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Historial y Métricas ({tokens.length})
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6">
            {activeTab === "generar" ? (
              <div className="space-y-5">
                {/* Link Type Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                    Tipo de Enlace a Crear
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleTipoChange("individual")}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                        linkTipo === "individual"
                          ? "bg-violet-50/70 border-violet-500 ring-2 ring-violet-500/20 shadow-xs"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg ${
                          linkTipo === "individual"
                            ? "bg-violet-600 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-slate-900">
                          Enlace Individual
                        </span>
                        <span className="block text-[11px] text-slate-500 mt-0.5 leading-tight">
                          Para 1 aspirante específico. Un solo uso (se invalida tras enviar).
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTipoChange("campana")}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                        linkTipo === "campana"
                          ? "bg-violet-50/70 border-violet-500 ring-2 ring-violet-500/20 shadow-xs"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg ${
                          linkTipo === "campana"
                            ? "bg-violet-600 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <Megaphone className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          Campaña / Convocatoria
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-violet-200 text-violet-800 font-extrabold uppercase">
                            Multi-uso
                          </span>
                        </span>
                        <span className="block text-[11px] text-slate-500 mt-0.5 leading-tight">
                          Reutilizable para publicaciones en LinkedIn, Instagram o WhatsApp grupal.
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleGenerate} className="space-y-4">
                  {/* Fields based on linkTipo */}
                  {linkTipo === "campana" ? (
                    <div className="space-y-4 bg-slate-50/60 p-4 rounded-xl border border-slate-200">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                          Título de la Campaña / Convocatoria *
                        </label>
                        <input
                          type="text"
                          required
                          value={tituloCampana}
                          onChange={(e) => setTituloCampana(e.target.value)}
                          placeholder="Ej. Convocatoria Facilitadores Q4 2026, Búsqueda Seguridad Industrial..."
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                            Vigencia de la Campaña
                          </label>
                          <select
                            value={diasValidez}
                            onChange={(e) => setDiasValidez(Number(e.target.value))}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                          >
                            <option value={7}>7 días (1 semana)</option>
                            <option value={15}>15 días (2 semanas)</option>
                            <option value={30}>30 días (1 mes - recomendado)</option>
                            <option value={60}>60 días (2 meses)</option>
                            <option value={90}>90 días (3 meses)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                            Límite de Postulaciones (Opcional)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={maxUsos}
                            onChange={(e) => setMaxUsos(e.target.value)}
                            placeholder="Ilimitado (dejar vacío)"
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                          Descripción o Canales de Difusión (Opcional)
                        </label>
                        <input
                          type="text"
                          value={notas}
                          onChange={(e) => setNotas(e.target.value)}
                          placeholder="Ej. Difundida en LinkedIn y grupos de WhatsApp de ingenieros..."
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 bg-slate-50/60 p-4 rounded-xl border border-slate-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                            Nombre del Candidato (Opcional)
                          </label>
                          <input
                            type="text"
                            value={nombreCandidato}
                            onChange={(e) => setNombreCandidato(e.target.value)}
                            placeholder="Ej. Lic. Carlos Mendoza"
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                            Correo del Candidato (Opcional)
                          </label>
                          <input
                            type="email"
                            value={emailCandidato}
                            onChange={(e) => setEmailCandidato(e.target.value)}
                            placeholder="candidato@email.com"
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                            Vigencia del Enlace
                          </label>
                          <select
                            value={diasValidez}
                            onChange={(e) => setDiasValidez(Number(e.target.value))}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                          >
                            <option value={3}>3 días</option>
                            <option value={7}>7 días (1 semana - recomendado)</option>
                            <option value={15}>15 días (2 semanas)</option>
                            <option value={30}>30 días (1 mes)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                            Notas Internas (Opcional)
                          </label>
                          <input
                            type="text"
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                            placeholder="Ej. Referido por Ing. Ramírez..."
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-1 flex justify-end">
                    <button
                      type="submit"
                      disabled={generating}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generando enlace...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          {linkTipo === "campana"
                            ? "Crear Enlace de Campaña"
                            : "Generar Enlace Individual"}
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Generated Link Display */}
                {generatedUrl && (
                  <div className="p-4 bg-violet-50/70 border border-violet-200 rounded-xl space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-violet-900 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-violet-600" />
                        {linkTipo === "campana"
                          ? `Campaña Lista: ${tituloCampana}`
                          : "Enlace generado listo para compartir"}
                      </span>
                      <span className="text-[11px] font-semibold text-violet-600">
                        Válido por {diasValidez} días
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={generatedUrl}
                        className="flex-1 text-xs px-3 py-2 bg-white border border-violet-300 rounded-lg text-slate-800 font-mono select-all focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyLink()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 shadow-sm"
                      >
                        {copiedLink ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copiar
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleCopyShareMessage()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        {copiedMsg
                          ? "¡Mensaje Copiado!"
                          : linkTipo === "campana"
                          ? "Copiar texto para Convocatoria / Redes"
                          : "Copiar texto para WhatsApp"}
                      </button>

                      <a
                        href={generatedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Abrir formulario
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Historial Tab */
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setHistorialFilter("todos")}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                        historialFilter === "todos"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Todos ({tokens.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistorialFilter("campanas")}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                        historialFilter === "campanas"
                          ? "bg-white text-violet-800 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Megaphone className="w-3 h-3 text-violet-600" />
                      Campañas ({tokens.filter((t) => t.tipo === "campana").length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistorialFilter("individuales")}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                        historialFilter === "individuales"
                          ? "bg-white text-blue-800 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <User className="w-3 h-3 text-blue-600" />
                      Individuales ({tokens.filter((t) => t.tipo !== "campana").length})
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={loadTokensList}
                    disabled={loadingTokens}
                    className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingTokens ? "animate-spin" : ""}`} />
                    Actualizar
                  </button>
                </div>

                {loadingTokens ? (
                  <div className="py-12 text-center">
                    <Loader2 className="w-6 h-6 text-violet-600 animate-spin mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Cargando historial...</p>
                  </div>
                ) : filteredTokens.length === 0 ? (
                  <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <LinkIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600">
                      No hay enlaces registrados con este filtro
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Usa la pestaña &quot;Generar Nuevo Enlace&quot; para crear uno.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-88 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
                    {filteredTokens.map((t) => {
                      const isExpired = new Date(t.expires_at) < new Date();
                      const isCampana = t.tipo === "campana";
                      const isUsed = !isCampana && Boolean(t.used_at);
                      const isRevoked = !t.is_active && !isUsed;

                      return (
                        <div
                          key={t.id}
                          className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {/* Tipo Badge */}
                              {isCampana ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-800 border border-violet-200 shrink-0">
                                  <Megaphone className="w-2.5 h-2.5 text-violet-600" />
                                  Campaña
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                                  <User className="w-2.5 h-2.5 text-blue-600" />
                                  Individual
                                </span>
                              )}

                              <span className="text-xs font-bold text-slate-900 truncate">
                                {isCampana
                                  ? t.titulo_campana || "Convocatoria Abierta"
                                  : t.nombre_candidato || "Aspirante sin asignar"}
                              </span>

                              {/* Status Badge */}
                              {isUsed ? (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                  Completado
                                </span>
                              ) : isRevoked ? (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  Cerrado / Revocado
                                </span>
                              ) : isExpired ? (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  Expirado
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  Activo
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
                              <span>Creado: {t.created_at.slice(0, 10)}</span>
                              <span>•</span>
                              <span>Expira: {t.expires_at.slice(0, 10)}</span>
                              {isCampana && (
                                <>
                                  <span>•</span>
                                  <span className="font-semibold text-violet-700 inline-flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {t.total_postulaciones || 0} postulaciones recibidas
                                  </span>
                                </>
                              )}
                              {t.usuarios?.nombre_completo && (
                                <>
                                  <span>•</span>
                                  <span>Por: {t.usuarios.nombre_completo}</span>
                                </>
                              )}
                            </div>

                            {t.notas && (
                              <p className="text-[10px] text-slate-400 italic truncate max-w-md">
                                {t.notas}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {t.is_active && !isUsed && !isExpired && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const fullUrl = `${window.location.origin}/postulacion/${t.token}`;
                                    handleCopyLink(fullUrl);
                                  }}
                                  title="Copiar enlace"
                                  className="p-1.5 text-slate-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleCopyShareMessage(t)}
                                  title="Copiar texto para compartir"
                                  className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                >
                                  <Share2 className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  disabled={revokingId === t.id}
                                  onClick={() => handleRevoke(t.id)}
                                  title={isCampana ? "Cerrar / Pausar campaña" : "Revocar enlace"}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  {revokingId === t.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              </>
                            )}

                            {t.entrevista_id && (
                              <a
                                href={`/dashboard/capacitacion/entrevista-facilitadores/${t.entrevista_id}`}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
                              >
                                Ver Entrevista
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
