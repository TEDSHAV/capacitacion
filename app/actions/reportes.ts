"use server";

import { createClient } from "@/utils/supabase/server";
import {
  OverviewMetrics,
  CursoReportItem,
  FacilitadoresReportData,
  EmpresaReportItem,
  TendenciasData,
  CarnetsMetrics,
  MonthlyCarnetData,
} from "@/types";

// Helper function to check for data truncation
function checkTruncation(data: any[] | null, limit: number): { isTruncated: boolean; message?: string } {
  if (data && data.length >= limit) {
    return {
      isTruncated: true,
      message: `Advertencia: Los resultados están truncados a ${limit} filas. Algunos datos pueden no mostrarse.`
    };
  }
  return { isTruncated: false };
}

// Helper function to calculate hours with consistent fallback logic
function calculateHoursForCertificate(
  cert: any,
  osiData: any,
  serviciosMap: Map<number, any>
): number {
  // First try to get hours from certificate snapshot (user overrides)
  if (cert.snapshot_contenido) {
    try {
      const snapshot = JSON.parse(cert.snapshot_contenido);
      const hours = snapshot.certificado_detalles?.horas_estimadas || 0;
      if (hours > 0) return hours;
    } catch (e) {
      // Snapshot parsing failed, continue with fallback
    }
  }
  
  // If no hours from snapshot, try OSI executed hours
  if (osiData && osiData.horas_academicas_ejecucion) {
    return osiData.horas_academicas_ejecucion;
  }
  
  // Final fallback to course standard hours
  const servicio = serviciosMap.get(cert.id_curso);
  return servicio?.carga_horaria_std || 0;
}

// SurveySummary interface (defined inline since it's only used here)
interface SurveySummary {
  id_osi: number;
  nro_osi: string;
  nombre_empresa: string;
  servicio: string;
  direccion_ejecucion: string;
  fecha_inicio_real: string;
  survey_count: number;
  avg_score: number;
  // New fields for richer analytics
  question_averages: { [key: string]: number };
  question_distributions: { [key: string]: { [score: number]: number } };
  attendance_reasons: { [reason: string]: number };
  participant_count?: number;
  response_rate?: number;
}

// ─── Overview ────────────────────────────────────────────────────────────────

export async function getOverviewMetrics(
  dateFrom?: string,
  dateTo?: string,
  stateId?: string,
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
         id_curso, id_facilitador, id_participante, id_empresa, id_estado, nro_osi,
         facilitadores(id, nombre_apellido),
         empresas(id, razon_social)`,
      )
      .limit(5000);

    if (dateFrom) query = query.gte("fecha_emision", dateFrom);
    if (dateTo) query = query.lte("fecha_emision", dateTo);
    if (stateId) query = query.eq("id_estado", stateId);

    const [{ data: certs, error }, { data: servicios }, { data: osiData }, { data: carnets }] = await Promise.all([
      query,
      supabase
        .from("catalogo_servicios")
        .select("id, nombre, carga_horaria_std"),
      supabase
        .from("v_osi_formato_completo")
        .select("id_osi, nro_osi, horas_academicas_ejecucion")
        .limit(5000),
      supabase
        .from("carnets")
        .select("id, is_active, fecha_emision, fecha_vencimiento, id_certificado, created_at")
        .limit(5000),
    ]);

    if (error) return { error: error.message, data: null };

    // Check for truncation
    const truncationWarning = checkTruncation(certs, 5000);

    // Create a map of servicios for quick lookup
    const serviciosMap = new Map((servicios || []).map((s: any) => [s.id, s]));

    // Create OSI map for hours deduplication
    const osiMap = new Map(
      (osiData || []).map((osi: any) => [osi.nro_osi?.toString(), osi]),
    );

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
      totalCoursesTaught: 0,
      topCourses: [],
      topCompanies: [],
      monthlyTrend: [],
      // Carnets metrics
      totalCarnets: 0,
      activeCarnets: 0,
      expiringSoonCarnets: 0,
      expiredCarnets: 0,
      carnetsThisMonth: 0,
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
      { name: string; count: number; totalScore: number; scoreCount: number; courseCount: number }
    >();
    const companyMap = new Map<number, { name: string; count: number; courseCount: number }>();
    const monthMap = new Map<string, number>();
    const courseTopicOSIs = new Map<number, Set<string>>(); // Track unique OSIs per course topic
    const companyOSIs = new Map<number, Set<string>>(); // Track unique OSIs per company
    const monthlyOSIs = new Map<string, Set<string>>(); // Track unique OSIs per month

    // Track processed OSIs to avoid double-counting hours
    const processedOSIs = new Set<string>();

    certs.forEach((cert: any) => {
      if (cert.is_active) activeCerts++;

      if (cert.calificacion != null) {
        totalScore += cert.calificacion;
        scoreCount++;
      }

      // Use OSI deduplication for hours calculation (consistent with FacilitadoresReport)
      const osiId = cert.nro_osi?.toString();
      if (!processedOSIs.has(osiId)) {
        processedOSIs.add(osiId);
        const osiData = osiMap.get(osiId);
        const hours = calculateHoursForCertificate(cert, osiData, serviciosMap);
        totalHours += hours || 0;
      }

      if (cert.fecha_emision) {
        const d = new Date(cert.fecha_emision + "T12:00:00");
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear)
          certsThisMonth++;
        if (d.getFullYear() === currentYear) certsThisYear++;
        const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthMap.set(mk, (monthMap.get(mk) || 0) + 1);
        
        // Track unique OSIs per month to count actual courses
        if (cert.nro_osi) {
          if (!monthlyOSIs.has(mk)) {
            monthlyOSIs.set(mk, new Set());
          }
          monthlyOSIs.get(mk)!.add(cert.nro_osi.toString());
        }
      }

      if (cert.id_participante) uniqueParticipants.add(cert.id_participante);
      if (cert.id_facilitador) uniqueFacilitators.add(cert.id_facilitador);

      if (cert.id_curso) {
        uniqueCourses.add(cert.id_curso);
        if (!courseMap.has(cert.id_curso)) {
          const servicio = serviciosMap.get(cert.id_curso);
          courseMap.set(cert.id_curso, {
            name: servicio?.nombre || "Desconocido",
            count: 0,
            totalScore: 0,
            scoreCount: 0,
            courseCount: 0,
          });
        }
        const c = courseMap.get(cert.id_curso)!;
        c.count++;
        // Track unique OSIs per course topic to count actual courses
        if (cert.nro_osi) {
          if (!courseTopicOSIs.has(cert.id_curso)) {
            courseTopicOSIs.set(cert.id_curso, new Set());
          }
          courseTopicOSIs.get(cert.id_curso)!.add(cert.nro_osi.toString());
        }
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
            courseCount: 0,
          });
        }
        const company = companyMap.get(cert.id_empresa)!;
        company.count++;
        
        // Track unique OSIs per company to count actual courses
        if (cert.nro_osi) {
          if (!companyOSIs.has(cert.id_empresa)) {
            companyOSIs.set(cert.id_empresa, new Set());
          }
          companyOSIs.get(cert.id_empresa)!.add(cert.nro_osi.toString());
        }
      }
    });

    const monthlyTrend = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const lbl = d.toLocaleDateString("es-VE", {
        month: "short",
        year: "2-digit",
      });
      monthlyTrend.push({ 
        key: mk, 
        label: lbl, 
        count: monthMap.get(mk) || 0,
        courseCount: monthlyOSIs.get(mk)?.size || 0
      });
    }

    const topCourses = Array.from(courseMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([courseTopicId, c]) => ({
        name: c.name,
        count: c.count,
        avgScore:
          c.scoreCount > 0
            ? parseFloat((c.totalScore / c.scoreCount).toFixed(1))
            : 0,
        courseCount: courseTopicOSIs.get(courseTopicId)?.size || 0,
      }));

    const topCompanies = Array.from(companyMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([companyId, c]) => ({
        name: c.name,
        count: c.count,
        courseCount: companyOSIs.get(companyId)?.size || 0,
      }));

    // Calculate total courses taught (unique OSIs across all course topics)
    const totalCoursesTaught = Array.from(courseTopicOSIs.values())
      .reduce((total, osiSet) => total + osiSet.size, 0);

    // Calculate carnet metrics
    const totalCarnets = carnets?.length || 0;
    const activeCarnets = carnets?.filter(c => c.is_active).length || 0;
    
    // Calculate expiration metrics
    const currentDate = new Date();
    const thirtyDaysFromNow = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const expiringSoonCarnets = carnets?.filter(c => 
      c.fecha_vencimiento && 
      new Date(c.fecha_vencimiento) <= thirtyDaysFromNow &&
      new Date(c.fecha_vencimiento) > currentDate
    ).length || 0;

    const expiredCarnets = carnets?.filter(c => 
      c.fecha_vencimiento && 
      new Date(c.fecha_vencimiento) <= currentDate
    ).length || 0;

    // Calculate carnets this month
    const carnetsThisMonth = carnets?.filter(c => {
      const carnetDate = new Date(c.fecha_emision);
      return carnetDate.getMonth() === currentMonth && carnetDate.getFullYear() === currentYear;
    }).length || 0;

    return {
      data: {
        totalCertificates: certs.length,
        activeCertificates: activeCerts,
        certificatesThisMonth: certsThisMonth,
        certificatesThisYear: certsThisYear,
        averageScore:
          scoreCount > 0 ? parseFloat((totalScore / scoreCount).toFixed(1)) : 0,
        totalHoursDelivered: totalHours,
        uniqueParticipants: uniqueParticipants.size,
        uniqueFacilitators: uniqueFacilitators.size,
        uniqueCourses: uniqueCourses.size,
        uniqueCompanies: uniqueCompanies.size,
        totalCoursesTaught,
        topCourses,
        topCompanies,
        monthlyTrend,
        // Carnets metrics
        totalCarnets,
        activeCarnets,
        expiringSoonCarnets,
        expiredCarnets,
        carnetsThisMonth,
      },
      error: truncationWarning.isTruncated ? (truncationWarning.message || null) : null,
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
        `id, fecha_emision, calificacion, id_curso, id_facilitador, id_estado, nro_osi,
         facilitadores(id, nombre_apellido)`,
      )
      .not("id_curso", "is", null)
      .limit(5000);

    if (dateFrom) query = query.gte("fecha_emision", dateFrom);
    if (dateTo) query = query.lte("fecha_emision", dateTo);
    if (stateId) query = query.eq("id_estado", stateId);

    const [{ data: certs, error }, { data: servicios }, { data: osiData }] = await Promise.all([
      query,
      supabase
        .from("catalogo_servicios")
        .select("id, nombre, carga_horaria_std"),
      supabase
        .from("v_osi_formato_completo")
        .select("id_osi, nro_osi, horas_academicas_ejecucion")
        .limit(5000),
    ]);

    if (error) return { error: error.message, data: [] };

    // Check for truncation
    const truncationWarning = checkTruncation(certs, 5000);

    // Create a map of servicios for quick lookup
    const serviciosMap = new Map((servicios || []).map((s: any) => [s.id, s]));

    // Create OSI map for hours deduplication
    const osiMap = new Map(
      (osiData || []).map((osi: any) => [osi.nro_osi?.toString(), osi]),
    );

    // Use global OSI deduplication (consistent with Vista General)
    const processedOSIs = new Set<string>();
    const courseTopicOSIs = new Map<number, Set<string>>(); // Track unique OSIs per course topic
    const facilitadorOSIs = new Map<string, Set<string>>(); // Track unique OSIs per facilitador

    const courseMap = new Map<
      number,
      {
        id: number;
        nombre: string;
        horas_estimadas: number;
        totalCerts: number;
        totalScore: number;
        scoreCount: number;
        totalHours: number;
        facilitadores: Map<
          number,
          { id: number; nombre: string; certs: number; courseCount: number }
        >;
        lastActivity: string | null;
      }
    >();

    certs?.forEach((cert: any) => {
      const cid = cert.id_curso;
      if (!cid) return;

      if (!courseMap.has(cid)) {
        const servicio = serviciosMap.get(cid);
        courseMap.set(cid, {
          id: cid,
          nombre: servicio?.nombre || "Desconocido",
          horas_estimadas: servicio?.carga_horaria_std || 0,
          totalCerts: 0,
          totalScore: 0,
          scoreCount: 0,
          totalHours: 0,
          facilitadores: new Map(),
          lastActivity: null,
        });
      }

      const course = courseMap.get(cid)!;
      course.totalCerts++;
      
      // Track unique OSIs per course topic to count actual courses
      if (cert.nro_osi) {
        if (!courseTopicOSIs.has(cid)) {
          courseTopicOSIs.set(cid, new Set());
        }
        courseTopicOSIs.get(cid)!.add(cert.nro_osi.toString());
      }
      
      // Use global OSI deduplication for hours calculation (consistent with Vista General)
      const osiId = cert.nro_osi?.toString();
      if (osiId && !processedOSIs.has(osiId)) {
        processedOSIs.add(osiId);
        const osiData = osiMap.get(osiId);
        const hours = calculateHoursForCertificate(cert, osiData, serviciosMap);
        course.totalHours += hours || 0;
      }
      
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
            courseCount: 0,
          });
        }
        course.facilitadores.get(cert.id_facilitador)!.certs++;
        
        // Track unique OSIs per facilitador to count actual courses
        if (cert.nro_osi) {
          const facilitadorKey = `${cid}-${cert.id_facilitador}`;
          if (!facilitadorOSIs.has(facilitadorKey)) {
            facilitadorOSIs.set(facilitadorKey, new Set());
          }
          facilitadorOSIs.get(facilitadorKey)!.add(cert.nro_osi.toString());
        }
      }
    });

    const result = Array.from(courseMap.entries())
      .map(([courseTopicId, c]) => ({
        id: c.id,
        nombre: c.nombre,
        totalCertificates: c.totalCerts,
        avgScore:
          c.scoreCount > 0
            ? parseFloat((c.totalScore / c.scoreCount).toFixed(1))
            : 0,
        totalHours: c.totalHours,
        facilitadoresCount: c.facilitadores.size,
        facilitadores: Array.from(c.facilitadores.entries()).map(([facilitadorId, f]) => ({
          ...f,
          courseCount: facilitadorOSIs.get(`${courseTopicId}-${facilitadorId}`)?.size || 0,
        })).sort(
          (a, b) => b.certs - a.certs,
        ),
        lastActivity: c.lastActivity,
        courseCount: courseTopicOSIs.get(courseTopicId)?.size || 0,
      }))
      .sort((a, b) => b.totalCertificates - a.totalCertificates);

    return { data: result, error: truncationWarning.isTruncated ? (truncationWarning.message || null) : null };
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
    let facilitadoresQuery = supabase
      .from("facilitadores")
      .select(
        "id, nombre_apellido, id_estado_geografico, is_active, cedula, email",
      )
      .order("nombre_apellido");
    if (stateId)
      facilitadoresQuery = facilitadoresQuery.eq(
        "id_estado_geografico",
        stateId,
      );

    const [facilitadoresRes, certsRes, osiRes, statesRes, serviciosRes] =
      await Promise.all([
        facilitadoresQuery,

        (async () => {
          let q = supabase
            .from("certificados")
            .select(`id_facilitador, fecha_emision, calificacion, id_curso, nro_osi, snapshot_contenido`)
            .not("id_facilitador", "is", null)
            .not("nro_osi", "is", null)
            .limit(5000);
          if (dateFrom) q = q.gte("fecha_emision", dateFrom);
          if (dateTo) q = q.lte("fecha_emision", dateTo);
          return q;
        })(),

        (async () => {
          let q = supabase
            .from("v_osi_formato_completo")
            .select(`id_osi, nro_osi, horas_academicas_ejecucion, sesiones_ejecucion, id_estatus`)
            .not("id_osi", "is", null)
            .limit(5000);
          return q;
        })(),

        supabase
          .from("cat_estados_venezuela")
          .select("id, nombre_estado")
          .order("nombre_estado"),

        supabase.from("catalogo_servicios").select("id, nombre, carga_horaria_std"),
      ]);

    if (certsRes.error) return { error: certsRes.error.message, data: null };
    if (osiRes.error) return { error: osiRes.error.message, data: null };

    // Check for truncation
    const truncationWarning = checkTruncation(certsRes.data, 5000);

    // Create maps for quick lookup
    const serviciosMap = new Map(
      (serviciosRes.data || []).map((s: any) => [s.id, s]),
    );

    const osiMap = new Map(
      (osiRes.data || []).map((osi: any) => [osi.nro_osi?.toString(), osi]),
    );


    const stateNames = new Map<number, string>();
    statesRes.data?.forEach((s: any) => stateNames.set(s.id, s.nombre_estado));

    // Track unique OSIs per facilitator to avoid double-counting hours
    const facilitatorOSIMap = new Map<number, Set<number>>();

    const certStats = new Map<
      number,
      {
        totalCerts: number;
        totalScore: number;
        scoreCount: number;
        totalHours: number;
        uniqueCourses: Set<number>;
        courseNames: Set<string>;
        lastActivity: string | null;
      }
    >();

    certsRes.data?.forEach((cert: any, index: number) => {
      const fid = cert.id_facilitador;
      const osiId = cert.nro_osi?.toString();
      
      if (!certStats.has(fid)) {
        certStats.set(fid, {
          totalCerts: 0,
          totalScore: 0,
          scoreCount: 0,
          totalHours: 0,
          uniqueCourses: new Set(),
          courseNames: new Set(),
          lastActivity: null,
        });
        
        // Initialize OSI tracking for this facilitator
        facilitatorOSIMap.set(fid, new Set());
      }
      
      const s = certStats.get(fid)!;
      const osiSet = facilitatorOSIMap.get(fid)!;
      
      // Only count hours once per OSI
      if (!osiSet.has(osiId)) {
        osiSet.add(osiId);
        const osiData = osiMap.get(osiId);
        
        const hours = calculateHoursForCertificate(cert, osiData, serviciosMap);
        
        if (hours > 0) {
          s.totalHours += hours;
        }
      }
      
      // Continue with other metrics (certificates, scores, courses, activity)
      s.totalCerts++;
      if (cert.calificacion != null) {
        s.totalScore += cert.calificacion;
        s.scoreCount++;
      }
      if (cert.id_curso) {
        s.uniqueCourses.add(cert.id_curso);
        // Also collect course name
        const servicio = serviciosMap.get(cert.id_curso);
        if (servicio?.nombre) {
          s.courseNames.add(servicio.nombre);
        }
      }
      if (
        cert.fecha_emision &&
        (!s.lastActivity || cert.fecha_emision > s.lastActivity)
      ) {
        s.lastActivity = cert.fecha_emision;
      }
    });

    const facilitadoresList = (facilitadoresRes.data || [])
      .map((f) => {
        const s = certStats.get(f.id);
        const result = {
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
          courseNames: s?.courseNames ? Array.from(s.courseNames) : [],
          avgScore:
            s && s.scoreCount > 0
              ? parseFloat((s.totalScore / s.scoreCount).toFixed(1))
              : 0,
          lastActivity: s?.lastActivity || null,
        };
        
        return result;
      })
      .filter((f) => f.totalCerts > 0);


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
      error: truncationWarning.isTruncated ? (truncationWarning.message || null) : null,
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

    // Check for truncation
    const truncationWarning = checkTruncation(certs, 5000);

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

    return { data: result, error: truncationWarning.isTruncated ? (truncationWarning.message || null) : null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Error desconocido",
      data: [],
    };
  }
}

// ─── Tendencias ───────────────────────────────────────────────────────────────

export async function getTendenciasReport(stateId?: string): Promise<{
  data: TendenciasData | null;
  error: string | null;
}> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from("certificados")
      .select("id, fecha_emision, id_estado")
      .not("fecha_emision", "is", null)
      .order("fecha_emision", { ascending: true })
      .limit(10000);

    if (stateId) query = query.eq("id_estado", stateId);

    const [certsRes, statesRes] = await Promise.all([
      query,
      supabase.from("cat_estados_venezuela").select("id, nombre_estado"),
    ]);

    if (certsRes.error) return { error: certsRes.error.message, data: null };

    // Check for truncation
    const truncationWarning = checkTruncation(certsRes.data, 10000);

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

    return {
      data: { monthlyData, yearlyTotals, stateDistribution },
      error: truncationWarning.isTruncated ? (truncationWarning.message || null) : null,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Error desconocido",
      data: null,
    };
  }
}

// ─── Surveys ───────────────────────────────────────────────────────────────────

export async function getSurveysReport(
  dateFrom?: string,
  dateTo?: string,
  stateId?: string,
): Promise<{ data: SurveySummary[]; error: string | null }> {
  const supabase = await createClient();
  try {
    // 1. First, fetch OSI data with date/state filters applied
    let osiQuery = supabase
      .from("v_osi_formato_completo")
      .select(`
        id_osi,
        nro_osi,
        nombre_empresa,
        servicio,
        direccion_ejecucion,
        fecha_inicio_real,
        id_estado_direccion_ejecucion_efectiva
      `);

    if (dateFrom) osiQuery = osiQuery.gte("fecha_inicio_real", dateFrom);
    if (dateTo) osiQuery = osiQuery.lte("fecha_inicio_real", dateTo);
    if (stateId) osiQuery = osiQuery.eq("id_estado_direccion_ejecucion_efectiva", stateId);

    const { data: osiData, error: osiError } = await osiQuery;

    if (osiError) return { error: osiError.message, data: [] };

    if (!osiData || osiData.length === 0) return { data: [], error: null };

    // 2. Get unique OSI IDs from filtered OSI data
    const filteredOsiIds = osiData.map(osi => osi.id_osi);

    // 3. Fetch surveys only for the filtered OSIs (all questions + attendance reasons)
    const { data: surveyData, error: surveyError } = await supabase
      .from("course_satisfaction_surveys")
      .select("id_osi, q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, attendance_reasons")
      .in("id_osi", filteredOsiIds);

    if (surveyError) return { error: surveyError.message, data: [] };

    // 4. Group surveys by OSI with detailed analytics
    const osiMap = new Map();
    osiData?.forEach(osi => {
      osiMap.set(osi.id_osi, {
        ...osi,
        total_score: 0,
        survey_count: 0,
        question_sums: {} as { [key: string]: number },
        question_counts: {} as { [key: string]: { [score: number]: number } },
        attendance_reasons: {} as { [reason: string]: number }
      });
    });

    surveyData?.forEach(survey => {
      const osiEntry = osiMap.get(survey.id_osi);
      if (osiEntry) {
        osiEntry.total_score += survey.q9;
        osiEntry.survey_count += 1;
        
        // Process each question (q1-q10)
        for (let i = 1; i <= 10; i++) {
          const qKey = `q${i}`;
          const score = (survey as any)[qKey];
          if (score != null) {
            osiEntry.question_sums[qKey] = (osiEntry.question_sums[qKey] || 0) + score;
            if (!osiEntry.question_counts[qKey]) {
              osiEntry.question_counts[qKey] = {};
            }
            osiEntry.question_counts[qKey][score] = (osiEntry.question_counts[qKey][score] || 0) + 1;
          }
        }
        
        // Process attendance reasons
        if (survey.attendance_reasons && Array.isArray(survey.attendance_reasons)) {
          survey.attendance_reasons.forEach((reason: any) => {
            if (typeof reason === 'string') {
              osiEntry.attendance_reasons[reason] = (osiEntry.attendance_reasons[reason] || 0) + 1;
            }
          });
        }
      }
    });

    // 5. Final transformation with rich analytics
    const summariesData: SurveySummary[] = Array.from(osiMap.values())
      .filter(osi => osi.survey_count > 0)
      .map(g => {
        const question_averages: { [key: string]: number } = {};
        const question_distributions: { [key: string]: { [score: number]: number } } = {};
        
        // Calculate averages for each question
        for (let i = 1; i <= 10; i++) {
          const qKey = `q${i}`;
          const sum = g.question_sums[qKey] || 0;
          const count = g.survey_count;
          question_averages[qKey] = count > 0 ? sum / count : 0;
          question_distributions[qKey] = g.question_counts[qKey] || {};
        }
        
        return {
          id_osi: g.id_osi,
          nro_osi: g.nro_osi,
          nombre_empresa: g.nombre_empresa,
          servicio: g.servicio,
          direccion_ejecucion: g.direccion_ejecucion,
          fecha_inicio_real: g.fecha_inicio_real,
          survey_count: g.survey_count,
          avg_score: g.total_score / g.survey_count,
          question_averages,
          question_distributions,
          attendance_reasons: g.attendance_reasons,
        };
      });

    // Sort by most recent
    summariesData.sort((a, b) => 
      new Date(b.fecha_inicio_real).getTime() - new Date(a.fecha_inicio_real).getTime()
    );

    return { data: summariesData, error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Error desconocido",
      data: [],
    };
  }
}

// ─── Carnets Metrics ────────────────────────────────────────────────────────────────

export async function getCarnetsMetrics(
  dateFrom?: string,
  dateTo?: string,
): Promise<{ data?: CarnetsMetrics; error?: string }> {
  try {
    const supabase = await createClient();

    // Build date filter
    let dateFilter = "";
    if (dateFrom && dateTo) {
      dateFilter = `and fecha_emision.gte.${dateFrom},fecha_emission.lte.${dateTo}`;
    } else if (dateFrom) {
      dateFilter = `and fecha_emision.gte.${dateFrom}`;
    } else if (dateTo) {
      dateFilter = `and fecha_emision.lte.${dateTo}`;
    }

    // Get carnets data with related information
    const { data: carnets, error: carnetsError } = await supabase
      .from("carnets")
      .select(`
        *,
        certificado:certificados(id, created_at),
        curso:catalogo_servicios(id, nombre)
      `)
      .order("created_at", { ascending: false });

    if (carnetsError) {
      console.error("Error fetching carnets:", carnetsError);
      return { error: "Error fetching carnets data" };
    }

    console.log("🔍 getCarnetsMetrics - Raw carnets data:", carnets?.length || 0, "carnets");

    // Apply date filtering if needed
    const filteredCarnets = carnets?.filter(carnet => {
      if (!dateFrom && !dateTo) return true;
      const carnetDate = carnet.fecha_emision;
      if (dateFrom && carnetDate < dateFrom) return false;
      if (dateTo && carnetDate > dateTo) return false;
      return true;
    }) || [];

    console.log("🔍 getCarnetsMetrics - Filtered carnets:", filteredCarnets.length, "carnets");

    // Calculate basic metrics
    const totalCarnets = filteredCarnets.length;
    const activeCarnets = filteredCarnets.filter(c => c.is_active).length;
    const inactiveCarnets = totalCarnets - activeCarnets;

    // Calculate expiration metrics
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const expiringSoon = filteredCarnets.filter(c => 
      c.fecha_vencimiento && 
      new Date(c.fecha_vencimiento) <= thirtyDaysFromNow &&
      new Date(c.fecha_vencimiento) > now
    ).length;

    const expired = filteredCarnets.filter(c => 
      c.fecha_vencimiento && 
      new Date(c.fecha_vencimiento) <= now
    ).length;

    // Average carnets per certificate not needed (1:1 relationship)

    // Template usage not needed - removed

    // Calculate monthly generation data (last 12 months)
    const monthlyMap = new Map<string, { count: number; activeCount: number }>();
    const now2 = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now2.getFullYear(), now2.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, { count: 0, activeCount: 0 });
    }

    filteredCarnets.forEach(carnet => {
      const date = new Date(carnet.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const existing = monthlyMap.get(key);
      if (existing) {
        existing.count++;
        if (carnet.is_active) {
          existing.activeCount++;
        }
      }
    });

    const monthlyGeneration: MonthlyCarnetData[] = Array.from(monthlyMap.entries()).map(([monthYear, data]) => {
      const [year, month] = monthYear.split('-').map(Number);
      return {
        month: new Date(year, month - 1).toLocaleDateString('es-ES', { month: 'short' }),
        year,
        count: data.count,
        activeCount: data.activeCount,
      };
    });

    return {
      data: {
        totalCarnets,
        activeCarnets,
        inactiveCarnets,
        expiringSoon,
        expired,
        averageCarnetsPerCertificate: 0,
        templateUsage: [],
        monthlyGeneration,
      },
    };
  } catch (err) {
    console.error("Error in getCarnetsMetrics:", err);
    return {
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}
