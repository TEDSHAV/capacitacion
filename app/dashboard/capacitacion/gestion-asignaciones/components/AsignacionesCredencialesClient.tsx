"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getAsignacionesPageData,
} from "@/app/actions/osi-facilitador-assignments";
import { CachedDataBanner } from "@/components/CachedDataBanner";
import {
  cachePortalData,
  getCachedPortalData,
} from "@/lib/offline/portal-data-cache";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import {
  ClipboardList,
  History,
  AlertTriangle,
  KeyRound,
  Users,
  Loader2,
  Plus,
} from "lucide-react";
import AssignmentsTable from "./AssignmentsTable";
import CredentialsPanel from "./CredentialsPanel";
import FacilitadorPickerModal from "./FacilitadorPickerModal";
import AssignOSIModal from "../../gestion-de-facilitadores/components/assign-osi-modal";

interface AssignmentRow {
  id: number;
  osi_id: number;
  facilitador_id: number;
  nro_sesion: number | null;
  source: string | null;
  is_active: boolean | null;
  assigned_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  facilitadores: {
    id: number;
    nombre_apellido: string | null;
    cedula: string | null;
    email: string | null;
    is_active: boolean | null;
  } | null;
  osi: {
    id_osi: number;
    nro_osi: string;
    nombre_empresa: string | null;
    servicio: string | null;
    fecha_fin_real: string | null;
    fecha_emision: string | null;
    id_estatus: number | null;
  } | null;
  days_since_end: number | null;
  is_stale: boolean;
}

interface CredentialRow {
  id: number;
  facilitador_id: number;
  username: string;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  facilitadores: {
    id: number;
    nombre_apellido: string | null;
    cedula: string | null;
    email: string | null;
    is_active: boolean | null;
  } | null;
}

interface Stats {
  total_active: number;
  total_inactive: number;
  stale_count: number;
  total_credentials: number;
  active_credentials: number;
}

type Tab = "activas" | "historico";

export default function AsignacionesCredencialesClient() {
  const isOnline = useOnlineStatus();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("activas");
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [credentials, setCredentials] = useState<CredentialRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [staleDays, setStaleDays] = useState(30);
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef(false);
  const [showAssignPicker, setShowAssignPicker] = useState(false);
  const [selectedFacForAssign, setSelectedFacForAssign] = useState<{ id: number; name: string } | null>(null);

  const loadData = useCallback(async () => {
    const result = await getAsignacionesPageData(staleDays);

    if (result.error || !result.data) {
      setError(result.error || "Error al cargar datos");
      setAssignments([]);
      setCredentials([]);
      setStats(null);
    } else {
      setAssignments(result.data.assignments as unknown as AssignmentRow[]);
      setCredentials(result.data.credentials as unknown as CredentialRow[]);
      setStats(result.data.stats as Stats);
    }
    setLoading(false);
  }, [staleDays]);

  // Initial load — single server action call with 3 DB queries.
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    async function initialLoad() {
      const result = await getAsignacionesPageData(staleDays);

      if (result.error || !result.data) {
        setError(result.error || "Error al cargar datos");
        setAssignments([]);
        setCredentials([]);
        setStats(null);
      } else {
        setAssignments(result.data.assignments as unknown as AssignmentRow[]);
        setCredentials(result.data.credentials as unknown as CredentialRow[]);
        setStats(result.data.stats as Stats);
      }
      setLoading(false);
    }
    initialLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Offline: try cache on first load if online fetch failed, and persist when online.
  useEffect(() => {
    if (!isOnline && !loading) {
      getCachedPortalData<{
        assignments: AssignmentRow[];
        credentials: CredentialRow[];
        stats: Stats;
      }>("dash_asignaciones")
        .then((cached) => {
          if (cached && assignments.length === 0) {
            setAssignments(cached.data.assignments);
            setCredentials(cached.data.credentials);
            setStats(cached.data.stats);
            setFromCache(true);
            setCachedAt(cached.cachedAt);
          }
        })
        .catch(() => {});
    }
    if (isOnline && !loading && assignments.length > 0) {
      cachePortalData("dash_asignaciones", "dash_asignaciones", {
        assignments,
        credentials,
        stats,
      })
        .then(() => {
          setFromCache(false);
          setCachedAt(null);
        })
        .catch(() => {});
    }
  }, [isOnline, loading, assignments, credentials, stats]);

  const handleRefresh = () => loadData();

  const activeAssignments = assignments.filter((a) => a.is_active === true);
  const historicalAssignments = assignments.filter((a) => a.is_active === false);

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Asignaciones y Credenciales
        </h1>
        <p className="mt-2 text-gray-600">
          Gestiona las asignaciones de OSIs a facilitadores, limpia asignaciones
          obsoletas y administra las credenciales de acceso al portal.
        </p>
      </div>

      {fromCache && <div className="mb-4"><CachedDataBanner cachedAt={cachedAt} isOnline={isOnline} /></div>}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Metrics row */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            icon={<ClipboardList className="h-8 w-8 text-blue-600" />}
            label="Asignaciones Activas"
            value={stats.total_active}
          />
          <MetricCard
            icon={<History className="h-8 w-8 text-gray-500" />}
            label="Historial de Asignaciones"
            value={stats.total_inactive}
          />
          <MetricCard
            icon={<AlertTriangle className="h-8 w-8 text-amber-600" />}
            label="Asignaciones Obsoletas"
            value={stats.stale_count}
            highlight={stats.stale_count > 0 ? "amber" : undefined}
          />
          <MetricCard
            icon={<KeyRound className="h-8 w-8 text-purple-600" />}
            label="Credenciales Activas"
            value={stats.active_credentials}
            subtext={`de ${stats.total_credentials} en total`}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex gap-2">
          <TabButton
            active={activeTab === "activas"}
            onClick={() => setActiveTab("activas")}
            icon={<ClipboardList className="w-4 h-4" />}
            label="Activas"
            count={activeAssignments.length}
          />
          <TabButton
            active={activeTab === "historico"}
            onClick={() => setActiveTab("historico")}
            icon={<History className="w-4 h-4" />}
            label="Historial"
            count={historicalAssignments.length}
          />
        </nav>
        <button
          onClick={() => setShowAssignPicker(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva Asignación
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-16">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-gray-500 mt-3">Cargando asignaciones...</p>
        </div>
      ) : (
        <AssignmentsTable
          assignments={activeTab === "activas" ? activeAssignments : historicalAssignments}
          isActiveView={activeTab === "activas"}
          staleDays={staleDays}
          onStaleDaysChange={setStaleDays}
          onRefresh={handleRefresh}
        />
      )}

      {/* Credentials panel — always visible */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Credenciales del Portal
          </h2>
        </div>
        <CredentialsPanel credentials={credentials} onRefresh={handleRefresh} />
      </div>

      {/* Nueva Asignación flow: facilitador picker → AssignOSIModal */}
      {showAssignPicker && (
        <FacilitadorPickerModal
          title="Nueva Asignación"
          onClose={() => setShowAssignPicker(false)}
          onSelect={(fac) => {
            setSelectedFacForAssign(fac);
            setShowAssignPicker(false);
          }}
        />
      )}
      {selectedFacForAssign && (
        <AssignOSIModal
          facilitadorId={selectedFacForAssign.id}
          facilitadorName={selectedFacForAssign.name}
          onClose={() => {
            setSelectedFacForAssign(null);
            handleRefresh();
          }}
        />
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  subtext,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtext?: string;
  highlight?: "amber" | "red";
}) {
  const borderClass =
    highlight === "amber"
      ? "border-amber-300 bg-amber-50"
      : highlight === "red"
        ? "border-red-300 bg-red-50"
        : "border-gray-200 bg-white";
  return (
    <div className={`p-4 rounded-lg shadow-sm border flex items-center gap-3 ${borderClass}`}>
      {icon}
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtext && <p className="text-xs text-gray-400">{subtext}</p>}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 py-2.5 px-4 font-medium text-sm transition-colors rounded-lg ${
        active
          ? "bg-gray-900 text-white"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      }`}
    >
      {icon}
      {label}
      <span
        className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[10px] font-bold rounded-full ${
          active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
