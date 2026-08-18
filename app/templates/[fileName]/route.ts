import { NextResponse } from "next/server";
import { downloadTemplateObject } from "@/lib/template-storage.server";

/**
 * Serves certificate/carnet templates uploaded to Supabase Storage under the
 * same `/templates/<fileName>` path they used when they were written to
 * `public/templates/`.
 *
 * Files that physically exist in `public/templates/` (certificado.png,
 * carnet.png, sello.png, the .docx templates, ...) are served directly by
 * Next.js as static assets and never reach this route.
 */
const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileName: string }> },
) {
  const { fileName } = await params;

  if (!fileName || fileName.includes("/") || fileName.includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buffer = await downloadTemplateObject(fileName);
  if (!buffer) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      // Upload file names carry a timestamp, so objects are immutable.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
