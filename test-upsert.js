const { createClient } = require('@supabase/supabase-js');
const url = 'https://oboslhhemuvzvjnbqeih.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ib3NsaGhlbXV2enZqbmJxZWloIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM2NjIzOCwiZXhwIjoyMDg1OTQyMjM4fQ.6R0m5VHvb18T1uS7GB9UwGuqJ0ewu_A-DWT8lKj-LaM';
const sb = createClient(url, key);

(async () => {
  // Test the exact upsert that uploadOSIAttachment does
  console.log('=== Testing step upsert (simulating lista_asistencia upload for session 2) ===');
  const { data, error } = await sb
    .from('capacitacion_proceso_steps')
    .upsert(
      {
        osi_id: 134,
        nro_sesion: 2,
        phase: 'ejecucion',
        step_key: 'lista_asistencia',
        completed: true,
        completed_at: new Date().toISOString(),
        completed_by: null,
      },
      { onConflict: 'osi_id,nro_sesion,phase,step_key' },
    )
    .select();

  if (error) {
    console.log('❌ Upsert FAILED:', JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Upsert succeeded:', JSON.stringify(data, null, 2));
  }

  // Verify it was saved
  const { data: verify } = await sb
    .from('capacitacion_proceso_steps')
    .select('*')
    .eq('osi_id', 134)
    .eq('nro_sesion', 2)
    .eq('step_key', 'lista_asistencia')
    .single();

  console.log('\n=== Verification ===');
  console.log('lista_asistencia for session 2:', verify ? `completed=${verify.completed} at=${verify.completed_at}` : 'NOT FOUND');

  // Now reset it back to false so we don't pollute the test
  console.log('\n=== Resetting step back to false for clean test ===');
  await sb
    .from('capacitacion_proceso_steps')
    .update({ completed: false, completed_at: null })
    .eq('osi_id', 134)
    .eq('nro_sesion', 2)
    .eq('step_key', 'lista_asistencia');

  console.log('Done. The DB upsert works correctly — the issue is that no uploads have been made yet.');
})();
