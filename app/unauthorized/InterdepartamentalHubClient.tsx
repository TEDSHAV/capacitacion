"use client";

import React, { useState, useTransition, useMemo } from "react";
import {
  FileUp,
  GraduationCap,
  Search,
  UploadCloud,
  FileText,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  User,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  Download,
  Eye,
  X,
  RefreshCw,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/lib/ui/toast-context";
import { FacilitadorDetailModal } from "./components/FacilitadorDetailModal";
import { FichaTecnicaViewerModal } from "./components/FichaTecnicaViewerModal";
import {
  uploadPurchaseOrderDocument,
  getAssignedFacilitatorForOsi,
  type InterdepartamentalUser,
  type InterdepartamentalOsi,
  type InterdepartamentalFacilitador,
  type PurchaseOrderRecord,
} from "@/app/actions/interdepartamental";

interface InterdepartamentalHubClientProps {
  user: InterdepartamentalUser | null;
  initialOsis: InterdepartamentalOsi[];
  initialFacilitators: InterdepartamentalFacilitador[];
  initialRecentPOs: PurchaseOrderRecord[];
}

export function InterdepartamentalHubClient({
  user,
  initialOsis,
  initialFacilitators,
  initialRecentPOs,
}: InterdepartamentalHubClientProps) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<"orden_compra" | "fichas_tecnicas">(
    "orden_compra",
  );

  // --- Purchase Order Form State ---
  const [selectedOsi, setSelectedOsi] = useState<InterdepartamentalOsi | null>(null);
  const [osiSearchTerm, setOsiSearchTerm] = useState("");
  const [isOsiDropdownOpen, setIsOsiDropdownOpen] = useState(false);
  const [assignedFacilitator, setAssignedFacilitator] = useState<{
    id: number;
    nombre_apellido: string;
    cedula: string | null;
    titulo_profesional: string | null;
  } | null>(null);
  const [manualFacilitatorId, setManualFacilitatorId] = useState<number | "">("");
  const [poNumber, setPoNumber] = useState("");
  const [fechaEmision, setFechaEmision] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [observaciones, setObservaciones] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, startUploadTransition] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [recentPOs, setRecentPOs] = useState<PurchaseOrderRecord[]>(initialRecentPOs);
  const [lastUploadedPO, setLastUploadedPO] = useState<PurchaseOrderRecord | null>(null);

  // --- Facilitator Search State ---
  const [facilitatorSearch, setFacilitatorSearch] = useState("");
  const [selectedFacilitatorModal, setSelectedFacilitatorModal] =
    useState<InterdepartamentalFacilitador | null>(null);
  const [viewingFichaFacilitador, setViewingFichaFacilitador] =
    useState<InterdepartamentalFacilitador | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Filter OSIs based on search query
  const filteredOsis = useMemo(() => {
    if (!osiSearchTerm.trim()) return initialOsis.slice(0, 15);
    const q = osiSearchTerm.toLowerCase();
    return initialOsis.filter(
      (o) =>
        (o.nro_osi && o.nro_osi.toLowerCase().includes(q)) ||
        (o.nombre_empresa && o.nombre_empresa.toLowerCase().includes(q)) ||
        (o.servicio && o.servicio.toLowerCase().includes(q)),
    );
  }, [initialOsis, osiSearchTerm]);

  // Filter Facilitators based on search query
  const filteredFacilitators = useMemo(() => {
    if (!facilitatorSearch.trim()) return initialFacilitators;
    const q = facilitatorSearch.toLowerCase();
    return initialFacilitators.filter(
      (f) =>
        f.nombre_apellido.toLowerCase().includes(q) ||
        (f.cedula && f.cedula.toLowerCase().includes(q)) ||
        (f.titulo_profesional && f.titulo_profesional.toLowerCase().includes(q)) ||
        (Array.isArray(f.competencias_habilidades) &&
          f.competencias_habilidades.some((s) => s.toLowerCase().includes(q))) ||
        (typeof f.competencias_habilidades === "string" &&
          f.competencias_habilidades.toLowerCase().includes(q)),
    );
  }, [initialFacilitators, facilitatorSearch]);

  // Handle OSI selection & auto-resolve assigned facilitator
  const handleSelectOsi = async (osi: InterdepartamentalOsi) => {
    setSelectedOsi(osi);
    setIsOsiDropdownOpen(false);
    setOsiSearchTerm("");
    setUploadError(null);

    // Fetch assigned facilitator for this OSI
    try {
      const assigned = await getAssignedFacilitatorForOsi(osi.id_osi);
      if (assigned) {
        setAssignedFacilitator(assigned);
        setManualFacilitatorId(assigned.id);
      } else {
        setAssignedFacilitator(null);
        setManualFacilitatorId("");
      }
    } catch {
      setAssignedFacilitator(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];
    if (!validTypes.includes(file.type)) {
      setUploadError("Formato no admitido. Selecciona un archivo PDF, JPG o PNG.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setUploadError("El archivo supera el límite de 25 MB.");
      return;
    }
    setUploadError(null);
    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  // Submit Purchase Order
  const handleUploadPO = () => {
    if (!selectedOsi) {
      setUploadError("Por favor selecciona una OSI para vincular la orden de compra.");
      return;
    }
    if (!poNumber.trim()) {
      setUploadError("Por favor indica el número o identificador de la orden de compra.");
      return;
    }
    if (!selectedFile) {
      setUploadError("Debes adjuntar el documento de la orden de compra (PDF o imagen).");
      return;
    }

    setUploadError(null);

    startUploadTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("osiId", String(selectedOsi.id_osi));
        formData.append("nroOsi", selectedOsi.nro_osi || String(selectedOsi.id_osi));
        if (manualFacilitatorId) {
          formData.append("facilitadorId", String(manualFacilitatorId));
        }
        formData.append("poNumber", poNumber.trim());
        formData.append("fechaEmision", fechaEmision);
        formData.append("observaciones", observaciones.trim());

        const res = await uploadPurchaseOrderDocument(formData);

        if (res.success && res.record) {
          addToast("Orden de compra cargada exitosamente.", "success");
          setLastUploadedPO(res.record);
          setRecentPOs((prev) => [
            {
              ...res.record!,
              empresa_nombre: selectedOsi.nombre_empresa || "",
              nro_osi: selectedOsi.nro_osi || String(selectedOsi.id_osi),
            },
            ...prev,
          ]);

          // Reset form fields
          setSelectedFile(null);
          setPoNumber("");
          setObservaciones("");
        } else {
          setUploadError(res.error || "Ocurrió un error al cargar la orden de compra.");
          addToast(res.error || "Error al procesar la orden de compra", "error");
        }
      } catch (err) {
        const msg = (err as Error).message || "Error inesperado al subir la orden de compra.";
        setUploadError(msg);
        addToast(msg, "error");
      }
    });
  };

  const handleDownloadFicha = (fId: number) => {
    setDownloadingId(fId);
    setTimeout(() => {
      setDownloadingId(null);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-100 pb-16">
      {/* ─── TOP NAVBAR ─── */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0c3f69] via-blue-700 to-indigo-800 flex items-center justify-center text-white shadow-md shadow-blue-900/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                  SHA de Venezuela
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                  Capacitación
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Punto de Enlace
              </p>
            </div>
          </div>

          {/* User profile & Return button */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px]">
                  {user.initials}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                    {user.name}
                  </div>
                  <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                    {user.departamentoNombre}
                  </div>
                </div>
              </div>
            ) : null}

            <a
              href="https://prisma.shadevenezuela.com.ve"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors"
              title="Volver a la plataforma principal PRISMA"
            >
              <span>Volver a PRISMA</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTAINER ─── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#0c3f69] via-indigo-900 to-purple-950 text-white shadow-xl">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 -mb-16 w-60 h-60 rounded-full bg-purple-500/15 blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-3">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              ¿Qué gestión deseas realizar hoy?
            </h1>

            <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed">
              El panel administrativo general está reservado para el equipo operativo de
              Capacitación. No obstante, desde este espacio interactivo puedes consignar
              órdenes de compra oficiales vinculadas a servicios o consultar y descargar
              las fichas técnicas de nuestros facilitadores certificados.
            </p>
          </div>
        </div>

        {/* ─── THE 2 ACTION CARDS (CHOICE SELECTOR) ─── */}
        <section aria-label="Acciones Disponibles">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Subir Orden de Compra */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setActiveTab("orden_compra")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveTab("orden_compra");
                }
              }}
              className={`group relative p-6 sm:p-7 rounded-3xl cursor-pointer transition-all duration-300 border text-left ${
                activeTab === "orden_compra"
                  ? "bg-white dark:bg-slate-900 border-blue-500 dark:border-blue-400 shadow-xl shadow-blue-500/10 ring-2 ring-blue-500/20"
                  : "bg-white/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700/60 hover:shadow-lg"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                      activeTab === "orden_compra"
                        ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-600/30"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    }`}
                  >
                    <FileUp className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold tracking-wider uppercase text-blue-600 dark:text-blue-400">
                      Administración & Compras
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Cargar Orden de Compra (OC)
                    </h2>
                  </div>
                </div>

                {activeTab === "orden_compra" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Activo
                  </span>
                )}
              </div>

              <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Vincula y adjunta la orden de compra emitida a una Orden de Servicio
                (OSI) y a su facilitador asignado, notificando directamente al equipo de
                Capacitación.
              </p>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-blue-500" />
                    {initialOsis.length} OSIs de Capacitación
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Soporte PDF e imagen
                  </span>
                </div>

                <span className="font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  Gestionar OC <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Card 2: Descargar Ficha Técnica */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setActiveTab("fichas_tecnicas")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveTab("fichas_tecnicas");
                }
              }}
              className={`group relative p-6 sm:p-7 rounded-3xl cursor-pointer transition-all duration-300 border text-left ${
                activeTab === "fichas_tecnicas"
                  ? "bg-white dark:bg-slate-900 border-purple-500 dark:border-purple-400 shadow-xl shadow-purple-500/10 ring-2 ring-purple-500/20"
                  : "bg-white/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700/60 hover:shadow-lg"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                      activeTab === "fichas_tecnicas"
                        ? "bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-md shadow-purple-600/30"
                        : "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                    }`}
                  >
                    <GraduationCap className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold tracking-wider uppercase text-purple-600 dark:text-purple-400">
                      Pool de Instructores SHA
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      Fichas Técnicas de Facilitadores
                    </h2>
                  </div>
                </div>

                {activeTab === "fichas_tecnicas" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    Activo
                  </span>
                )}
              </div>

              <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Consulta las credenciales , trayectoria profesional y descarga en PDF la Ficha Técnica de cualquier facilitador
              </p>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-purple-500" />
                    {initialFacilitators.length} facilitadores activos
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-emerald-500" />
                    Descarga
                  </span>
                </div>

                <span className="font-semibold text-purple-600 dark:text-purple-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  Explorar Fichas <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── WORKSPACE CONTENT ─── */}
        {activeTab === "orden_compra" ? (
          <section
            aria-label="Carga de Orden de Compra"
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-8 animate-in fade-in duration-200"
          >
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Consignar Orden de Compra para Servicio de Capacitación
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Selecciona la OSI del servicio impartido o por impartir, verifica el
                  facilitador y adjunta el comprobante emitido por Administración.
                </p>
              </div>

              {selectedOsi && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOsi(null);
                    setAssignedFacilitator(null);
                    setManualFacilitatorId("");
                  }}
                  className="self-start sm:self-auto text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Cambiar OSI
                </button>
              )}
            </div>

            {/* Success Message Banner */}
            {lastUploadedPO && (
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 flex items-start justify-between gap-4 animate-in slide-in-from-top-2">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                      ¡Orden de compra cargada con éxito!
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      Se registró el documento{" "}
                      <span className="font-semibold">{lastUploadedPO.file_name}</span>{" "}
                      para la OSI{" "}
                      <span className="font-semibold">{lastUploadedPO.nro_osi}</span> y se
                      notificó al equipo de Capacitación.
                    </p>
                    {lastUploadedPO.public_url && (
                      <a
                        href={lastUploadedPO.public_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 underline pt-1"
                      >
                        <Download className="w-3.5 h-3.5" /> Ver archivo consignado
                      </a>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLastUploadedPO(null)}
                  className="text-emerald-500 hover:text-emerald-800 dark:hover:text-emerald-200 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Error Message */}
            {uploadError && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Atención:</span> {uploadError}
                </div>
              </div>
            )}

            {/* Form Steps */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: OSI & Facilitator Selection */}
              <div className="lg:col-span-6 space-y-6">
                {/* Step 1: OSI Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    1. Seleccionar OSI del Servicio <span className="text-rose-500">*</span>
                  </label>

                  {selectedOsi ? (
                    /* Selected OSI Card */
                    <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
                          OSI #{selectedOsi.nro_osi || selectedOsi.id_osi}
                        </span>
                        {selectedOsi.fecha_inicio_real && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {selectedOsi.fecha_inicio_real}
                          </span>
                        )}
                      </div>

                      <div className="font-semibold text-slate-900 dark:text-white text-sm">
                        {selectedOsi.nombre_empresa || "Empresa no especificada"}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        {selectedOsi.servicio || "Servicio de capacitación"}
                      </div>
                    </div>
                  ) : (
                    /* Searchable Select Input */
                    <div className="relative">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={osiSearchTerm}
                          onChange={(e) => {
                            setOsiSearchTerm(e.target.value);
                            setIsOsiDropdownOpen(true);
                          }}
                          onFocus={() => setIsOsiDropdownOpen(true)}
                          placeholder="Buscar por nro. OSI, cliente o curso..."
                          className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                        />
                        <button
                          type="button"
                          onClick={() => setIsOsiDropdownOpen(!isOsiDropdownOpen)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Dropdown Results */}
                      {isOsiDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={() => setIsOsiDropdownOpen(false)}
                          />
                          <div className="absolute left-0 right-0 top-full mt-1.5 max-h-64 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-30 divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredOsis.length > 0 ? (
                              filteredOsis.map((o) => (
                                <button
                                  key={o.id_osi}
                                  type="button"
                                  onClick={() => handleSelectOsi(o)}
                                  className="w-full text-left p-3 hover:bg-blue-50/70 dark:hover:bg-slate-800/80 transition-colors flex items-start justify-between gap-3 text-xs"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-blue-600 dark:text-blue-400">
                                        OSI #{o.nro_osi || o.id_osi}
                                      </span>
                                      <span className="font-medium text-slate-800 dark:text-slate-200">
                                        {o.nombre_empresa}
                                      </span>
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                      {o.servicio}
                                    </p>
                                  </div>
                                  {o.fecha_inicio_real && (
                                    <span className="text-[11px] text-slate-400 shrink-0">
                                      {o.fecha_inicio_real}
                                    </span>
                                  )}
                                </button>
                              ))
                            ) : (
                              <div className="p-4 text-center text-xs text-slate-400">
                                No se encontraron OSIs con ese término.
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Step 2: Facilitador Link */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      2. Facilitador Vinculado
                    </label>
                    {assignedFacilitator && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Detectado según OSI
                      </span>
                    )}
                  </div>

                  {assignedFacilitator ? (
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                          {assignedFacilitator.nombre_apellido
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {assignedFacilitator.nombre_apellido}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {assignedFacilitator.titulo_profesional || "Facilitador SHA"}{" "}
                            {assignedFacilitator.cedula
                              ? `• ${assignedFacilitator.cedula}`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setAssignedFacilitator(null);
                          setManualFacilitatorId("");
                        }}
                        className="text-xs text-blue-600 hover:underline shrink-0"
                      >
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <select
                      value={manualFacilitatorId}
                      onChange={(e) =>
                        setManualFacilitatorId(
                          e.target.value ? parseInt(e.target.value) : "",
                        )
                      }
                      className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    >
                      <option value="">
                        -- Seleccionar facilitador (opcional si aún no está asignado) --
                      </option>
                      {initialFacilitators.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nombre_apellido}{" "}
                          {f.titulo_profesional ? `(${f.titulo_profesional})` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Step 3: PO Identification */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Nro. de Orden de Compra <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      placeholder="Ej. OC-2026-0044"
                      className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Fecha de Emisión de la OC
                    </label>
                    <input
                      type="date"
                      value={fechaEmision}
                      onChange={(e) => setFechaEmision(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Step 4: Notes / Observations */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Observaciones o Referencia Interna
                  </label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    rows={2}
                    placeholder="Ej. Aprobada por Administración. Válida para facturación al término del servicio."
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Right Column: File Upload Dropzone */}
              <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                    3. Adjuntar Archivo de la Orden de Compra{" "}
                    <span className="text-rose-500">*</span>
                  </label>

                  {/* Dropzone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative rounded-3xl border-2 border-dashed p-8 text-center transition-all ${
                      isDragging
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[1.01]"
                        : selectedFile
                          ? "border-emerald-300 bg-emerald-50/30 dark:border-emerald-800/40 dark:bg-emerald-950/20"
                          : "border-slate-300 dark:border-slate-700 hover:border-blue-400 bg-slate-50/50 dark:bg-slate-800/40"
                    }`}
                  >
                    <input
                      type="file"
                      id="po-file-input"
                      onChange={handleFileChange}
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="sr-only"
                    />

                    {selectedFile ? (
                      <div className="space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-xs">
                          <FileCheck className="w-7 h-7" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white break-all">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB •{" "}
                            {selectedFile.type || "Documento"}
                          </p>
                        </div>

                        <div className="flex items-center justify-center gap-3 pt-2">
                          <label
                            htmlFor="po-file-input"
                            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            Reemplazar archivo
                          </label>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={() => setSelectedFile(null)}
                            className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label
                        htmlFor="po-file-input"
                        className="cursor-pointer block space-y-3"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center shadow-xs">
                          <UploadCloud className="w-7 h-7" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            Arrastra aquí la Orden de Compra o{" "}
                            <span className="text-blue-600 dark:text-blue-400 underline">
                              examina tu equipo
                            </span>
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Archivos admitidos: PDF, JPG, PNG (máx. 25 MB)
                          </p>
                        </div>
                      </label>
                    )}
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleUploadPO}
                    disabled={isUploading}
                    className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-600/20 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Consignando Orden de Compra...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>Consignar Orden de Compra</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-slate-400 mt-2">
                    Al consignar, se guardará el comprobante en el expediente de la OSI y
                    se notificará a Capacitación y Facilitador.
                  </p>
                </div>
              </div>
            </div>

            {/* ─── RECENT PURCHASE ORDERS HISTORY ─── */}
            <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Órdenes de Compra Consignadas Recientemente
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  {recentPOs.length} registradas
                </span>
              </div>

              {recentPOs.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-3 px-4">Fecha</th>
                        <th className="py-3 px-4">Nro. OSI & Cliente</th>
                        <th className="py-3 px-4">Facilitador</th>
                        <th className="py-3 px-4">Archivo / Comprobante</th>
                        <th className="py-3 px-4 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {recentPOs.map((po) => (
                        <tr
                          key={po.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                            {po.created_at
                              ? new Date(po.created_at).toLocaleDateString("es-VE")
                              : "Reciente"}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 dark:text-white">
                              OSI #{po.nro_osi || po.osi_id}
                            </span>
                            {po.empresa_nombre && (
                              <p className="text-[11px] text-slate-500 line-clamp-1">
                                {po.empresa_nombre}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            {po.facilitador_nombre || "General / No asignado"}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                              <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="truncate max-w-[180px]">
                                {po.file_name}
                              </span>
                            </div>
                            {po.file_size && (
                              <span className="text-[10px] text-slate-400">
                                {(po.file_size / 1024).toFixed(0)} KB
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {po.public_url ? (
                              <a
                                href={po.public_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                              >
                                <span>Ver / Descargar</span>
                                <Download className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  Aún no se han registrado órdenes de compra a través de este portal.
                </div>
              )}
            </div>
          </section>
        ) : (
          /* ─── WORKSPACE: FICHAS TÉCNICAS DE FACILITADORES ─── */
          <section
            aria-label="Fichas Técnicas de Facilitadores"
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in duration-200"
          >
            {/* Header with Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mb-2">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Directorio y Credenciales Técnicas</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Fichas Técnicas del Pool de Facilitadores
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Consulta las credenciales, trayectoria profesional y visualiza o descarga la Ficha Técnica oficial en PDF.
                </p>
              </div>

              {/* Facilitator Search Input */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={facilitatorSearch}
                  onChange={(e) => setFacilitatorSearch(e.target.value)}
                  placeholder="Buscar por nombre, cédula o profesión..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
                {facilitatorSearch && (
                  <button
                    onClick={() => setFacilitatorSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Results Counter */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                Mostrando{" "}
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {filteredFacilitators.length}
                </span>{" "}
                de {initialFacilitators.length} facilitadores
              </span>
            </div>

            {/* Facilitators Grid */}
            {filteredFacilitators.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFacilitators.map((f) => {
                  const initials = f.nombre_apellido
                    .split(" ")
                    .filter(Boolean)
                    .map((w) => w[0]?.toUpperCase())
                    .slice(0, 2)
                    .join("");

                  return (
                    <div
                      key={f.id}
                      className="group flex flex-col justify-between p-5 rounded-3xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-600/50 hover:shadow-md transition-all duration-200"
                    >
                      {/* Header: Photo + Info */}
                      <div className="flex items-start gap-3.5">
                        {f.foto_perfil_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={f.foto_perfil_url}
                            alt={f.nombre_apellido}
                            className="w-13 h-13 rounded-2xl object-cover border-2 border-white dark:border-slate-700 shadow-sm shrink-0"
                          />
                        ) : (
                          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
                            {initials}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-slate-900 dark:text-white text-base truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {f.nombre_apellido}
                          </h3>
                          <p className="text-xs font-medium text-purple-700 dark:text-purple-300 line-clamp-1">
                            {f.titulo_profesional || "Facilitador Especialista SHA"}
                          </p>
                          {f.cedula && (
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Cédula: <span className="font-mono">{f.cedula}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="mt-5 pt-4 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedFacilitatorModal(f)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors flex items-center gap-1.5"
                          title="Ver currículum y competencias"
                        >
                          <User className="w-3.5 h-3.5" />
                          <span>Perfil</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingFichaFacilitador(f)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/80 border border-purple-200 dark:border-purple-800 transition-colors shadow-2xs"
                            title="Visualizar Ficha Técnica en visor integrado"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver</span>
                          </button>

                          <a
                            href={`/api/generate-ficha-tecnica-facilitador-pdf?id=${f.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleDownloadFicha(f.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-xs hover:shadow transition-all"
                            title="Descargar Ficha Técnica Oficial en PDF"
                          >
                            {downloadingId === f.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            <span>Descargar</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center space-y-3 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-200 dark:border-slate-800">
                <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No se encontraron facilitadores para &ldquo;{facilitatorSearch}&rdquo;
                </p>
                <p className="text-xs text-slate-400">
                  Intenta buscar por otro nombre, cédula o área de especialidad.
                </p>
                <button
                  type="button"
                  onClick={() => setFacilitatorSearch("")}
                  className="text-xs font-semibold text-purple-600 hover:underline pt-1"
                >
                  Limpiar búsqueda
                </button>
              </div>
            )}
          </section>
        )}
      </main>

      {/* ─── FACILITATOR DETAIL MODAL ─── */}
      <FacilitadorDetailModal
        facilitador={selectedFacilitatorModal}
        onClose={() => setSelectedFacilitatorModal(null)}
        onViewPdf={(f) => setViewingFichaFacilitador(f)}
      />

      {/* ─── INLINE FICHA TÉCNICA PDF VIEWER MODAL ─── */}
      <FichaTecnicaViewerModal
        facilitador={viewingFichaFacilitador}
        onClose={() => setViewingFichaFacilitador(null)}
      />
    </div>
  );
}
