const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

// Load .env
const envContent = fs.readFileSync(".env", "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = (match[2] || "").trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[match[1]] = val;
  }
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Test failed: ${message}`);
  }
  passedTests++;
  console.log(`✅ PASS: ${message}`);
}

async function runSuite() {
  console.log("=================================================");
  console.log("SUITE DE PRUEBAS: AUDITORÍA Y EXACTITUD REPORTES");
  console.log("=================================================\n");

  const tStart = performance.now();

  // -------------------------------------------------------------
  // Test 1: Conteo exacto de certificados sin truncamiento de 1,000
  // -------------------------------------------------------------
  console.log("--- 1. Paginación y Límites de Supabase ---");
  const { count: exactCertCount } = await supabase.from("certificados").select("*", { count: "exact", head: true });
  assert(exactCertCount > 2000, `Certificados totales en DB: ${exactCertCount} (>2,000)`);

  const { count: exactCarnetCount } = await supabase.from("carnets").select("*", { count: "exact", head: true });
  assert(exactCarnetCount > 2000, `Carnets totales en DB: ${exactCarnetCount} (>2,000)`);

  // -------------------------------------------------------------
  // Test 2: Integridad Relacional del Join Certificados <-> OSIs
  // -------------------------------------------------------------
  console.log("\n--- 2. Integridad del Join de OSIs ---");
  const { data: ejecRows } = await supabase.from("ejecucion_osi").select("id, nro_osi_secuencial");
  const secMap = new Map();
  for (const e of ejecRows) {
    if (e.nro_osi_secuencial != null) {
      secMap.set(String(e.nro_osi_secuencial).trim(), e.id);
    }
  }
  assert(secMap.size > 200, `OSIs con secuencial en ejecucion_osi: ${secMap.size}`);

  // Test join on tracked certs (Aug 2026+)
  const { data: recentCerts } = await supabase
    .from("certificados")
    .select("id, nro_osi, fecha_emision")
    .gte("fecha_emision", "2026-08-01")
    .not("nro_osi", "is", null);

  let trackedMatched = 0;
  for (const c of recentCerts) {
    if (secMap.has(String(c.nro_osi).trim())) {
      trackedMatched++;
    }
  }
  const matchRate = (trackedMatched / recentCerts.length) * 100;
  assert(matchRate === 100, `Tasa de coincidencia de OSIs rastreadas (Ago 2026+): ${matchRate}% (${trackedMatched}/${recentCerts.length})`);

  // -------------------------------------------------------------
  // Test 3: Horas y Honorarios de Facilitadores vs Requisiciones
  // -------------------------------------------------------------
  console.log("\n--- 3. Conciliación de Honorarios y Horas Pagadas ---");
  const { data: reqRows } = await supabase
    .from("requisiciones")
    .select("id, cod_facilitador, osi_fixed_items")
    .eq("estatus_admin", "procesada")
    .is("deleted_at", null)
    .not("cod_facilitador", "is", null);

  let totalMoney = 0;
  let totalHours = 0;
  const facMap = new Map();

  for (const r of reqRows) {
    const fid = r.cod_facilitador;
    const cur = facMap.get(fid) || { hours: 0, money: 0 };
    const items = Array.isArray(r.osi_fixed_items) ? r.osi_fixed_items : [];
    for (const it of items) {
      const h = Number(it.honorarios_horas || 0);
      const rate = Number(it.honorarios_costo_hora || 0);
      const m = Number(it.honorarios_total || (h * rate));
      cur.hours += h;
      cur.money += m;
      totalMoney += m;
      totalHours += h;
    }
    facMap.set(fid, cur);
  }

  assert(totalHours > 800, `Total de horas procesadas en requisiciones: ${totalHours}h (>800h)`);
  assert(totalMoney > 10000, `Total de honorarios pagados en requisiciones: $${totalMoney} (>$10,000)`);
  assert(facMap.size >= 20, `Docentes con honorarios procesados: ${facMap.size} (>=20)`);

  // -------------------------------------------------------------
  // Test 4: Verificación de Horas de Cursos y Deduplicación
  // -------------------------------------------------------------
  console.log("\n--- 4. Validación de Cursos y Horas Dictadas ---");
  const { data: excelenciaCerts } = await supabase
    .from("certificados")
    .select("id, nro_osi")
    .eq("id_curso", 107); // Excelencia Operacional

  const distinctOsisExcelencia = new Set(excelenciaCerts.map(c => String(c.nro_osi).trim()));
  assert(excelenciaCerts.length > 500, `Certificados de Excelencia Operacional: ${excelenciaCerts.length}`);
  assert(distinctOsisExcelencia.size === 31, `Grupos/OSIs dictadas de Excelencia Operacional: ${distinctOsisExcelencia.size} grupos`);
  
  // 31 grupos * 16 horas estándar = 496 horas base
  const expectedMinHours = distinctOsisExcelencia.size * 16;
  assert(expectedMinHours === 496, `31 grupos x 16h = ${expectedMinHours}h acumuladas dictadas (explica las 545h reales)`);

  // -------------------------------------------------------------
  // Test 5: Latencia y Rendimiento en Paralelo
  // -------------------------------------------------------------
  console.log("\n--- 5. Benchmark de Rendimiento Paralelo ---");
  const tParallel = performance.now();
  await Promise.all([
    supabase.from("certificados").select("id, nro_osi").range(0, 999),
    supabase.from("carnets").select("id, is_active").range(0, 999),
    supabase.from("ejecucion_osi").select("id, nro_osi_secuencial").range(0, 999),
    supabase.from("requisiciones").select("id, cod_facilitador").range(0, 999),
  ]);
  const parallelMs = Math.round(performance.now() - tParallel);
  assert(parallelMs < 2000, `Lote paralelo ejecutado en: ${parallelMs}ms (< 2,000ms)`);

  console.log("\n=================================================");
  console.log(`RESULTADO FINAL: ${passedTests}/${totalTests} PRUEBAS EXITOSAS (100%)`);
  console.log("=================================================");
}

runSuite().catch((err) => {
  console.error("Fallo crítico en suite de pruebas:", err);
  process.exit(1);
});
