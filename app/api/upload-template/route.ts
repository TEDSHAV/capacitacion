import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Ensure templates directory exists
    const templatesDir = join(process.cwd(), "public", "templates");
    if (!existsSync(templatesDir)) {
      await mkdir(templatesDir, { recursive: true });
    }

    // Determine prefix from 'type' field (defaults to 'carnet' for backward compat)
    const templateType = (formData.get("type") as string) || "carnet";
    const prefix = templateType === "certificate" ? "cert" : "carnet";

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${prefix}_${timestamp}_${originalName}`;
    const filePath = join(templatesDir, fileName);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      fileName,
      url: `/templates/${fileName}`,
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
