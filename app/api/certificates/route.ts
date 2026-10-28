import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { requireDashboardAuth } from "@/utils/api-auth";

export async function GET(request: NextRequest) {
  const auth = await requireDashboardAuth(request);
  if ('unauthorized' in auth) {
    return auth.unauthorized;
  }

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Get query parameters
    const participantId = searchParams.get("participantId");
    const courseId = searchParams.get("courseId");
    const companyId = searchParams.get("companyId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("certificados")
      .select(
        `
        *,
        empresas!certificados_id_empresa_fkey (
          id,
          razon_social,
          rif
        ),
        facilitadores!certificados_id_facilitador_fkey (
          id,
          nombre_apellido,
          cedula,
          email
        ),
        participantes_certificados!certificados_id_participante_fkey (
          id,
          nombre,
          apellido,
          cedula,
          nacionalidad
        )
      `,
      )
      .eq("is_active", true)
      .order("fecha_emision", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters if provided
    if (participantId) {
      query = query.eq("id_participante", participantId);
    }
    if (courseId) {
      query = query.eq("id_curso", courseId);
    }
    if (companyId) {
      query = query.eq("id_empresa", companyId);
    }

    // Fetch data and services in parallel
    const [{ data: certificates, error, count }, { data: servicios }] =
      await Promise.all([
        query,
        supabase
          .from("catalogo_servicios")
          .select(
            "id, nombre, contenido_curso, carga_horaria_std, nota_aprobatoria, emite_carnet",
          ),
      ]);

    if (error) {
      console.error("Error fetching certificates:", error);
      return NextResponse.json(
        { error: "Failed to fetch certificates" },
        { status: 500 },
      );
    }

    // Create services map
    const serviciosMap = new Map((servicios || []).map((s: any) => [s.id, s]));

    // Parse snapshot content for each certificate and merge course data
    const certificatesWithParsedData =
      certificates?.map((cert) => {
        let parsedSnapshot = null;
        if (cert.snapshot_contenido) {
          try {
            parsedSnapshot = JSON.parse(cert.snapshot_contenido);
          } catch (error) {
            console.warn("Failed to parse snapshot for certificate:", cert.id);
          }
        }

        const curso = serviciosMap.get(cert.id_curso);

        return {
          ...cert,
          cursos: curso
            ? {
                id: curso.id,
                nombre: curso.nombre,
                contenido: curso.contenido_curso,
                horas_estimadas: curso.carga_horaria_std,
                nota_aprobatoria: curso.nota_aprobatoria,
                emite_carnet: curso.emite_carnet,
              }
            : null,
          parsed_snapshot: parsedSnapshot,
        };
      }) || [];

    return NextResponse.json({
      certificates: certificatesWithParsedData,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error in certificates API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireDashboardAuth(request);
  if ('unauthorized' in auth) {
    return auth.unauthorized;
  }

  try {
    const body = await request.json();
    const supabase = await createClient();

    const {
      id_participante,
      id_curso,
      id_empresa,
      id_facilitador,
      calificacion,
      fecha_emision,
      fecha_vencimiento,
      control_numbers,
      snapshot_contenido,
      id_sede,
      id_ciudad,
      nro_osi,
    } = body;

    // Validate required fields
    if (!id_participante || !id_curso || !id_empresa) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: participant, course, and company are required",
        },
        { status: 400 },
      );
    }

    let resolvedSedeId = id_sede || null;
    let resolvedCiudadId = id_ciudad || null;
    if (!resolvedSedeId && nro_osi) {
      const cleanNro = String(nro_osi).replace(/[^\d]/g, "");
      if (cleanNro) {
        const { data: osiMatch } = await supabase
          .from("v_osi_formato_completo")
          .select("id_sede, id_ciudad_direccion_ejecucion_efectiva")
          .eq("nro_osi", cleanNro)
          .maybeSingle();
        if (osiMatch?.id_sede) resolvedSedeId = osiMatch.id_sede;
        if (!resolvedCiudadId && osiMatch?.id_ciudad_direccion_ejecucion_efectiva) {
          resolvedCiudadId = osiMatch.id_ciudad_direccion_ejecucion_efectiva;
        }
      }
    }

    const { data: certificate, error } = await supabase
      .from("certificados")
      .insert({
        id_participante,
        id_curso,
        id_empresa,
        id_facilitador,
        calificacion,
        fecha_emision: fecha_emision || new Date().toISOString(),
        fecha_vencimiento,
        control_numbers,
        snapshot_contenido,
        id_sede: resolvedSedeId,
        id_ciudad: resolvedCiudadId,
        nro_osi: nro_osi || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating certificate:", error);
      return NextResponse.json(
        { error: "Failed to create certificate" },
        { status: 500 },
      );
    }

    if (certificate && nro_osi) {
      try {
        const cleanNro = String(nro_osi).replace(/[^\d]/g, "");
        if (cleanNro) {
          const { data: ejecMatch } = await supabase
            .from("ejecucion_osi")
            .select("id")
            .eq("nro_osi_secuencial", cleanNro)
            .maybeSingle();

          let resolvedOsiId = ejecMatch?.id;
          if (!resolvedOsiId) {
            const { data: osiMatch } = await supabase
              .from("v_osi_formato_completo")
              .select("id_osi")
              .eq("nro_osi", cleanNro)
              .maybeSingle();
            if (osiMatch?.id_osi) resolvedOsiId = osiMatch.id_osi;
          }

          if (resolvedOsiId) {
            const certCreatedAt = certificate.created_at || new Date().toISOString();
            const { data: sesionRows } = await supabase
              .from("osi_sesion")
              .select("nro_sesion")
              .eq("id_osi", resolvedOsiId);

            const sessionNumbers =
              sesionRows && sesionRows.length > 0
                ? sesionRows.map((s) => s.nro_sesion)
                : [1];

            const stepRows = sessionNumbers.map((nro) => ({
              osi_id: resolvedOsiId,
              nro_sesion: nro,
              phase: "ejecucion" as const,
              step_key: "elaboracion_certificados",
              completed: true,
              completed_at: certCreatedAt,
            }));

            await supabase
              .from("capacitacion_proceso_steps")
              .upsert(stepRows, { onConflict: "osi_id,nro_sesion,phase,step_key" });

            const { clearSeguimientoServerCache } = await import(
              "@/app/actions/capacitacion-proceso-steps"
            );
            await clearSeguimientoServerCache();
          }
        }
      } catch (stepErr) {
        console.warn("⚠️ Failed to auto-mark elaboracion_certificados in API:", stepErr);
      }
    }

    return NextResponse.json({ certificate }, { status: 201 });
  } catch (error) {
    console.error("Error in certificate creation API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
