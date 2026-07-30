/**
 * One-off migration: regenerate stored QR codes so they point to the correct
 * public domain (NEXT_PUBLIC_APP_URL) instead of a stale/legacy domain.
 *
 * Why this exists:
 *   QR codes are stored as base64 PNGs in `certificados.qr_code` and
 *   `carnets.qr_code` (plus mirrored inside each row's `snapshot_contenido`
 *   JSON). The verification URL is baked into the QR pixels, so changing the
 *   env var alone does NOT fix already-generated records — they must be
 *   regenerated.
 *
 * Usage (from the nextjs-capacitacion-module root):
 *   node --experimental-strip-types --env-file=.env scripts/regenerate-qr-codes.ts --dry-run
 *   node --experimental-strip-types --env-file=.env scripts/regenerate-qr-codes.ts --apply
 *
 * Requires Node >= 22.13 (for --experimental-strip-types).
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in the env.
 * Requires NEXT_PUBLIC_APP_URL (or NEXT_PUBLIC_SHELL_URL as fallback) to be set.
 *
 * Safety:
 *   - Defaults to --dry-run (writes nothing).
 *   - Idempotent: skips rows whose snapshot already encodes the new domain.
 *   - Processes in batches to avoid memory spikes.
 *   - Only touches `qr_code` and the `qr_code`/`qr_data` fields inside
 *     `snapshot_contenido`. All other fields are preserved.
 */

import QRCode from "qrcode";
import { createClient } from "@supabase/supabase-js";

// Minimal supabase client surface used by this script. We avoid the generated
// Database types (which would force a `never` schema and break table typing)
// and instead cast the real client to this structural type once at creation.
interface LooseClient {
  from: (table: string) => {
    select: (cols: string) => {
      order: (col: string, opts: { ascending: boolean }) => {
        range: (from: number, to: number) => Promise<{
          data: unknown[] | null;
          error: { message: string } | null;
        }>;
      };
    };
    update: (payload: Record<string, unknown>) => {
      eq: (col: string, value: number | string) => Promise<{
        error: { message: string } | null;
      }>;
    };
  };
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const APPLY = process.argv.includes("--apply");
const DRY_RUN = !APPLY;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SHELL_URL ||
  ""
).replace(/\/+$/, ""); // strip trailing slashes

const BATCH_SIZE = 100;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ControlNumbers {
  nro_libro: number | null;
  nro_hoja: number | null;
  nro_linea: number | null;
  nro_control: number | null;
}

interface QRCodeData {
  certificateId: number;
  verificationUrl: string;
  controlNumbers?: ControlNumbers;
  generatedAt: string;
}

/** Build the verification URL exactly like QRService.generateQRData. */
function buildVerificationUrl(certificateId: number): string {
  return `${APP_BASE_URL}/verify-certificate/${certificateId}`;
}

/** Generate a QR data URL (base64 PNG) for a certificate id. */
async function generateQrDataUrl(
  certificateId: number,
  controlNumbers?: ControlNumbers,
): Promise<{ dataUrl: string; data: QRCodeData }> {
  const verificationUrl = buildVerificationUrl(certificateId);
  const data: QRCodeData = {
    certificateId,
    verificationUrl,
    controlNumbers,
    generatedAt: new Date().toISOString(),
  };
  const dataUrl = await QRCode.toDataURL(verificationUrl, {
    width: 150,
    margin: 1,
    color: { dark: "#000000", light: "#FFFFFF" },
    errorCorrectionLevel: "M",
  });
  return { dataUrl, data };
}

/** Safely parse a snapshot JSON string. */
function parseSnapshot(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Extract the verificationUrl from a snapshot's qr_data field (if present). */
function snapshotQrUrl(snapshot: Record<string, unknown> | null): string | null {
  if (!snapshot) return null;
  const qrData = snapshot.qr_data as { verificationUrl?: string } | undefined;
  return qrData?.verificationUrl ?? null;
}

// ---------------------------------------------------------------------------
// Migration: certificados
// ---------------------------------------------------------------------------

interface CertificadoRow {
  id: number;
  nro_libro: number | null;
  nro_hoja: number | null;
  nro_linea: number | null;
  nro_control: number | null;
  qr_code: string | null;
  snapshot_contenido: string | null;
}

async function migrateCertificados(
  supabase: LooseClient,
): Promise<{ scanned: number; updated: number; skipped: number; failed: number }> {
  const stats = { scanned: 0, updated: 0, skipped: 0, failed: 0 };
  let offset = 0;

  console.log("\n=== certificados ===");

  while (true) {
    const { data, error } = await supabase
      .from("certificados")
      .select(
        "id, nro_libro, nro_hoja, nro_linea, nro_control, qr_code, snapshot_contenido",
      )
      .order("id", { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error("  ✖ fetch error:", error.message);
      return stats;
    }
    if (!data || data.length === 0) break;

    for (const row of data as CertificadoRow[]) {
      stats.scanned++;
      const snapshot = parseSnapshot(row.snapshot_contenido);
      const currentUrl = snapshotQrUrl(snapshot);
      const expectedUrl = buildVerificationUrl(row.id);

      // Idempotency: skip if snapshot already encodes the new domain.
      if (currentUrl && currentUrl === expectedUrl) {
        stats.skipped++;
        continue;
      }

      const controlNumbers: ControlNumbers = {
        nro_libro: row.nro_libro ?? 0,
        nro_hoja: row.nro_hoja ?? 0,
        nro_linea: row.nro_linea ?? 0,
        nro_control: row.nro_control ?? 0,
      };

      try {
        const { dataUrl, data: qrData } = await generateQrDataUrl(
          row.id,
          controlNumbers,
        );

        let updatedSnapshot = row.snapshot_contenido;
        if (snapshot) {
          snapshot.qr_code = dataUrl;
          snapshot.qr_data = qrData;
          updatedSnapshot = JSON.stringify(snapshot, null, 2);
        }

        if (DRY_RUN) {
          console.log(
            `  [dry-run] cert #${row.id}: ${currentUrl ?? "(no snapshot url)"} -> ${expectedUrl}`,
          );
        } else {
          const { error: updErr } = await supabase
            .from("certificados")
            .update({
              qr_code: dataUrl,
              snapshot_contenido: updatedSnapshot,
            })
            .eq("id", row.id);
          if (updErr) {
            console.error(`  ✖ cert #${row.id} update failed:`, updErr.message);
            stats.failed++;
            continue;
          }
          console.log(`  ✓ cert #${row.id} -> ${expectedUrl}`);
        }
        stats.updated++;
      } catch (err) {
        console.error(`  ✖ cert #${row.id} qr generation failed:`, err);
        stats.failed++;
      }
    }

    offset += BATCH_SIZE;
    if (data.length < BATCH_SIZE) break;
  }

  return stats;
}

// ---------------------------------------------------------------------------
// Migration: carnets
// ---------------------------------------------------------------------------

interface CarnetRow {
  id: number;
  id_certificado: number;
  qr_code: string | null;
  snapshot_contenido: string | null;
}

async function migrateCarnets(
  supabase: LooseClient,
): Promise<{ scanned: number; updated: number; skipped: number; failed: number }> {
  const stats = { scanned: 0, updated: 0, skipped: 0, failed: 0 };
  let offset = 0;

  console.log("\n=== carnets ===");

  while (true) {
    const { data, error } = await supabase
      .from("carnets")
      .select("id, id_certificado, qr_code, snapshot_contenido")
      .order("id", { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error("  ✖ fetch error:", error.message);
      return stats;
    }
    if (!data || data.length === 0) break;

    for (const row of data as CarnetRow[]) {
      stats.scanned++;

      // Carnets reference a certificate id; skip rows without one (cannot build URL).
      if (!row.id_certificado) {
        stats.skipped++;
        continue;
      }

      const snapshot = parseSnapshot(row.snapshot_contenido);
      // Carnet snapshots store qr_code (data URL) but NOT qr_data, so we cannot
      // read the encoded URL from the snapshot. We regenerate unconditionally
      // (cheap) unless the snapshot has a qr_data.verificationUrl we can compare.
      const currentUrl = snapshotQrUrl(snapshot);
      const expectedUrl = buildVerificationUrl(row.id_certificado);

      if (currentUrl && currentUrl === expectedUrl) {
        stats.skipped++;
        continue;
      }

      // Carnets are generated WITHOUT control numbers (matches saveCarnetsToDatabase).
      try {
        const { dataUrl } = await generateQrDataUrl(row.id_certificado);

        let updatedSnapshot = row.snapshot_contenido;
        if (snapshot) {
          snapshot.qr_code = dataUrl;
          updatedSnapshot = JSON.stringify(snapshot, null, 2);
        }

        if (DRY_RUN) {
          console.log(
            `  [dry-run] carnet #${row.id} (cert ${row.id_certificado}): ${currentUrl ?? "(no snapshot url)"} -> ${expectedUrl}`,
          );
        } else {
          const { error: updErr } = await supabase
            .from("carnets")
            .update({
              qr_code: dataUrl,
              snapshot_contenido: updatedSnapshot,
            })
            .eq("id", row.id);
          if (updErr) {
            console.error(`  ✖ carnet #${row.id} update failed:`, updErr.message);
            stats.failed++;
            continue;
          }
          console.log(`  ✓ carnet #${row.id} -> ${expectedUrl}`);
        }
        stats.updated++;
      } catch (err) {
        console.error(`  ✖ carnet #${row.id} qr generation failed:`, err);
        stats.failed++;
      }
    }

    offset += BATCH_SIZE;
    if (data.length < BATCH_SIZE) break;
  }

  return stats;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`\nQR regeneration migration — mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log(`Target base URL: ${APP_BASE_URL || "(unset!)"}`);

  // Pre-flight guards
  if (!APP_BASE_URL) {
    console.error(
      "\n✖ NEXT_PUBLIC_APP_URL (or NEXT_PUBLIC_SHELL_URL) is not set. Aborting.",
    );
    process.exit(1);
  }
  if (!APP_BASE_URL.startsWith("http")) {
    console.error(`\n✖ APP_BASE_URL must start with http(s):// — got "${APP_BASE_URL}". Aborting.`);
    process.exit(1);
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error(
      "\n✖ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Aborting.",
    );
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  }) as unknown as LooseClient;

  const certStats = await migrateCertificados(supabase);
  const carnetStats = await migrateCarnets(supabase);

  console.log("\n=== summary ===");
  console.log(
    `certificados: scanned=${certStats.scanned} ${APPLY ? "updated" : "would-update"}=${certStats.updated} skipped=${certStats.skipped} failed=${certStats.failed}`,
  );
  console.log(
    `carnets:      scanned=${carnetStats.scanned} ${APPLY ? "updated" : "would-update"}=${carnetStats.updated} skipped=${carnetStats.skipped} failed=${carnetStats.failed}`,
  );
  if (DRY_RUN) {
    console.log("\n(dry-run — no rows were modified. Re-run with --apply to write.)");
  } else {
    console.log("\nDone. Existing generated PDFs are NOT auto-refreshed; users must");
    console.log("re-download certificates/carnets to get PDFs with the new QR.");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
