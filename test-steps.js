const http = require('http');
const crypto = require('crypto');

// Create a valid facilitador session cookie
const SECRET = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ib3NsaGhlbXV2enZqbmJxZWloIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM2NjIzOCwiZXhwIjoyMDg1OTQyMjM4fQ.6R0m5VHvb18T1uS7GB9UwGuqJ0ewu_A-DWT8lKj-LaM';
const payload = JSON.stringify({id:11,facilitador_id:44,nombre:'usuario',username:'usuario'});
const b64 = Buffer.from(payload).toString('base64url');
const sig = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url');
const cookie = 'facilitador_session=' + b64 + '.' + sig;

// Next.js server actions use a specific format. We need to call the action via the RSC protocol.
// Instead, let's just check the current state of the steps in the DB before and after.

const { createClient } = require('@supabase/supabase-js');
const url = 'https://oboslhhemuvzvjnbqeih.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ib3NsaGhlbXV2enZqbmJxZWloIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM2NjIzOCwiZXhwIjoyMDg1OTQyMjM4fQ.6R0m5VHvb18T1uS7GB9UwGuqJ0ewu_A-DWT8lKj-LaM';
const sb = createClient(url, key);

(async () => {
  // 1. Check current steps for OSI 134 (nro_osi 3372), session 2
  const { data: beforeSteps, error: beforeErr } = await sb
    .from('capacitacion_proceso_steps')
    .select('*')
    .eq('osi_id', 134)
    .eq('phase', 'ejecucion')
    .order('nro_sesion', { ascending: true })
    .order('step_key', { ascending: true });

  console.log('=== Current steps for OSI 134 (before upload test) ===');
  if (beforeErr) {
    console.log('Error:', beforeErr);
  } else if (!beforeSteps || beforeSteps.length === 0) {
    console.log('NO STEPS EXIST for OSI 134 — ensureProcesoStepsExist may not have been called yet');
  } else {
    for (const s of beforeSteps) {
      console.log(`  Session ${s.nro_sesion} | ${s.step_key}: completed=${s.completed} at=${s.completed_at || 'null'}`);
    }
  }

  // 2. Check if the lista_asistencia step exists for session 2
  const { data: listaStep } = await sb
    .from('capacitacion_proceso_steps')
    .select('*')
    .eq('osi_id', 134)
    .eq('nro_sesion', 2)
    .eq('phase', 'ejecucion')
    .eq('step_key', 'lista_asistencia')
    .maybeSingle();

  console.log('\n=== lista_asistencia step for session 2 ===');
  console.log(listaStep ? `completed=${listaStep.completed} at=${listaStep.completed_at}` : 'DOES NOT EXIST');

  // 3. Check existing uploads for OSI 134
  const { data: uploads } = await sb
    .from('ejecucion_osi_asistencia')
    .select('id, category, nro_sesion, file_name, created_at')
    .eq('osi_id', 134)
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\n=== Recent uploads for OSI 134 ===');
  if (uploads && uploads.length > 0) {
    for (const u of uploads) {
      console.log(`  ${u.file_name} | category=${u.category} | nro_sesion=${u.nro_sesion} | at=${u.created_at}`);
    }
  } else {
    console.log('No uploads found');
  }
})();
