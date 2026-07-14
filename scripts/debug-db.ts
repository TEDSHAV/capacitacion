import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('--- Checking plantillas_cursos ---');
  const { data: plantillas, error: pError } = await supabase
    .from('plantillas_cursos')
    .select('*');
  
  if (pError) console.error('Error fetching plantillas:', pError);
  else console.log('Plantillas count:', plantillas?.length, plantillas);

  console.log('--- Checking courses ---');
  const { data: courses, error: cError } = await supabase
    .from('cursos')
    .select('id, nombre')
    .eq('id', 62);
  
  if (cError) console.error('Error fetching course 62:', cError);
  else console.log('Course 62:', courses);

  console.log('--- Checking empresas ---');
  const { data: empresas, error: eError } = await supabase
    .from('empresas')
    .select('id, razon_social')
    .eq('id', 32);
  
  if (eError) console.error('Error fetching empresa 32:', eError);
  else console.log('Empresa 32:', empresas);
}

checkData();
