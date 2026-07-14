import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the last certificate to determine next numbers
    const { data: lastCertificate, error: lastError } = await supabase
      .from('certificados')
      .select('nro_libro, nro_hoja, nro_linea, nro_control')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastError && lastError.code !== 'PGRST116') { // Not found error
      console.error('Error fetching last certificate:', lastError);
      return NextResponse.json(
        { error: 'Failed to fetch control numbers' },
        { status: 500 }
      );
    }

    let nextNumbers = {
      nro_libro: 1,
      nro_hoja: 1,
      nro_linea: 1,
      nro_control: 1
    };

    if (lastCertificate) {
      // Simulate the trigger logic for next numbers
      nextNumbers.nro_linea = lastCertificate.nro_linea + 1;
      
      if (nextNumbers.nro_linea > 10) { // Assuming 10 lines per page
        nextNumbers.nro_linea = 1;
        nextNumbers.nro_hoja = lastCertificate.nro_hoja + 1;
        
        if (nextNumbers.nro_hoja > 100) { // Assuming 100 pages per book
          nextNumbers.nro_hoja = 1;
          nextNumbers.nro_libro = lastCertificate.nro_libro + 1;
        } else {
          nextNumbers.nro_libro = lastCertificate.nro_libro;
        }
      } else {
        nextNumbers.nro_hoja = lastCertificate.nro_hoja;
        nextNumbers.nro_libro = lastCertificate.nro_libro;
      }
      
      // Control number always increments
      nextNumbers.nro_control = lastCertificate.nro_control + 1;
    }

    return NextResponse.json({
      ...nextNumbers,
      isPreview: true,
      message: 'These are estimated numbers for preview purposes. Actual numbers will be assigned by the database trigger.'
    });

  } catch (error) {
    console.error('Error in control-numbers API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
