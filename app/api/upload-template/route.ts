import { NextRequest, NextResponse } from "next/server";
import { requireDashboardAuth } from "@/utils/api-auth";
import { createAdminClient } from "@/utils/supabase/server";
import {
  TEMPLATES_BUCKET,
  TEMPLATES_URL_PREFIX,
  ensureTemplatesBucket,
} from "@/lib/template-storage.server";

export async function POST(request: NextRequest) {
  const auth = await requireDashboardAuth(request);
  if ('unauthorized' in auth) {
    return auth.unauthorized;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Determine prefix from 'type' field (defaults to 'carnet' for backward compat)
    const templateType = (formData.get("type") as string) || "carnet";
    const prefix = templateType === "certificate" ? "cert" : "carnet";

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${prefix}_${timestamp}_${originalName}`;

    // Store in Supabase Storage instead of the container's local disk: the
    // filesystem is ephemeral, so previously uploaded templates were lost on
    // every redeploy.
    const admin = await createAdminClient();
    const { error: bucketError } = await ensureTemplatesBucket(admin);
    if (bucketError) {
      return NextResponse.json(
        { error: `Error preparing storage: ${bucketError}` },
        { status: 500 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from(TEMPLATES_BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading template:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // The returned URL is served by app/templates/[fileName]/route.ts, keeping
    // the exact same public path contract as when templates lived on disk.
    return NextResponse.json({
      success: true,
      fileName,
      url: `${TEMPLATES_URL_PREFIX}${fileName}`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 },
    );
  }
}
