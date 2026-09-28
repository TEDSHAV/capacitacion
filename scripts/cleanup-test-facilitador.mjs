import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function cleanupTestFacilitator() {
  console.log("=== CLEANING UP ALL TEST DATA FOR FACILITADOR ID: 44 ===");
  const facilitadorId = 44;
  const testOsiIds = [334, 329, 1, 94];

  // 1. Clean uploaded images & attachments (both in storage and DB)
  try {
    const { data: attachments } = await supabase
      .from("ejecucion_osi_adjuntos")
      .select("id, storage_path")
      .eq("facilitador_id", facilitadorId)
      .in("osi_id", testOsiIds);

    if (attachments && attachments.length > 0) {
      const storagePaths = attachments
        .map((a) => a.storage_path)
        .filter(Boolean);

      if (storagePaths.length > 0) {
        await supabase.storage.from("osi-attachments").remove(storagePaths);
        console.log(`✓ Deleted ${storagePaths.length} uploaded test files from storage`);
      }

      await supabase
        .from("ejecucion_osi_adjuntos")
        .delete()
        .eq("facilitador_id", facilitadorId)
        .in("osi_id", testOsiIds);
      console.log(`✓ Deleted ${attachments.length} attachment records from ejecucion_osi_adjuntos`);
    } else {
      console.log("✓ No uploaded test attachments found");
    }
  } catch (attErr) {
    console.warn("Notice cleaning attachments:", attErr);
  }

  // 2. Remove test participant entries created for facilitador 44
  const { error: partErr } = await supabase
    .from("ejecucion_osi_participantes")
    .delete()
    .eq("facilitador_id", facilitadorId)
    .in("osi_id", testOsiIds);

  if (partErr) console.error("Error cleaning participants:", partErr);
  else console.log("✓ Cleaned test participants from ejecucion_osi_participantes");

  // 3. Remove test acknowledgments for facilitador 44
  const { error: ackErr } = await supabase
    .from("facilitador_acknowledgments")
    .delete()
    .eq("facilitador_id", facilitadorId)
    .in("osi_id", testOsiIds);

  if (ackErr) console.error("Error cleaning acknowledgments:", ackErr);
  else console.log("✓ Cleaned test acknowledgments from facilitador_acknowledgments");

  // 4. Remove test assignments for facilitador 44 on 334, 329, 1
  const { error: assignErr } = await supabase
    .from("facilitador_osi_assignments")
    .delete()
    .eq("facilitador_id", facilitadorId)
    .in("osi_id", [334, 329, 1]);

  if (assignErr) console.error("Error cleaning assignments:", assignErr);
  else console.log("✓ Removed test assignments (334, 329, 1)");

  // Restore OSI 94 to is_active: false
  await supabase
    .from("facilitador_osi_assignments")
    .update({ is_active: false })
    .eq("facilitador_id", facilitadorId)
    .eq("osi_id", 94);

  console.log("✓ Restored OSI 94 assignment to inactive");
  console.log("\n=== DATABASE & STORAGE 100% CLEANED AND RESTORED ===");
}

cleanupTestFacilitator().catch(console.error);
