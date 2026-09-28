import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("=== SEEDING TEST FACILITADOR (ID: 44, username: 'usuario') ===");

  const facilitadorId = 44;

  // 1. Verify facilitator exists
  const { data: fac, error: facErr } = await supabase
    .from("facilitadores")
    .select("id, nombre_apellido, email")
    .eq("id", facilitadorId)
    .single();

  if (facErr || !fac) {
    console.error("Facilitador 44 not found:", facErr);
    return;
  }
  console.log(`Found facilitator: ${fac.nombre_apellido} (${fac.email})`);

  // 2. Select target OSIs:
  // Active OSI: 334 ('MANEJO DE MONTACARGAS', upcoming in Oct 2026)
  // Historical OSIs: 329 ('PERMISO DE TRABAJO', Sep 2026) and 1 ('MANEJO DE MONTACARGAS', Jan 2026)
  const activeOsiId = 334;
  const historyOsiIds = [329, 1];

  console.log(`\n1. Setting up Active OSI (ID: ${activeOsiId})...`);

  // Upsert active assignment for 334
  await supabase
    .from("facilitador_osi_assignments")
    .delete()
    .eq("osi_id", activeOsiId)
    .eq("facilitador_id", facilitadorId);

  const { error: assignActiveErr } = await supabase
    .from("facilitador_osi_assignments")
    .insert({
      osi_id: activeOsiId,
      facilitador_id: facilitadorId,
      is_active: true,
      source: "direct",
    });

  if (assignActiveErr) {
    console.error("Error setting active assignment:", assignActiveErr);
  } else {
    console.log(`✓ Active assignment set for OSI ${activeOsiId}`);
  }

  // Ensure active OSI has at least 1 session
  const { data: activeSessions } = await supabase
    .from("osi_sesion")
    .select("id")
    .eq("id_osi", activeOsiId);

  if (!activeSessions || activeSessions.length === 0) {
    await supabase.from("osi_sesion").insert({
      id_osi: activeOsiId,
      nro_sesion: 1,
      fecha: "2026-10-03",
      hora_inicio: "08:00:00",
      hora_fin: "16:00:00",
    });
    console.log(`✓ Created session for OSI ${activeOsiId}`);
  }

  // Also ensure OSI 94 is active if already used in testing
  await supabase
    .from("facilitador_osi_assignments")
    .upsert(
      {
        osi_id: 94,
        facilitador_id: facilitadorId,
        is_active: true,
        source: "direct",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "osi_id,facilitador_id" }
    );
  console.log(`✓ Active assignment set for OSI 94`);

  // 3. Setting up Historical Completed OSIs
  console.log(`\n2. Setting up Historical OSIs (${historyOsiIds.join(", ")})...`);

  for (const histOsiId of historyOsiIds) {
    // Set active assignment
    await supabase
      .from("facilitador_osi_assignments")
      .upsert(
        {
          osi_id: histOsiId,
          facilitador_id: facilitadorId,
          is_active: true,
          source: "direct",
          attachment_received: true,
          attachment_received_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "osi_id,facilitador_id" }
      );

    // Ensure session exists
    const { data: sess } = await supabase
      .from("osi_sesion")
      .select("id")
      .eq("id_osi", histOsiId);

    if (!sess || sess.length === 0) {
      await supabase.from("osi_sesion").insert({
        id_osi: histOsiId,
        nro_sesion: 1,
        fecha: histOsiId === 329 ? "2026-09-24" : "2026-01-09",
        fecha_ejecutada: histOsiId === 329 ? "2026-09-24" : "2026-01-09",
      });
    }

    // Insert sample final participants
    const sampleParticipants = [
      {
        osi_id: histOsiId,
        facilitador_id: facilitadorId,
        nombre_apellido: "CARLOS ALBERTO MENDOZA",
        cedula: "18456123",
        score: "19",
        status: "final",
      },
      {
        osi_id: histOsiId,
        facilitador_id: facilitadorId,
        nombre_apellido: "MARIA ELENA GUZMAN",
        cedula: "20112334",
        score: "20",
        status: "final",
      },
      {
        osi_id: histOsiId,
        facilitador_id: facilitadorId,
        nombre_apellido: "JOSE GREGORIO RAMIREZ",
        cedula: "15998776",
        score: "18",
        status: "final",
      },
    ];

    // Clean existing test records first
    await supabase
      .from("ejecucion_osi_participantes")
      .delete()
      .eq("osi_id", histOsiId)
      .eq("facilitador_id", facilitadorId);

    await supabase
      .from("ejecucion_osi_participantes")
      .insert(sampleParticipants);

    // Insert acknowledgment
    await supabase
      .from("facilitador_acknowledgments")
      .upsert(
        {
          osi_id: histOsiId,
          facilitador_id: facilitadorId,
          disclaimer_text:
            "Declaro bajo mi responsabilidad que he revisado exhaustivamente las calificaciones y datos de los participantes...",
          acknowledged_at: new Date().toISOString(),
        },
        { onConflict: "osi_id,facilitador_id" }
      );

    console.log(`✓ Historical data and final submission configured for OSI ${histOsiId}`);
  }

  console.log("\n=== SEED COMPLETE ===");
  console.log(`You can now log in at /portal/facilitador/login with:`);
  console.log(`  Username: usuario`);
  console.log(`  Active Services: OSI PEN-3556 (ID: 334) & OSI 3300 (ID: 94)`);
  console.log(`  Historical Services: OSI 3551 (ID: 329) & OSI 3120 (ID: 1)`);
}

seed().catch(console.error);
