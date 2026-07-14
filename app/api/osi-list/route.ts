import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('v_osi_formato_completo')
      .select('id_osi, nro_osi, fecha_emision, fecha_inicio_real, codigo_cliente, participantes_ejecucion, servicio, costo_traslado, horas_honorarios_instructor, tarifa_hora_honorarios, costo_impresion_material')
      .order('fecha_emision', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching OSIs:', error);
    return NextResponse.json({ error: 'Failed to fetch OSIs' }, { status: 500 });
  }
}
