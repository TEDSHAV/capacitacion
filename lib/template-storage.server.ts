import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Public Supabase Storage bucket holding certificate/carnet templates uploaded
 * through the dashboard (plantillas de certificados / plantillas de carnets).
 *
 * Templates used to be written to `public/templates/` on the container's local
 * disk, which is wiped on every redeploy — uploaded templates silently
 * disappeared and PDF generation fell back to the bundled defaults.
 */
export const TEMPLATES_BUCKET = "plantillas";

/** Public URL prefix that both bundled and uploaded templates are served under. */
export const TEMPLATES_URL_PREFIX = "/templates/";

/**
 * Storage client built directly from the Supabase JS SDK rather than
 * `utils/supabase/server`, which imports `next/headers` for cookie handling.
 * This module is reached (via a guarded dynamic import) from PDF generators
 * that are also bundled for the client, where `next/headers` is not resolvable.
 * Storage access needs no user session, so no cookie plumbing is required.
 */
function createStorageClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error(
      "[template-storage] Missing Supabase URL or key; cannot access templates bucket.",
    );
    return null;
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Ensure the templates bucket exists (public, mirroring the facilitador-fotos
 * and empresa-logos buckets).
 */
export async function ensureTemplatesBucket(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
): Promise<{ error: string | null }> {
  const { data: buckets } = await admin.storage.listBuckets();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exists = buckets?.some((b: any) => b.name === TEMPLATES_BUCKET);
  if (exists) return { error: null };

  const { error } = await admin.storage.createBucket(TEMPLATES_BUCKET, {
    public: true,
  });
  if (error) {
    console.error(`Error creating ${TEMPLATES_BUCKET} bucket:`, error);
    return { error: error.message };
  }
  return { error: null };
}

/**
 * Resolve a `/templates/<fileName>` public path to the object name inside the
 * storage bucket. Returns null for anything that is not a template path.
 */
function toBucketObjectName(publicPath: string): string | null {
  if (!publicPath.startsWith(TEMPLATES_URL_PREFIX)) return null;
  const fileName = publicPath.slice(TEMPLATES_URL_PREFIX.length);
  // Reject nested paths / traversal — uploads are always flat file names.
  if (!fileName || fileName.includes("/") || fileName.includes("..")) {
    return null;
  }
  return fileName;
}

/**
 * Download a template object from the storage bucket.
 * Returns null when the object does not exist or storage is unavailable.
 */
export async function downloadTemplateObject(
  fileName: string,
): Promise<Buffer | null> {
  try {
    const storage = createStorageClient();
    if (!storage) return null;

    const { data, error } = await storage.storage
      .from(TEMPLATES_BUCKET)
      .download(fileName);

    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  } catch (error) {
    console.error(`Error downloading template "${fileName}":`, error);
    return null;
  }
}

/**
 * Read a template image for server-side PDF generation.
 *
 * Disk is checked first, so bundled assets shipped in `public/templates`
 * (certificado.png, carnet.png, sello.png, ...) behave exactly as before with
 * no network round-trip. Only when the file is absent from disk — i.e. it is a
 * template uploaded at runtime — is Supabase Storage consulted.
 *
 * Returns null when the image cannot be found, matching the previous
 * `fs.existsSync` behaviour so callers keep their existing fallbacks.
 */
export async function loadTemplateImage(
  imageUrl: string,
): Promise<Buffer | null> {
  if (!imageUrl) return null;

  let diskPath = imageUrl;
  if (imageUrl.startsWith("/")) {
    const publicDir = path.join(process.cwd(), "public");
    const resolved = path.resolve(publicDir, `.${imageUrl}`);
    // Never let a stored path escape public/ (e.g. "/templates/../../.env").
    if (resolved !== publicDir && !resolved.startsWith(publicDir + path.sep)) {
      console.error(`[template-storage] Rejected template path: ${imageUrl}`);
      return null;
    }
    diskPath = resolved;
  }

  if (existsSync(diskPath)) {
    try {
      return await readFile(diskPath);
    } catch (error) {
      console.error(`Error reading template from disk "${diskPath}":`, error);
      return null;
    }
  }

  const objectName = toBucketObjectName(imageUrl);
  if (!objectName) return null;

  return downloadTemplateObject(objectName);
}
