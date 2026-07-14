"use server";

import { createClient } from "@/utils/supabase/server";
import {
  OverviewMetrics,
  CursoReportItem,
  FacilitadoresReportData,
  EmpresaReportItem,
  TendenciasData,
} from "@/types";

// ─── Overview ────────────────────────────────────────────────────────────────

export async function getOverviewMetrics(
  dateFrom?: string,
  dateTo?: string,
): Promise<{ data: OverviewMetrics | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let query = supabase
      .from("certificados")
      .select(
        `id, is_active, fecha_emision, calificacion,
         id_curso, id_facilitador, id_participante, id_empresa,
         cursos(id, nombre, horas_estimadas),
         facilitadores(id, nombre_apellido),
         empresas(id, razon_social)`,
      )
      .limit(5000);

    if (dateFrom) query = query.gte("fecha_emision", dateFrom);
    if (dateTo) query = query.lte("fecha_emision", dateTo);

    const { data: certs, error } = await query;
    if (error) return { error: error.message, data: null };

    const empty: OverviewMetrics = {
      totalCertificates: 0,
      activeCertificates: 0,
      certificatesThisMonth: 0,
      certificatesThisYear: 0,
      averageScore: 0,
      totalHoursDelivered: 0,
      uniqueParticipants: 0,
      uniqueFacilitators: 0,
      uniqueCourses: 0,
      uniqueCompanies: 0,
      topCourses: [],
      topCompanies: [],
      monthlyTrend: [],
    };

    if (!certs || certs.length === 0) return { data: empty, error: null };

    let activeCerts = 0;
    let certsThisMonth = 0;
    let certsThisYear = 0;
    let totalScore = 0;
    let scoreCount = 0;
    let totalHours = 0;

    const uniqueParticipants = new Set<number>();
    const uniqueFacilitators = new Set<number>();
    const uniqueCourses = new Set<number>();
    const uniqueCompanies = new Set<number>();

    const courseMap = new Map<
      number,
      { name: string; count: number; totalScore: number; scoreCount: number }
    >();
    const companyMap = new Map<number, { name: string; count: number }>();
    const monthMap = new Map<string, number>();

    certs.forEach((cert: any) => {
      if (cert.is_active) activeCerts++;

      if (cert.calificacion != null) {
        totalScore += cert.calificacion;
        scoreCount++;
      }

      totalHours += cert.cursos?.horas_estimadas || 0;

      if (cert.fecha_emision) {
        const d = new Date(cert.fecha_emision + "T12:00:00");
        if (
          d.getMonth() === currentMonth &&
          d.getFullYear() === currentYear
        )
          certsThisMonth++;
        if (d.getFullYear() === currentYear) certsThisYear++;
        const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthMap.set(mk, (monthMap.get(mk) || 0) + 1);
      }

      if (cert.id_participante) uniqueParticipants.add(cert.id_participante);
      if (cert.id_facilitador) uniqueFacilitators.add(cert.id_facilitador);

      if (cert.id_curso) {
        uniqueCourses.add(cert.id_curso);
        if (!courseMap.has(cert.id_curso)) {
          courseMap.set(cert.id_curso, {
            name: cert.cursos?.nombre || "Desconocido",
            count: 0,
            totalScore: 0,
            scoreCount: 0,
          });
        }
        const c = courseMap.get(cert.id_curso)!;
        c.count++;
        if (cert.calificacion != null) {
          c.totalScore += cert.calificacion;
          c.scoreCount++;
        }
      }

      if (cert.id_empresa) {
        uniqueCompanies.add(cert.id_empresa);
        if (!companyMap.has(cert.id_empresa)) {
          companyMap.set(cert.id_empresa, {
            name: cert.empresas?.razon_social || "Desconocido",
            count: 0,
          });
        }
        companyMap.get(cert.id_empresa)!.count++;
      }
    });

    const monthlyTrend = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const lbl = d.toLocaleDateString("es-ES", {
        month: "short",
        year: "2-digit",
      });
      monthlyTrend.push({ key: mk, label: lbl, count: monthMap.get(mk) || 0 });
    }

    const topCourses = Array.from(courseMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((c) => ({
        name: c.name,
        count: c.count,
        avgScore:
          c.scoreCount > 0
            ? parseFloat((c.totalScore / c.scoreCount).toFixed(1))
            : 0,
      }));

    const topCompanies = Array.from(companyMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((c) => ({ name: c.name, count: c.count }));

    return {
      data: {
        totalCertificates: certs.length,
        activeCertificates: activeCerts,
        certificatesThisMonth: certsThisMonth,
        certificatesThisYear: certsThisYear,
        averageScore:
          scoreCount > 0
            ? parseFloat((totalScore / scoreCount).toFixed(1))
            : 0,
        totalHoursDelivered: totalHours,
        uniqueParticipants: uniqueParticipants.size,
        uniqueFacilitators: uniqueFacilitators.size,
        uniqueCourses: uniqueCourses.size,
        uniqueCompanies: uniqueCompanies.size,
        topCourses,
        topCompanies,
        monthlyTrend,
      },
      error: null,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Error desconocido",
      data: null,
    };
  }
}

// ─── Cursos ───────────────────────────────────────────────────────────────────

export async function getCursosReport(
  dateFrom?: string,
  dateTo?: string,
  stateId?: string,
): Promise<{ data: CursoReportItem[]; error: string | null }> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from("certificados")
      .select(
        `id, fecha_emision, calificacion, id_curso, id_facilitador, id_estado,
         cursos(id, nombre, horas_estimadas),
         facilitadores(id, nombre_apellido)`,
      )
      .not("id_curso", "is", null)
      .limit(5000);

    if (dateFrom) query = query.gte("fecha_emision", dateFrom);
    if (dateTo) query = query.lte("fecha_emision", dateTo);
    if (stateId) query = query.eq("id_estado", stateId);

    const { data: certs, error } = await query;
    if (error) return { error: error.message, data: [] };

    const courseMap = new Map<
      number,
      {
        id: number;
        nombre: string;
        horas_estimadas: number;
        totalCerts: number;
        totalScore: number;
        scoreCount: number;
        facilitadores: Map<number, { id: number; nombre: string; certs: number }>;
        lastActivity: string | null;
      }
    >();

    certs?.forEach((cert: any) => {
      const cid = cert.id_curso;
      if (!cid) return;

      if (!courseMap.has(cid)) {
        courseMap.set(cid, {
          id: cid,
          nombre: cert.cursos?.nombre || "Desconocido",
          horas_estimadas: cert.cursos?.horas_estimadas || 0,
          totalCerts: 0,
          totalScore: 0,
          scoreCount: 0,
          facilitadores: new Map(),
          lastActivity: null,
        });
      }

      const course = courseMap.get(cid)!;
      course.totalCerts++;
      if (cert.calificacion != null) {
        course.totalScore += cert.calificacion;
        course.scoreCount++;
      }
      if (
        cert.fecha_emision &&
        (!course.lastActivity || cert.fecha_emision > course.lastActivity)
      ) {
        course.lastActivity = cert.fecha_emision;
      }
      if (cert.id_facilitador && cert.facilitadores) {
        if (!course.facilitadores.has(cert.id_facilitador)) {
          course.facilitadores.set(cert.id_facilitador, {
            id: cert.id_facilitador,
            nombre: cert.facilitadores.nombre_apellido || "Desconocido",
            certs: 0,
          });
        }
        course.facilitadores.get(cert.id_facilitador)!.certs++;
      }
    });

    const result = Array.from(courseMap.values())
      .map((c) => ({
        id: c.id,
        nombre: c.nombre,
        totalCertificates: c.totalCerts,
        avgScore:
          c.scoreCount > 0
            ? parseFloat((c.totalScore / c.scoreCount).toFixed(1))
            : 0,
        totalHours: c.horas_estimadas * c.totalCerts,
        facilitadoresCount: c.facilitadores.size,
        facilitadores: Array.from(c.facilitadores.values()).sort(
          (a, b) => b.certs - a.certs,
        ),
        lastActivity: c.lastActivity,
      }))
      .sort((a, b) => b.totalCertificates - a.totalCertificates);

    return { data: result, error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Error desconocido",
      data: [],
    };
  }
}

// ─── Facilitadores ────────────────────────────────────────────────────────────

export async function getFacilitadoresReport(
  dateFrom?: string,
  dateTo?: string,
  stateId?: string,
): Promise<{ data: FacilitadoresReportData | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const [facilitadoresRes, certsRes, statesRes] = await Promise.all([
      supabase
        .from("facilitadores")
        .select(
          "id, nombre_apellido, id_estado_geografico, is_active, cedula, email",
        )
        .order("nombre_apellido"),

      (async () => {
        let q = supabase
          .from("certificados")
          .select(
            `id_facilitador, fecha_emision, calificacion, id_curso, cursos(horas_estimadas)`,
          )
          .not("id_facilitador", "is", null)
          .limit(5000);
        if (dateFrom) q = q.gte("fecha_emision", dateFrom);
        if (dateTo) q = q.lte("fecha_emision", dateTo);
        return q;
      })(),

      supabase
        .from("cat_estados_venezuela")
        .select("id, nombre_estado")
        .order("nombre_estado"),
    ]);

    if (certsRes.error) return { error: certsRes.error.message, data: null };

    const stateNames = new Map<number, string>();
    statesRes.data?.forEach((s: any) => stateNames.set(s.id, s.nombre_estado));

    const certStats = new Map<
      number,
      {
        totalCerts: number;
        totalScore: number;
        scoreCount: number;
        totalHours: number;
        uniqueCourses: Set<number>;
        lastActivity: string | null;
      }
    >();

    certsRes.data?.forEach((cert: any) => {
      const fid = cert.id_facilitador;
      if (!certStats.has(fid)) {
        certStats.set(fid, {
          totalCerts: 0,
          totalScore: 0,
          scoreCount: 0,
          totalHours: 0,
          uniqueCourses: new Set(),
          lastActivity: null,
        });
      }
      const s = certStats.get(fid)!;
      s.totalCerts++;
      if (cert.calificacion != null) {
        s.totalScore += cert.calificacion;
        s.scoreCount++;
      }
      s.totalHours += cert.cursos?.horas_estimadas || 0;
      if (cert.id_curso) s.uniqueCourses.add(cert.id_curso);
      if (
        cert.fecha_emision &&
        (!s.lastActivity || cert.fecha_emision > s.lastActivity)
      ) {
        s.lastActivity = cert.fecha_emision;
      }
    });

    let facilitadoresList = (facilitadoresRes.data || [])
      .map((f) => {
        const s = certStats.get(f.id);
        return {
          id: f.id,
          nombre_apellido: f.nombre_apellido,
          is_active: f.is_active,
          estado_nombre:
            stateNames.get(f.id_estado_geografico) || "No definido",
          cedula: f.cedula,
          email: f.email,
          totalCerts: s?.totalCerts || 0,
          totalHours: s?.totalHours || 0,
          uniqueCourses: s?.uniqueCourses.size || 0,
          avgScore:
            s && s.scoreCount > 0
              ? parseFloat((s.totalScore / s.scoreCount).toFixed(1))
              : 0,
          lastActivity: s?.lastActivity || null,
        };
      })
      .filter((f) => f.totalCerts > 0);

    if (stateId) {
      facilitadoresList = facilitadoresList.filter((f) => {
        const sid = facilitadoresRes.data?.find(
          (r) => r.id === f.id,
        )?.id_estado_geografico;
        return sid?.toString() === stateId;
      });
    }

    facilitadoresList.sort((a, b) => b.totalCerts - a.totalCerts);

    const stateDistMap = new Map<string, number>();
    facilitadoresList.forEach((f) => {
      stateDistMap.set(
        f.estado_nombre,
        (stateDistMap.get(f.estado_nombre) || 0) + 1,
      );
    });

    const stateStats = Array.from(stateDistMap.entries())
      .map(([nombre, count]) => ({ nombre, count }))
      .sort((a, b) => b.count - a.count);

    return {
      data: { facilitadores: facilitadoresList, stateStats },
      error: null,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Error desconocido",
      data: null,
    };
  }
}

// ─── Empresas ─────────────────────────────────────────────────────────────────

export async function getEmpresasReport(
  dateFrom?: string,
  dateTo?: string,
  stateId?: string,
): Promise<{ data: EmpresaReportItem[]; error: string | null }> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from("certificados")
      .select(
        `id, fecha_emision, id_empresa, id_participante, id_curso, id_estado,
         empresas(id, razon_social, rif)`,
      )
      .not("id_empresa", "is", null)
      .limit(5000);

    if (dateFrom) query = query.gte("fecha_emision", dateFrom);
    if (dateTo) query = query.lte("fecha_emision", dateTo);
    if (stateId) query = query.eq("id_estado", stateId);

    const { data: certs, error } = await query;
    if (error) return { error: error.message, data: [] };

    const companyMap = new Map<
      number,
      {
        id: number;
        razon_social: string;
        rif: string;
        totalCerts: number;
        uniqueParticipants: Set<number>;
        uniqueCourses: Set<number>;
        lastActivity: string | null;
        firstActivity: string | null;
      }
    >();

    certs?.forEach((cert: any) => {
      const cid = cert.id_empresa;
      if (!cid || !cert.empresas) return;

      if (!companyMap.has(cid)) {
        companyMap.set(cid, {
          id: cid,
          razon_social: cert.empresas.razon_social || "Desconocido",
          rif: cert.empresas.rif || "N/A",
          totalCerts: 0,
          uniqueParticipants: new Set(),
          uniqueCourses: new Set(),
          lastActivity: null,
          firstActivity: null,
        });
      }
      const co = companyMap.get(cid)!;
      co.totalCerts++;
      if (cert.id_participante) co.uniqueParticipants.add(cert.id_participante);
      if (cert.id_curso) co.uniqueCourses.add(cert.id_curso);
      if (cert.fecha_emision) {
        if (!co.lastActivity || cert.fecha_emision > co.lastActivity)
          co.lastActivity = cert.fecha_emision;
        if (!co.firstActivity || cert.fecha_emision < co.firstActivity)
          co.firstActivity = cert.fecha_emision;
      }
    });

    const result = Array.from(companyMap.values())
      .map((c) => ({
        id: c.id,
        razon_social: c.razon_social,
        rif: c.rif,
        totalCerts: c.totalCerts,
        uniqueParticipants: c.uniqueParticipants.size,
        uniqueCourses: c.uniqueCourses.size,
        lastActivity: c.lastActivity,
        firstActivity: c.firstActivity,
      }))
      .sort((a, b) => b.totalCerts - a.totalCerts);

    return { data: result, error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Error desconocido",
      data: [],
    };
  }
}

// ─── Tendencias ───────────────────────────────────────────────────────────────

export async function getTendenciasReport(): Promise<{
  data: TendenciasData | null;
  error: string | null;
}> {
  const supabase = await createClient();
  try {
    const [certsRes, statesRes] = await Promise.all([
      supabase
        .from("certificados")
        .select("id, fecha_emision, id_estado")
        .not("fecha_emision", "is", null)
        .order("fecha_emision", { ascending: true })
        .limit(10000),

      supabase
        .from("cat_estados_venezuela")
        .select("id, nombre_estado"),
    ]);

    if (certsRes.error) return { error: certsRes.error.message, data: null };

    const stateNames = new Map<number, string>();
    statesRes.data?.forEach((s: any) => stateNames.set(s.id, s.nombre_estado));

    const monthMap = new Map<string, number>();
    const stateMap = new Map<string, number>();

    certsRes.data?.forEach((cert: any) => {
      const d = new Date(cert.fecha_emision + "T12:00:00");
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap.set(mk, (monthMap.get(mk) || 0) + 1);

      if (cert.id_estado) {
        const name = stateNames.get(cert.id_estado) || "No definido";
        stateMap.set(name, (stateMap.get(name) || 0) + 1);
      }
    });

    const now = new Date();
    const monthlyData = [];
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyData.push({
        key: mk,
        label: d.toLocaleDateString("es-ES", { month: "short" }),
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        count: monthMap.get(mk) || 0,
      });
    }

    const yearMap = new Map<number, number>();
    monthlyData.forEach((m) =>
      yearMap.set(m.year, (yearMap.get(m.year) || 0) + m.count),
    );
    const yearlyTotals = Array.from(yearMap.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year);

    const stateDistribution = Array.from(stateMap.entries())
      .map(([nombre, count]) => ({ nombre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { data: { monthlyData, yearlyTotals, stateDistribution }, error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Error desconocido",
      data: null,
    };
  }
}
