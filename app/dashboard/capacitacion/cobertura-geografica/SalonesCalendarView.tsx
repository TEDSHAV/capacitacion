"use client";

import { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Landmark,
  LayoutGrid,
  List,
  Columns3,
  ExternalLink,
  X,
  Building2,
  Sparkles,
  Loader2,
  Check,
} from "lucide-react";
import type {
  CoberturaOsiItem,
  CoberturaClassroomUsage,
} from "@/app/actions/cobertura-geografica";
import { SALONES_SHA_CONFIG, matchSalonFilter } from "@/lib/constants/salones";
import { updateOsiSalon } from "@/app/actions/capacitacion-proceso-steps";

export type SalonBucketId =
  | "salon-principal"
  | "salon-oriente"
  | "salon-elite"
  | "sin_asignar";

export interface CalendarClassroomEvent {
  key: string;
  osiId: number;
  nroOsi: string;
  nroSesion: number;
  totalSesiones: number;
  fecha: string; // YYYY-MM-DD
  horaInicio: string | null;
  horaFin: string | null;
  ejecutada: boolean;
  servicio: string;
  empresaNombre: string;
  horasAcademicas: number;
  certificadosEmitidos: number;
  participantesEstimados: number;
  salon: string | null;
  bucketId: SalonBucketId;
}

interface SalonesCalendarViewProps {
  allShaOsis: CoberturaOsiItem[];
  salonesSummary: CoberturaClassroomUsage[];
  selectedSalon: string;
  dateFrom?: string;
  dateTo?: string;
  onSelectSalon: (salon: string) => void;
  onPreviewOsi: (osiId: number) => void;
  onSalonUpdated: () => Promise<void> | void;
  formatNumber: (num: number | undefined | null) => string;
}

type SubViewMode = "semana" | "mes" | "lista";

const WEEKDAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const ROOM_ROWS: Array<{
  id: SalonBucketId;
  nombre: string;
  shortNombre: string;
  code: string;
  dotClass: string;
  pillClass: string;
  headerBg: string;
  accentBorder: string;
}> = [
  {
    id: "salon-principal",
    nombre: "Salón Principal",
    shortNombre: "Salón Principal",
    code: "SP",
    dotClass: "bg-sky-500",
    pillClass: "bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100",
    headerBg: "bg-sky-50/70 text-sky-900",
    accentBorder: "border-l-sky-500",
  },
  {
    id: "salon-oriente",
    nombre: "Salón Oriente",
    shortNombre: "Salón Oriente",
    code: "OR",
    dotClass: "bg-amber-500",
    pillClass: "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100",
    headerBg: "bg-amber-50/70 text-amber-900",
    accentBorder: "border-l-amber-500",
  },
  {
    id: "salon-elite",
    nombre: "Salón Elite",
    shortNombre: "Salón Elite",
    code: "EL",
    dotClass: "bg-purple-500",
    pillClass: "bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100",
    headerBg: "bg-purple-50/70 text-purple-900",
    accentBorder: "border-l-purple-500",
  },
  {
    id: "sin_asignar",
    nombre: "Por confirmar / Sin asignar",
    shortNombre: "Por confirmar",
    code: "?",
    dotClass: "bg-slate-400",
    pillClass: "bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200/70",
    headerBg: "bg-slate-100/80 text-slate-700",
    accentBorder: "border-l-slate-400",
  },
];

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function getMondayOfWeek(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = copy.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function formatTimeRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  const s = start ? start.slice(0, 5) : "";
  const e = end ? end.slice(0, 5) : "";
  if (s && e) return `${s}–${e}`;
  return s || e || null;
}

function formatReadableDate(ymd: string): string {
  const d = parseYmd(ymd);
  const weekday = WEEKDAY_SHORT[(d.getDay() + 6) % 7];
  return `${weekday}, ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function resolveBucketId(canonId: string | null | undefined): SalonBucketId {
  if (
    canonId === "salon-principal" ||
    canonId === "salon-oriente" ||
    canonId === "salon-elite"
  ) {
    return canonId;
  }
  return "sin_asignar";
}

export default function SalonesCalendarView({
  allShaOsis,
  salonesSummary,
  selectedSalon,
  dateFrom,
  dateTo,
  onSelectSalon,
  onPreviewOsi,
  onSalonUpdated,
  formatNumber,
}: SalonesCalendarViewProps) {
  const todayStr = useMemo(() => toYmd(new Date()), []);

  const [subView, setSubView] = useState<SubViewMode>("mes");
  const [cursorDate, setCursorDate] = useState<Date>(() => new Date());
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Build normalized calendar events from allShaOsis (session-level when available, date-range fallback otherwise)
  const events = useMemo<CalendarClassroomEvent[]>(() => {
    const result: CalendarClassroomEvent[] = [];

    for (const osi of allShaOsis) {
      if (osi.sesiones && osi.sesiones.length > 0) {
        const totalSesiones = osi.sesiones.length;
        for (const ses of osi.sesiones) {
          if (!ses.fecha) continue;
          result.push({
            key: `${osi.idOsi}-s${ses.nroSesion}-${ses.fecha}`,
            osiId: osi.idOsi,
            nroOsi: osi.nroOsi,
            nroSesion: ses.nroSesion,
            totalSesiones,
            fecha: ses.fecha.slice(0, 10),
            horaInicio: ses.horaInicio,
            horaFin: ses.horaFin,
            ejecutada: ses.ejecutada,
            servicio: osi.servicio,
            empresaNombre: osi.empresaNombre,
            horasAcademicas: osi.horasAcademicas,
            certificadosEmitidos: osi.certificadosEmitidos,
            participantesEstimados: osi.participantesEstimados,
            salon: ses.salon ?? osi.salon,
            bucketId: resolveBucketId(ses.salonCanonicalId ?? osi.salonCanonicalId),
          });
        }
      } else {
        const startStr = (osi.fechaInicio || osi.fechaFin || "").slice(0, 10);
        const endStr = (osi.fechaFin || osi.fechaInicio || "").slice(0, 10);
        if (!startStr) continue;

        const startDate = parseYmd(startStr);
        const endDate = endStr ? parseYmd(endStr) : startDate;
        const diffDays = Math.round(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        const bucketId = resolveBucketId(osi.salonCanonicalId);
        if (diffDays > 0 && diffDays <= 14) {
          for (let i = 0; i <= diffDays; i++) {
            const dStr = toYmd(addDays(startDate, i));
            result.push({
              key: `${osi.idOsi}-d${i}-${dStr}`,
              osiId: osi.idOsi,
              nroOsi: osi.nroOsi,
              nroSesion: i + 1,
              totalSesiones: diffDays + 1,
              fecha: dStr,
              horaInicio: null,
              horaFin: null,
              ejecutada: Boolean(osi.fechaFin && osi.fechaFin.slice(0, 10) <= todayStr),
              servicio: osi.servicio,
              empresaNombre: osi.empresaNombre,
              horasAcademicas: osi.horasAcademicas,
              certificadosEmitidos: osi.certificadosEmitidos,
              participantesEstimados: osi.participantesEstimados,
              salon: osi.salon,
              bucketId,
            });
          }
        } else {
          result.push({
            key: `${osi.idOsi}-single-${endStr || startStr}`,
            osiId: osi.idOsi,
            nroOsi: osi.nroOsi,
            nroSesion: 1,
            totalSesiones: 1,
            fecha: endStr || startStr,
            horaInicio: null,
            horaFin: null,
            ejecutada: Boolean(osi.fechaFin && osi.fechaFin.slice(0, 10) <= todayStr),
            servicio: osi.servicio,
            empresaNombre: osi.empresaNombre,
            horasAcademicas: osi.horasAcademicas,
            certificadosEmitidos: osi.certificadosEmitidos,
            participantesEstimados: osi.participantesEstimados,
            salon: osi.salon,
            bucketId,
          });
        }
      }
    }

    const fromBound = dateFrom ? dateFrom.slice(0, 10) : null;
    const toBound = dateTo ? dateTo.slice(0, 10) : null;

    return result
      .filter((ev) => {
        if (fromBound && ev.fecha < fromBound) return false;
        if (toBound && ev.fecha > toBound) return false;
        if (selectedSalon && !matchSalonFilter(ev.salon, selectedSalon, true)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const cmp = a.fecha.localeCompare(b.fecha);
        if (cmp !== 0) return cmp;
        return (a.horaInicio || "").localeCompare(b.horaInicio || "");
      });
  }, [allShaOsis, todayStr, dateFrom, dateTo, selectedSalon]);

  // Monthly occupancy summary for the currently viewed month (cursorDate)
  const monthlyOccupancy = useMemo(() => {
    const year = cursorDate.getFullYear();
    const month = cursorDate.getMonth();
    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const stats = new Map<
      SalonBucketId,
      { days: Set<string>; osis: Set<number>; sessions: number }
    >();
    for (const r of ROOM_ROWS) {
      stats.set(r.id, { days: new Set(), osis: new Set(), sessions: 0 });
    }

    for (const ev of events) {
      if (!ev.fecha.startsWith(monthPrefix)) continue;
      const entry = stats.get(ev.bucketId);
      if (entry) {
        entry.days.add(ev.fecha);
        entry.osis.add(ev.osiId);
        entry.sessions++;
      }
    }

    return {
      monthLabel: `${MONTH_NAMES[month]} ${year}`,
      daysInMonth,
      rooms: ROOM_ROWS.map((r) => {
        const st = stats.get(r.id)!;
        return {
          ...r,
          occupiedDays: st.days.size,
          distinctCourses: st.osis.size,
          totalSessions: st.sessions,
        };
      }),
    };
  }, [events, cursorDate]);

  // Index events by date and by date+bucket
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarClassroomEvent[]>();
    for (const ev of events) {
      const list = map.get(ev.fecha);
      if (list) list.push(ev);
      else map.set(ev.fecha, [ev]);
    }
    return map;
  }, [events]);

  // Detect classroom conflicts (2+ distinct OSIs in the same assigned classroom on the same day)
  const conflicts = useMemo(() => {
    const list: Array<{ fecha: string; bucketId: SalonBucketId; count: number }> = [];
    const byDateRoom = new Map<string, Set<number>>();
    for (const ev of events) {
      if (ev.bucketId === "sin_asignar") continue;
      const k = `${ev.fecha}__${ev.bucketId}`;
      const set = byDateRoom.get(k) || new Set<number>();
      set.add(ev.osiId);
      byDateRoom.set(k, set);
    }
    for (const [k, osiSet] of byDateRoom.entries()) {
      if (osiSet.size > 1) {
        const [fecha, bucketId] = k.split("__") as [string, SalonBucketId];
        list.push({ fecha, bucketId, count: osiSet.size });
      }
    }
    return list.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [events]);

  const unassignedCount = useMemo(
    () => events.filter((e) => e.bucketId === "sin_asignar").length,
    [events],
  );

  // Week days (Mon-Sun) for weekly matrix
  const weekDays = useMemo(() => {
    const monday = getMondayOfWeek(cursorDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(monday, i);
      return {
        date: d,
        ymd: toYmd(d),
        dayNum: d.getDate(),
        weekday: WEEKDAY_SHORT[i],
        monthShort: MONTH_NAMES[d.getMonth()].slice(0, 3),
        isWeekend: i >= 5,
      };
    });
  }, [cursorDate]);

  // Month grid cells (Mon-Sun padded) for monthly calendar
  const monthGrid = useMemo(() => {
    const year = cursorDate.getFullYear();
    const month = cursorDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);

    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Mon=0..Sun=6
    const totalDays = lastOfMonth.getDate();
    const totalCells = Math.ceil((startOffset + totalDays) / 7) * 7;

    const cells: Array<{
      ymd: string;
      dayNum: number;
      inCurrentMonth: boolean;
      isWeekend: boolean;
    }> = [];

    for (let i = 0; i < totalCells; i++) {
      const d = new Date(year, month, 1 - startOffset + i);
      const weekdayIdx = (d.getDay() + 6) % 7;
      cells.push({
        ymd: toYmd(d),
        dayNum: d.getDate(),
        inCurrentMonth: d.getMonth() === month,
        isWeekend: weekdayIdx >= 5,
      });
    }
    return cells;
  }, [cursorDate]);

  // Count visible events in current week or month
  const visibleEventsCount = useMemo(() => {
    if (subView === "semana") {
      return weekDays.reduce((sum, wd) => sum + (eventsByDate.get(wd.ymd)?.length || 0), 0);
    }
    if (subView === "mes") {
      const prefix = `${cursorDate.getFullYear()}-${String(cursorDate.getMonth() + 1).padStart(2, "0")}`;
      let count = 0;
      for (const [dateStr, list] of eventsByDate.entries()) {
        if (dateStr.startsWith(prefix)) count += list.length;
      }
      return count;
    }
    return events.length;
  }, [subView, weekDays, cursorDate, eventsByDate, events.length]);

  const handleNavigate = (dir: -1 | 1) => {
    if (subView === "semana") {
      setCursorDate((prev) => addDays(prev, dir * 7));
    } else {
      setCursorDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + dir, 1));
    }
  };

  const handleJumpToNearestEvent = () => {
    if (events.length === 0) return;
    // Prefer upcoming/today event; fallback to most recent past event
    const upcoming = events.find((e) => e.fecha >= todayStr);
    const target = upcoming || events[events.length - 1];
    setCursorDate(parseYmd(target.fecha));
  };

  const handleAssignSalon = async (
    ev: CalendarClassroomEvent,
    newSalonValue: string,
  ) => {
    const clean = newSalonValue.trim() || null;
    setSavingKey(ev.key);
    setSaveError(null);
    try {
      const res = await updateOsiSalon({
        osiId: ev.osiId,
        nroSesion: ev.nroSesion,
        salon: clean,
      });
      if (!res.success) {
        setSaveError(res.error || "No se pudo actualizar el salón");
      } else {
        setSavedKey(ev.key);
        setTimeout(() => setSavedKey((cur) => (cur === ev.key ? null : cur)), 2000);
        await onSalonUpdated();
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSavingKey(null);
    }
  };

  const selectedDayEvents = useMemo(
    () => (selectedDayStr ? eventsByDate.get(selectedDayStr) || [] : []),
    [selectedDayStr, eventsByDate],
  );

  const selectedDayFreeRooms = useMemo(() => {
    if (!selectedDayStr) return [];
    const occupiedBuckets = new Set(selectedDayEvents.map((e) => e.bucketId));
    return ROOM_ROWS.filter(
      (r) => r.id !== "sin_asignar" && !occupiedBuckets.has(r.id),
    );
  }, [selectedDayStr, selectedDayEvents]);

  const periodLabel = useMemo(() => {
    if (subView === "semana") {
      const first = weekDays[0];
      const last = weekDays[6];
      if (first.monthShort === last.monthShort) {
        return `${first.dayNum}–${last.dayNum} ${MONTH_NAMES[first.date.getMonth()]} ${first.date.getFullYear()}`;
      }
      return `${first.dayNum} ${first.monthShort} – ${last.dayNum} ${last.monthShort} ${last.date.getFullYear()}`;
    }
    return `${MONTH_NAMES[cursorDate.getMonth()]} ${cursorDate.getFullYear()}`;
  }, [subView, weekDays, cursorDate]);

  return (
    <div className="p-5 space-y-5">
      {/* ─── Top Bar: View Switcher & Quick Status Alerts ──────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        {/* Sub-view switcher */}
        <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 self-start">
          <button
            onClick={() => setSubView("semana")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              subView === "semana"
                ? "bg-white text-purple-700 shadow-xs ring-1 ring-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Columns3 className="w-3.5 h-3.5" />
            Disponibilidad Semanal
          </button>

          <button
            onClick={() => setSubView("mes")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              subView === "mes"
                ? "bg-white text-purple-700 shadow-xs ring-1 ring-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            Calendario Mensual
          </button>

          <button
            onClick={() => setSubView("lista")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              subView === "lista"
                ? "bg-white text-purple-700 shadow-xs ring-1 ring-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Métricas y Lista ({allShaOsis.length})
          </button>
        </div>

        {/* Status pills & date navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {conflicts.length > 0 && (
            <button
              onClick={() => {
                setCursorDate(parseYmd(conflicts[0].fecha));
                setSelectedDayStr(conflicts[0].fecha);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition"
              title="Haz clic para revisar el conflicto más reciente"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              {conflicts.length} {conflicts.length === 1 ? "conflicto" : "conflictos"} de salón
            </button>
          )}

          {unassignedCount > 0 && (
            <button
              onClick={() => {
                const firstUnassigned = events.find((e) => e.bucketId === "sin_asignar");
                if (firstUnassigned) {
                  setCursorDate(parseYmd(firstUnassigned.fecha));
                  setSelectedDayStr(firstUnassigned.fecha);
                }
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition"
              title="Haz clic para asignar salón al curso pendiente"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              {unassignedCount} sin salón asignado
            </button>
          )}

          {subView !== "lista" && (
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1 ml-auto sm:ml-0">
              <button
                onClick={() => handleNavigate(-1)}
                className="p-1.5 rounded-md text-slate-600 hover:bg-white hover:text-slate-900 transition"
                title={subView === "semana" ? "Semana anterior" : "Mes anterior"}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCursorDate(new Date())}
                className="px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700 hover:bg-white transition"
              >
                Hoy
              </button>
              <span className="px-2 text-xs font-bold text-slate-900 min-w-[150px] text-center">
                {periodLabel}
              </span>
              <button
                onClick={() => handleNavigate(1)}
                className="p-1.5 rounded-md text-slate-600 hover:bg-white hover:text-slate-900 transition"
                title={subView === "semana" ? "Semana siguiente" : "Mes siguiente"}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── MONTHLY CLASSROOM OCCUPANCY COUNTER ───────────────────────── */}
      {subView !== "lista" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {monthlyOccupancy.rooms.map((room) => {
            const isUnassigned = room.id === "sin_asignar";
            if (isUnassigned && room.totalSessions === 0) return null;

            const targetVal = isUnassigned ? "sin_salon" : room.nombre;
            const isFiltered = selectedSalon === targetVal;
            const pct = Math.min(
              Math.round((room.occupiedDays / monthlyOccupancy.daysInMonth) * 100),
              100,
            );

            return (
              <button
                key={room.id}
                type="button"
                onClick={() => onSelectSalon(isFiltered ? "" : targetVal)}
                className={`text-left rounded-xl p-3 border transition-all ${
                  isFiltered
                    ? "bg-sky-50/70 border-sky-300 ring-2 ring-sky-400/30 shadow-xs"
                    : "bg-slate-50/60 border-slate-200 hover:bg-white hover:shadow-2xs"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${room.dotClass}`} />
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {room.shortNombre}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                    {monthlyOccupancy.monthLabel}
                  </span>
                </div>

                <div className="mt-2 flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-extrabold text-slate-900 tabular-nums">
                      {room.occupiedDays}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">
                      {room.occupiedDays === 1 ? "día ocupado" : "días ocupados"}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 tabular-nums">
                    {room.distinctCourses}{" "}
                    {room.distinctCourses === 1 ? "curso" : "cursos"}
                  </span>
                </div>

                {!isUnassigned && (
                  <div className="w-full bg-slate-200/80 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all ${room.dotClass}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty period helper */}
      {subView !== "lista" && visibleEventsCount === 0 && events.length > 0 && (
        <div className="bg-sky-50/80 border border-sky-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-sky-900">
            <CalendarIcon className="w-4 h-4 text-sky-600 shrink-0" />
            <span>
              No hay cursos programados en aulas SHA para{" "}
              <strong>{periodLabel}</strong> — todos los salones figuran disponibles.
            </span>
          </div>
          <button
            onClick={handleJumpToNearestEvent}
            className="px-3 py-1.5 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 transition self-start sm:self-auto shrink-0"
          >
            Ir al curso más cercano →
          </button>
        </div>
      )}

      {/* ─── SUB-VIEW 1: WEEKLY AVAILABILITY MATRIX ────────────────────── */}
      {subView === "semana" && (
        <div className="space-y-3">
          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Disponible
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                Salón Principal
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Salón Oriente
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                Salón Elite
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Conflicto de horario
              </span>
            </div>
            <span className="text-slate-400">
              Haz clic en cualquier día o curso para ver detalles o reasignar salón
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full min-w-[920px] border-collapse table-fixed">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90">
                  <th className="w-44 py-3 px-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 border-r border-slate-200">
                    Salón SHA
                  </th>
                  {weekDays.map((wd) => {
                    const isToday = wd.ymd === todayStr;
                    return (
                      <th
                        key={wd.ymd}
                        onClick={() => setSelectedDayStr(wd.ymd)}
                        className={`py-2.5 px-2 text-center border-r last:border-r-0 border-slate-200 cursor-pointer transition-colors hover:bg-sky-50/60 ${
                          isToday
                            ? "bg-sky-50/90"
                            : wd.isWeekend
                            ? "bg-slate-100/60"
                            : ""
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {wd.weekday}
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-0.5">
                          <span
                            className={`text-sm font-extrabold tabular-nums ${
                              isToday
                                ? "bg-sky-600 text-white px-2 py-0.5 rounded-full"
                                : "text-slate-800"
                            }`}
                          >
                            {wd.dayNum}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {wd.monthShort}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {ROOM_ROWS.map((room) => {
                  const isUnassignedRow = room.id === "sin_asignar";
                  // Show unassigned row if there are any unassigned events in the week OR overall
                  const hasWeekUnassigned =
                    isUnassignedRow &&
                    weekDays.some((wd) =>
                      (eventsByDate.get(wd.ymd) || []).some(
                        (e) => e.bucketId === "sin_asignar",
                      ),
                    );
                  if (isUnassignedRow && !hasWeekUnassigned && unassignedCount === 0) {
                    return null;
                  }

                  return (
                    <tr key={room.id} className="align-top">
                      {/* Room Header Cell */}
                      <td className={`p-3 border-r border-slate-200 ${room.headerBg}`}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${room.dotClass}`} />
                          <div>
                            <div className="text-xs font-bold leading-tight">
                              {room.shortNombre}
                            </div>
                            <div className="text-[10px] opacity-75 mt-0.5">
                              {isUnassignedRow ? "Requiere asignación" : "Sede Principal SHA"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Day Cells */}
                      {weekDays.map((wd) => {
                        const dayEvents = (eventsByDate.get(wd.ymd) || []).filter(
                          (e) => e.bucketId === room.id,
                        );
                        const isToday = wd.ymd === todayStr;
                        const distinctOsis = new Set(dayEvents.map((e) => e.osiId)).size;
                        const hasConflict = !isUnassignedRow && distinctOsis > 1;

                        return (
                          <td
                            key={wd.ymd}
                            onClick={() => setSelectedDayStr(wd.ymd)}
                            className={`p-1.5 border-r last:border-r-0 border-slate-200 min-h-[88px] cursor-pointer transition-colors ${
                              hasConflict
                                ? "bg-rose-50/70 hover:bg-rose-50"
                                : isToday
                                ? "bg-sky-50/30 hover:bg-sky-50/60"
                                : wd.isWeekend
                                ? "bg-slate-50/60 hover:bg-slate-100/60"
                                : "hover:bg-slate-50/80"
                            }`}
                          >
                            {dayEvents.length === 0 ? (
                              <div className="h-[72px] flex items-center justify-center">
                                {!isUnassignedRow && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-emerald-700 bg-emerald-50/80 border border-emerald-200/60">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Disponible
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {hasConflict && (
                                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                                    <AlertTriangle className="w-3 h-3 shrink-0" />
                                    Conflicto ({distinctOsis})
                                  </div>
                                )}
                                {dayEvents.map((ev) => {
                                  const timeStr = formatTimeRange(ev.horaInicio, ev.horaFin);
                                  return (
                                    <div
                                      key={ev.key}
                                      className={`rounded-lg p-2 border border-l-4 text-left shadow-2xs transition ${room.pillClass} ${room.accentBorder}`}
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-mono text-[10px] font-bold opacity-80">
                                          {ev.nroOsi}
                                        </span>
                                        {ev.ejecutada ? (
                                          <span title="Ejecutado" className="shrink-0">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                          </span>
                                        ) : (
                                          <span title="Programado" className="shrink-0">
                                            <Clock className="w-3 h-3 text-slate-500" />
                                          </span>
                                        )}
                                      </div>
                                      <div
                                        className="text-[11px] font-bold leading-snug line-clamp-2 mt-0.5"
                                        title={ev.servicio}
                                      >
                                        {ev.servicio}
                                      </div>
                                      <div
                                        className="text-[10px] opacity-80 truncate mt-0.5"
                                        title={ev.empresaNombre}
                                      >
                                        {ev.empresaNombre}
                                      </div>
                                      {(timeStr || ev.totalSesiones > 1) && (
                                        <div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-black/10 text-[9px] font-semibold opacity-75">
                                          <span>{timeStr || "Todo el día"}</span>
                                          {ev.totalSesiones > 1 && (
                                            <span>
                                              Ses. {ev.nroSesion}/{ev.totalSesiones}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── SUB-VIEW 2: MONTHLY CALENDAR ──────────────────────────────── */}
      {subView === "mes" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-slate-600">Indicador por día:</span>
              {ROOM_ROWS.filter((r) => r.id !== "sin_asignar").map((r) => (
                <span key={r.id} className="inline-flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${r.dotClass}`} />
                  {r.code} = {r.shortNombre}
                </span>
              ))}
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full border border-emerald-500 bg-emerald-100" />
                Libre
              </span>
            </div>
            <span className="text-slate-400">
              Haz clic en cualquier día para ver aulas libres y organizar salones
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
            {/* Weekday header */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {WEEKDAY_SHORT.map((wd, idx) => (
                <div
                  key={wd}
                  className={`py-2 text-center text-[11px] font-bold uppercase tracking-wider ${
                    idx >= 5 ? "text-slate-400 bg-slate-100/60" : "text-slate-600"
                  }`}
                >
                  {wd}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-200">
              {monthGrid.map((cell) => {
                const dayEvents = eventsByDate.get(cell.ymd) || [];
                const isToday = cell.ymd === todayStr;
                const occupiedSet = new Set(dayEvents.map((e) => e.bucketId));

                return (
                  <div
                    key={cell.ymd}
                    onClick={() => setSelectedDayStr(cell.ymd)}
                    className={`min-h-[112px] p-1.5 cursor-pointer transition-colors flex flex-col justify-between ${
                      !cell.inCurrentMonth
                        ? "bg-slate-50/70 text-slate-400"
                        : isToday
                        ? "bg-sky-50/50 hover:bg-sky-50"
                        : cell.isWeekend
                        ? "bg-slate-50/40 hover:bg-slate-100/70"
                        : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      {/* Day number + 3-room availability mini dots */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-bold tabular-nums ${
                            isToday
                              ? "bg-sky-600 text-white px-1.5 py-0.5 rounded-full"
                              : cell.inCurrentMonth
                              ? "text-slate-800"
                              : "text-slate-400"
                          }`}
                        >
                          {cell.dayNum}
                        </span>

                        {cell.inCurrentMonth && (
                          <div
                            className="flex items-center gap-0.5"
                            title="Disponibilidad: Salón Principal | Oriente | Elite"
                          >
                            {ROOM_ROWS.filter((r) => r.id !== "sin_asignar").map((r) => {
                              const isBusy = occupiedSet.has(r.id);
                              return (
                                <span
                                  key={r.id}
                                  className={`w-2 h-2 rounded-full ${
                                    isBusy
                                      ? r.dotClass
                                      : "border border-emerald-400 bg-emerald-50"
                                  }`}
                                  title={`${r.shortNombre}: ${isBusy ? "Ocupado" : "Disponible"}`}
                                />
                              );
                            })}
                            {occupiedSet.has("sin_asignar") && (
                              <span
                                className="w-2 h-2 rounded-full bg-amber-400 ring-1 ring-amber-600/40"
                                title="Curso en SHA sin salón asignado"
                              />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Event pills */}
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((ev) => {
                          const roomMeta =
                            ROOM_ROWS.find((r) => r.id === ev.bucketId) || ROOM_ROWS[3];
                          const isUnassigned = ev.bucketId === "sin_asignar";
                          return (
                            <div
                              key={ev.key}
                              className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold truncate flex items-center gap-1 ${
                                isUnassigned
                                  ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                                  : roomMeta.pillClass
                              }`}
                              title={`${roomMeta.shortNombre} • ${ev.nroOsi} • ${ev.servicio} (${ev.empresaNombre})`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  isUnassigned ? "bg-amber-500" : roomMeta.dotClass
                                }`}
                              />
                              <span className="truncate">
                                {isUnassigned ? `Sin salón · ${ev.servicio}` : ev.servicio}
                              </span>
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] font-bold text-purple-700 pl-1">
                            +{dayEvents.length - 3} más
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── SUB-VIEW 3: EXISTING METRICS CARDS & AUDIT TABLE ──────────── */}
      {subView === "lista" && (
        <div className="space-y-6">
          {/* Classroom Comparative Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {salonesSummary.map((s) => {
              const isUnassigned = s.id === "sin_asignar";
              const isFiltered =
                selectedSalon === s.nombre ||
                (isUnassigned && selectedSalon === "sin_salon");

              return (
                <div
                  key={s.id}
                  className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                    isFiltered
                      ? "bg-purple-50/50 border-purple-300 ring-2 ring-purple-400/40 shadow-md"
                      : "bg-white border-slate-200 hover:shadow-md"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-2 rounded-lg ${
                            isUnassigned
                              ? "bg-amber-100 text-amber-700"
                              : s.id === "salon-principal"
                              ? "bg-sky-100 text-sky-700"
                              : s.id === "salon-oriente"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          <Landmark className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{s.nombre}</h3>
                          <span className="text-[10px] text-slate-400 block font-medium">
                            {isUnassigned
                              ? "Instalaciones SHA — Pendiente"
                              : "Instalaciones SHA"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${
                          isUnassigned
                            ? "bg-amber-400"
                            : s.id === "salon-principal"
                            ? "bg-sky-600"
                            : s.id === "salon-oriente"
                            ? "bg-amber-500"
                            : "bg-purple-600"
                        }`}
                        style={{ width: `${Math.min(s.porcentajeUso, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                      <span>{s.porcentajeUso}% de cursos SHA</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Cursos
                        </span>
                        <span
                          className="text-base font-extrabold text-slate-900 tabular-nums"
                          suppressHydrationWarning
                        >
                          {formatNumber(s.totalCursos)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Clientes
                        </span>
                        <span
                          className="text-base font-extrabold text-sky-700 tabular-nums"
                          suppressHydrationWarning
                        >
                          {formatNumber(s.totalEmpresas)}
                        </span>
                      </div>
                    </div>

                    {s.temasTop.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Temas más dictados:
                        </span>
                        <div className="space-y-1">
                          {s.temasTop.map((tp, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-[11px]"
                            >
                              <span className="text-slate-700 truncate pr-2" title={tp.nombre}>
                                • {tp.nombre}
                              </span>
                              <span className="font-semibold text-sky-700 shrink-0 tabular-nums">
                                {tp.cursos} {tp.cursos === 1 ? "curso" : "cursos"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {s.empresasTop.length > 0 && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Principales Clientes:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {s.empresasTop.map((ep, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium truncate max-w-[160px]"
                              title={`${ep.nombre} (${ep.cursos} cursos)`}
                            >
                              {ep.nombre} ({ep.cursos})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        const targetVal = isUnassigned ? "sin_salon" : s.nombre;
                        onSelectSalon(selectedSalon === targetVal ? "" : targetVal);
                      }}
                      className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                        isFiltered
                          ? "bg-purple-600 text-white hover:bg-purple-700"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {isFiltered
                        ? "Quitar filtro de aula"
                        : `Filtrar cursos (${s.totalCursos})`}
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table of all OSIs in SHA classrooms */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Cursos Realizados en Instalaciones SHA ({allShaOsis.length})
                </h3>
              </div>
              {selectedSalon && (
                <span className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-md">
                  Filtro activo: {selectedSalon}
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              {allShaOsis.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <Landmark className="w-8 h-8 mx-auto mb-2 opacity-40 text-purple-400" />
                  <p className="text-xs font-medium">
                    No hay servicios registrados en instalaciones SHA para los filtros seleccionados.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] bg-slate-50">
                      <th className="py-2.5 px-3 font-semibold">Nro OSI</th>
                      <th className="py-2.5 px-3 font-semibold">Aula / Salón</th>
                      <th className="py-2.5 px-3 font-semibold">Fecha</th>
                      <th className="py-2.5 px-3 font-semibold">Curso / Tema</th>
                      <th className="py-2.5 px-3 font-semibold">Cliente / Empresa</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allShaOsis.map((osi) => (
                      <tr key={osi.idOsi} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-sky-700">
                          {osi.nroOsi}
                        </td>
                        <td className="py-2.5 px-3">
                          {osi.salon ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                              🏛️ {osi.salon}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                              ⚠️ Por confirmar
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 tabular-nums">
                          {osi.fechaFin || osi.fechaInicio || "—"}
                        </td>
                        <td
                          className="py-2.5 px-3 font-medium text-slate-900 max-w-xs truncate"
                          title={osi.servicio}
                        >
                          {osi.servicio}
                        </td>
                        <td
                          className="py-2.5 px-3 text-slate-700 truncate max-w-[220px]"
                          title={osi.empresaNombre}
                        >
                          {osi.empresaNombre}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => onPreviewOsi(osi.idOsi)}
                            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition"
                          >
                            Ver OSI
                            <ExternalLink className="w-2.5 h-2.5 ml-1" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── DAY AVAILABILITY & ORGANIZER MODAL ────────────────────────── */}
      {selectedDayStr && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto"
          onClick={() => setSelectedDayStr(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 uppercase tracking-wider">
                  <LayoutGrid className="w-3 h-3" />
                  Disponibilidad de Aulas SHA
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {formatReadableDate(selectedDayStr)}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedDayEvents.length === 0
                    ? "Todos los salones están libres este día."
                    : `${selectedDayEvents.length} ${
                        selectedDayEvents.length === 1 ? "curso programado" : "cursos programados"
                      } en instalaciones SHA`}
                </p>
              </div>
              <button
                onClick={() => setSelectedDayStr(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {saveError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-lg text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* Free Rooms Banner */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
                <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Salones Disponibles ({selectedDayFreeRooms.length}/3)
                </div>
                {selectedDayFreeRooms.length === 0 ? (
                  <p className="text-xs text-emerald-900/80">
                    Todos los salones tienen al menos un curso asignado en esta fecha.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedDayFreeRooms.map((r) => (
                      <span
                        key={r.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-emerald-800 border border-emerald-200 shadow-2xs"
                      >
                        <span className={`w-2 h-2 rounded-full ${r.dotClass}`} />
                        {r.nombre}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Scheduled Courses List with Quick Salón Reassignment */}
              {selectedDayEvents.length > 0 && (
                <div className="space-y-3">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Cursos en esta fecha (puedes cambiar o asignar salón)
                  </div>

                  {selectedDayEvents.map((ev) => {
                    const roomMeta =
                      ROOM_ROWS.find((r) => r.id === ev.bucketId) || ROOM_ROWS[3];
                    const timeStr = formatTimeRange(ev.horaInicio, ev.horaFin);
                    const isSaving = savingKey === ev.key;
                    const isSaved = savedKey === ev.key;

                    return (
                      <div
                        key={ev.key}
                        className={`rounded-xl border border-l-4 p-3.5 bg-white shadow-2xs ${roomMeta.accentBorder} border-slate-200`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                                {ev.nroOsi}
                              </span>
                              {ev.totalSesiones > 1 && (
                                <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                  Sesión {ev.nroSesion} de {ev.totalSesiones}
                                </span>
                              )}
                              {ev.ejecutada ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Ejecutado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                                  <Clock className="w-3 h-3" />
                                  Programado
                                </span>
                              )}
                            </div>

                            <h4 className="text-sm font-bold text-slate-900">
                              {ev.servicio}
                            </h4>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                              <span className="inline-flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                {ev.empresaNombre}
                              </span>
                              {timeStr && (
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  {timeStr}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick-assign Salón & Preview */}
                          <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
                            <div className="flex items-center gap-1.5">
                              <select
                                value={ev.bucketId === "sin_asignar" ? "" : roomMeta.nombre}
                                disabled={isSaving}
                                onChange={(e) => handleAssignSalon(ev, e.target.value)}
                                className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
                              >
                                <option value="">⚠️ Sin asignar</option>
                                {SALONES_SHA_CONFIG.map((cfg) => (
                                  <option key={cfg.id} value={cfg.nombre}>
                                    🏛️ {cfg.nombre}
                                  </option>
                                ))}
                              </select>
                              {isSaving && (
                                <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                              )}
                              {isSaved && !isSaving && (
                                <Check className="w-4 h-4 text-emerald-600" />
                              )}
                            </div>

                            <button
                              onClick={() => onPreviewOsi(ev.osiId)}
                              className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition"
                            >
                              Ver detalle OSI
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedDayStr(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
