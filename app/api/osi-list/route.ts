import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { requireDashboardAuth } from '@/utils/api-auth';

export async function GET(request: NextRequest) {
  const auth = await requireDashboardAuth(request);
  if ('unauthorized' in auth) {
    return auth.unauthorized;
  }

  try {
    const supabase = await createClient();
    // Fail-fast timeout: the 8-join v_osi_formato_completo view can take >30s
    // under DB contention, which holds connections and cascades into Auth/Realtime
    // timeouts. Aborting at 8s lets the caller degrade gracefully instead of
    // piling up.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const { data, error } = await supabase
      .from('v_osi_formato_completo')
      .select('id_osi, nro_osi, fecha_emision, fecha_inicio_real, codigo_cliente, participantes_ejecucion, servicio, costo_traslado, horas_honorarios_instructor, tarifa_hora_honorarios, costo_impresion_material')
      .order('fecha_emision', { ascending: false })
      .limit(100)
      .abortSignal(controller.signal);
    clearTimeout(timeout);

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('osi-list query timed out after 8s — returning empty list');
      return NextResponse.json([]);
    }
    console.error('Error fetching OSIs:', error);
    return NextResponse.json({ error: 'Failed to fetch OSIs' }, { status: 500 });
  }
}
