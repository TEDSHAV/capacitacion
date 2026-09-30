"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Download,
  RotateCw,
  FileText,
  User,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  Users,
  Building2,
  Printer,
  FileCheck,
  FileWarning,
  Eye,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ComplianceDocumentCode,
  COMPLIANCE_DOCUMENTS,
  FacilitadorComplianceSummary,
  ComplianceGlobalStats,
  FacilitadorComplianceRecord,
} from "@/types/compliance-documents";
import {
  getAdminComplianceOverview,
  togglePhysicalDelivery,
} from "@/app/actions/facilitador-compliance";

interface CumplimientoFacilitadoresClientProps {
  initialStats: ComplianceGlobalStats;
  initialFacilitators: FacilitadorComplianceSummary[];
  error?: string;
}

export function CumplimientoFacilitadoresClient({
  initialStats,
  initialFacilitators,
  error: initialError,
}: CumplimientoFacilitadoresClientProps) {
  const [stats, setStats] = useState<ComplianceGlobalStats>(initialStats);
  const [facilitators, setFacilitators] = useState<FacilitadorComplianceSummary[]>(initialFacilitators);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"todos" | "compliant" | "digital_pending" | "physical_pending">("todos");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFacilitator, setSelectedFacilitator] = useState<FacilitadorComplianceSummary | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [togglingDoc, setTogglingDoc] = useState<{ fid: number; docCode: string } | null>(null);

  // Refresh data from server
  const handleRefresh = async () => {
    setIsRefreshing(true);
    const res = await getAdminComplianceOverview();
    if (res.success) {
      setStats(res.stats);
      setFacilitators(res.facilitators);
    }
    setIsRefreshing(false);
  };

  // Toggle physical delivery on the fly
  const handleTogglePhysical = async (
    facilitadorId: number,
    docCode: ComplianceDocumentCode,
    currentEntregado: boolean
  ) => {
    setTogglingDoc({ fid: facilitadorId, docCode });
    const newEntregado = !currentEntregado;

    // Optimistic update
    setFacilitators((prev) =>
      prev.map((f) => {
        if (f.facilitador_id !== facilitadorId) return f;
        const currentDoc = f.documents[docCode];
        const updatedDoc: FacilitadorComplianceRecord = currentDoc
          ? {
              ...currentDoc,
              fisico_entregado: newEntregado,
              fisico_entregado_at: newEntregado ? new Date().toISOString() : null,
            }
          : {
              facilitador_id: facilitadorId,
              document_code: docCode,
              document_title: COMPLIANCE_DOCUMENTS[docCode].title,
              document_version: COMPLIANCE_DOCUMENTS[docCode].version,
              acknowledged: false,
              acknowledged_at: null,
              signer_name: null,
              signer_cedula: null,
              fisico_entregado: newEntregado,
              fisico_entregado_at: newEntregado ? new Date().toISOString() : null,
              fisico_entregado_recibido_por: "Administración SHA",
            };

        const updatedDocs = { ...f.documents, [docCode]: updatedDoc };
        const ackCount = Object.values(updatedDocs).filter((d) => d?.acknowledged).length;
        const physPending =
          (COMPLIANCE_DOCUMENTS.notificacion_riesgos.requiresPhysicalDelivery && !updatedDocs.notificacion_riesgos?.fisico_entregado ? 1 : 0) +
          (COMPLIANCE_DOCUMENTS.politica_operativa.requiresPhysicalDelivery && !updatedDocs.politica_operativa?.fisico_entregado ? 1 : 0);

        return {
          ...f,
          documents: updatedDocs,
          acknowledged_count: ackCount,
          physical_pending_count: physPending,
          is_fully_compliant: ackCount === 3 && physPending === 0,
        };
      })
    );

    // Call server action
    await togglePhysicalDelivery(facilitadorId, docCode, newEntregado, "Administración SHA");
    setTogglingDoc(null);
  };

  // Export CSV with UTF-8 BOM
  const handleExportCSV = () => {
    const headers = [
      "ID Facilitador",
      "Nombre y Apellido",
      "Cédula",
      "Email",
      "Teléfono",
      "Doc 1 Peligros (Digital)",
      "Doc 1 Fecha",
      "Doc 2 Notif. Riesgos (Digital)",
      "Doc 2 Físico Recibido",
      "Doc 2 Fecha Digital",
      "Doc 3 Política (Digital)",
      "Doc 3 Físico Recibido",
      "Doc 3 Fecha Digital",
      "Estado General",
      "Última Firma IP",
    ];

    const rows = filteredFacilitators.map((f) => {
      const d1 = f.documents.identificacion_peligros;
      const d2 = f.documents.notificacion_riesgos;
      const d3 = f.documents.politica_operativa;

      const estadoGeneral = f.is_fully_compliant
        ? "100% Conforme"
        : f.acknowledged_count === 3 && f.physical_pending_count > 0
        ? "Digital Conforme (Pendiente Físico)"
        : "Pendiente Firma";

      const lastIp = d3?.ip_address || d2?.ip_address || d1?.ip_address || "N/A";

      return [
        f.facilitador_id,
        `"${f.nombre_apellido.replace(/"/g, '""')}"`,
        `"${f.cedula || ""}"`,
        `"${f.email || ""}"`,
        `"${f.telefono || ""}"`,
        d1?.acknowledged ? "SÍ" : "NO",
        d1?.acknowledged_at ? new Date(d1.acknowledged_at).toLocaleDateString("es-VE") : "",
        d2?.acknowledged ? "SÍ" : "NO",
        d2?.fisico_entregado ? "SÍ" : "NO",
        d2?.acknowledged_at ? new Date(d2.acknowledged_at).toLocaleDateString("es-VE") : "",
        d3?.acknowledged ? "SÍ" : "NO",
        d3?.fisico_entregado ? "SÍ" : "NO",
        d3?.acknowledged_at ? new Date(d3.acknowledged_at).toLocaleDateString("es-VE") : "",
        estadoGeneral,
        `"${lastIp}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `auditoria-cumplimiento-facilitadores-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter facilitators
  const filteredFacilitators = useMemo(() => {
    return facilitators.filter((f) => {
      // Search term
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !query ||
        f.nombre_apellido.toLowerCase().includes(query) ||
        (f.cedula && f.cedula.toLowerCase().includes(query)) ||
        (f.email && f.email.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      // Status tab
      if (activeTab === "compliant") {
        return f.is_fully_compliant;
      }
      if (activeTab === "digital_pending") {
        return f.acknowledged_count < 3;
      }
      if (activeTab === "physical_pending") {
        return f.physical_pending_count > 0;
      }

      return true;
    });
  }, [facilitators, searchTerm, activeTab]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/dashboard/capacitacion/gestion-de-facilitadores"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Gestión de Facilitadores
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold text-sky-700">Cumplimiento y Normativas</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-sky-600" />
            Cumplimiento y Normativas de Facilitadores
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Control de lectura obligatoria, firma digital y entrega en físico de los 3 documentos normativos (LOPCYMAT e ISO 9001).
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 text-xs font-semibold shadow-2xs"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-sky-600" : ""}`} />
            Actualizar
          </Button>

          <Button
            size="sm"
            onClick={handleExportCSV}
            className="bg-sky-600 hover:bg-sky-700 text-white gap-1.5 text-xs font-semibold shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar Auditoría CSV
          </Button>
        </div>
      </div>

      {initialError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">
            <p className="font-bold">Aviso del sistema de base de datos:</p>
            <p>{initialError}</p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tasa de Cumplimiento Global */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tasa de Cumplimiento
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {stats.complianceRate}%
            </span>
            <span className="text-xs text-slate-500 font-medium">
              ({stats.compliantCount} de {stats.totalFacilitadores})
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-sky-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${stats.complianceRate}%` }}
            />
          </div>
        </div>

        {/* 100% Conformes */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              100% Al Día
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-700">
              {stats.compliantCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">facilitadores</span>
          </div>
          <p className="mt-3 text-[11px] text-slate-500 leading-tight">
            Firma digital de 3 docs + físico entregado en oficina.
          </p>
        </div>

        {/* Pendiente Firma Digital */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pendiente Firma Digital
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-700">
              {stats.nonCompliantCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">facilitadores</span>
          </div>
          <p className="mt-3 text-[11px] text-slate-500 leading-tight">
            Tienen pendiente completar la lectura o firma en el portal.
          </p>
        </div>

        {/* Pendiente Entrega Física */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pendiente Físico
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileWarning className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-indigo-700">
              {stats.physicalPendingCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">facilitadores</span>
          </div>
          <p className="mt-3 text-[11px] text-slate-500 leading-tight">
            Firmaron digital pero falta planilla física firmada en sede.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
        {/* Filter and Search Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="inline-flex p-1 bg-slate-100/80 rounded-xl self-start border border-slate-200/60">
            <button
              type="button"
              onClick={() => setActiveTab("todos")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "todos"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todos ({facilitators.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("compliant")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "compliant"
                  ? "bg-white text-emerald-800 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              100% Al Día ({stats.compliantCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("digital_pending")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "digital_pending"
                  ? "bg-white text-amber-800 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pendiente Firma ({stats.nonCompliantCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("physical_pending")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "physical_pending"
                  ? "bg-white text-indigo-800 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pendiente Físico ({stats.physicalPendingCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, cédula o email..."
              className="pl-9 pr-3 text-xs bg-slate-50/50 border-slate-200 h-9 rounded-xl focus:bg-white"
            />
          </div>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] uppercase tracking-wider font-bold text-slate-500">
                <th className="py-3.5 px-4">Facilitador</th>
                <th className="py-3.5 px-3">
                  <div className="leading-tight">
                    <span className="block text-slate-700">1. Matriz de Peligros</span>
                    <span className="text-[10px] text-slate-400 font-normal lowercase">lectura digital</span>
                  </div>
                </th>
                <th className="py-3.5 px-3">
                  <div className="leading-tight">
                    <span className="block text-slate-700">2. Notificación Riesgos</span>
                    <span className="text-[10px] text-slate-400 font-normal lowercase">digital + físico</span>
                  </div>
                </th>
                <th className="py-3.5 px-3">
                  <div className="leading-tight">
                    <span className="block text-slate-700">3. Política General</span>
                    <span className="text-[10px] text-slate-400 font-normal lowercase">digital + físico</span>
                  </div>
                </th>
                <th className="py-3.5 px-3">Estado General</th>
                <th className="py-3.5 px-4 text-right">Auditoría</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredFacilitators.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <ShieldCheck className="w-9 h-9 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No se encontraron facilitadores</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Intenta ajustando el filtro de búsqueda o pestaña seleccionada.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredFacilitators.map((f) => {
                  const d1 = f.documents.identificacion_peligros;
                  const d2 = f.documents.notificacion_riesgos;
                  const d3 = f.documents.politica_operativa;

                  const isTogglingD2 = togglingDoc?.fid === f.facilitador_id && togglingDoc?.docCode === "notificacion_riesgos";
                  const isTogglingD3 = togglingDoc?.fid === f.facilitador_id && togglingDoc?.docCode === "politica_operativa";

                  return (
                    <tr key={f.facilitador_id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Facilitador info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                            {f.nombre_apellido.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-snug">{f.nombre_apellido}</p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              CI: {f.cedula || "No registrada"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Doc 1: Matriz de Peligros (read-only ack) */}
                      <td className="py-3.5 px-3">
                        {d1?.acknowledged ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Firmado Digital</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-500 font-medium text-[11px]">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Pendiente</span>
                          </div>
                        )}
                      </td>

                      {/* Doc 2: Notificación Riesgos (Digital + Physical) */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-1.5">
                          {/* Digital Ack */}
                          <div>
                            {d2?.acknowledged ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Digital OK
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                                <Clock className="w-3 h-3" /> Digital pendiente
                              </span>
                            )}
                          </div>

                          {/* Physical delivery toggle */}
                          <div>
                            <button
                              type="button"
                              onClick={() => handleTogglePhysical(f.facilitador_id, "notificacion_riesgos", Boolean(d2?.fisico_entregado))}
                              disabled={isTogglingD2}
                              title="Haz clic para marcar o desmarcar recepción de la planilla física firmada"
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold transition-all border ${
                                d2?.fisico_entregado
                                  ? "bg-emerald-100/80 text-emerald-900 border-emerald-300 hover:bg-emerald-200"
                                  : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                              }`}
                            >
                              {d2?.fisico_entregado ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-700" />
                                  <span>Entregado en Físico</span>
                                </>
                              ) : (
                                <>
                                  <FileWarning className="w-3 h-3 text-indigo-500" />
                                  <span>Marcar entregado en Físico</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Doc 3: Política General (Digital + Physical) */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-1.5">
                          {/* Digital Ack */}
                          <div>
                            {d3?.acknowledged ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Digital OK
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                                <Clock className="w-3 h-3" /> Digital pendiente
                              </span>
                            )}
                          </div>

                          {/* Physical delivery toggle */}
                          <div>
                            <button
                              type="button"
                              onClick={() => handleTogglePhysical(f.facilitador_id, "politica_operativa", Boolean(d3?.fisico_entregado))}
                              disabled={isTogglingD3}
                              title="Haz clic para marcar o desmarcar recepción de la planilla física firmada"
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold transition-all border ${
                                d3?.fisico_entregado
                                  ? "bg-emerald-100/80 text-emerald-900 border-emerald-300 hover:bg-emerald-200"
                                  : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                              }`}
                            >
                              {d3?.fisico_entregado ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-700" />
                                  <span>Entregado en Físico</span>
                                </>
                              ) : (
                                <>
                                  <FileWarning className="w-3 h-3 text-indigo-500" />
                                  <span>Marcar entregado en Físico</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Overall Compliance Status */}
                      <td className="py-3.5 px-3">
                        {f.is_fully_compliant ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            100% Al Día
                          </span>
                        ) : f.acknowledged_count === 3 && f.physical_pending_count > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
                            <FileWarning className="w-3.5 h-3.5 text-indigo-600" />
                            Falta Físico ({f.physical_pending_count})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            {f.acknowledged_count} de 3 Firmados
                          </span>
                        )}
                      </td>

                      {/* Action / Audit button */}
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedFacilitator(f);
                            setIsAuditModalOpen(true);
                          }}
                          className="h-8 px-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>Auditoría</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Detail Modal */}
      {selectedFacilitator && (
        <Dialog open={isAuditModalOpen} onOpenChange={setIsAuditModalOpen}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white">
            <DialogHeader className="p-6 bg-slate-900 text-white">
              <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                Registro Oficial de Auditoría y Cumplimiento
              </div>
              <DialogTitle className="text-xl font-black text-white mt-1">
                {selectedFacilitator.nombre_apellido}
              </DialogTitle>
              <p className="text-xs text-slate-400">
                Cédula: {selectedFacilitator.cedula || "No registrada"} • ID #{selectedFacilitator.facilitador_id}
              </p>
            </DialogHeader>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <p className="text-xs text-slate-500">
                A continuación se desglosan los registros legales de firma electrónica, direcciones IP y entrega física para soportar auditorías de calidad (ISO 9001 / LOPCYMAT).
              </p>

              <div className="space-y-4">
                {(["identificacion_peligros", "notificacion_riesgos", "politica_operativa"] as ComplianceDocumentCode[]).map((code) => {
                  const def = COMPLIANCE_DOCUMENTS[code];
                  const record = selectedFacilitator.documents[code];

                  return (
                    <div
                      key={code}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wide">
                            {def.category}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900">{def.title}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-slate-500 font-mono">
                              Versión: {def.version} • Fecha: {def.date}
                            </span>
                            <span className="text-slate-300">•</span>
                            <a
                              href={def.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sky-600 hover:text-sky-800 text-[11px] font-bold inline-flex items-center gap-1 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Ver PDF Oficial
                            </a>
                          </div>
                        </div>

                        {record?.acknowledged ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Firmado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Pendiente
                          </span>
                        )}
                      </div>

                      {/* Audit Details */}
                      {record?.acknowledged ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-white p-3 rounded-lg border border-slate-200/80">
                          <div>
                            <span className="text-slate-400 font-semibold block">Firmante declarado:</span>
                            <span className="text-slate-800 font-bold">{record.signer_name}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block">Cédula del firmante:</span>
                            <span className="text-slate-800 font-mono font-bold">{record.signer_cedula}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block">Fecha y Hora de Firma:</span>
                            <span className="text-slate-800 font-medium">
                              {record.acknowledged_at
                                ? new Date(record.acknowledged_at).toLocaleString("es-VE")
                                : "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block">Dirección IP Auditada:</span>
                            <span className="text-slate-800 font-mono font-medium">
                              {record.ip_address || "127.0.0.1"}
                            </span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-slate-400 font-semibold block">Agente / Navegador:</span>
                            <span className="text-slate-600 font-mono text-[10px] break-all">
                              {record.user_agent || "No disponible"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-amber-700 font-medium">
                          El facilitador aún no ha ingresado al portal para leer y firmar este documento.
                        </p>
                      )}

                      {/* Physical Delivery Status for Docs that require it */}
                      {def.requiresPhysicalDelivery && (
                        <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                          <div className="text-xs">
                            <span className="font-semibold text-slate-700">Entrega de documento físico original:</span>
                            <p className="text-[11px] text-slate-500">
                              {record?.fisico_entregado
                                ? `Recibido en sede física (${record.fisico_entregado_at ? new Date(record.fisico_entregado_at).toLocaleDateString("es-VE") : "Fecha no registrada"})`
                                : "Pendiente por consignar en oficinas de SHA de Venezuela"}
                            </p>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleTogglePhysical(
                                selectedFacilitator.facilitador_id,
                                code,
                                Boolean(record?.fisico_entregado)
                              )
                            }
                            className={`text-xs font-bold gap-1.5 h-8 ${
                              record?.fisico_entregado
                                ? "border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
                                : "border-slate-300 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {record?.fisico_entregado ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                Entregado
                              </>
                            ) : (
                              "Marcar como Recibido"
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Cumplimiento conforme a LOPCYMAT Arts. 53/56 e ISO 9001:2015.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAuditModalOpen(false)}
                className="text-xs font-semibold"
              >
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
