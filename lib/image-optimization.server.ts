import sharp from "sharp";
import { join } from "path";
import { writeFile, mkdir } from "fs/promises";

interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Optimizes a signature image for storage and PDF embedding.
 * Converts to PNG with palette-based optimization (great for signatures with few colors).
 * Resizes if necessary and strips metadata.
 */
export async function optimizeSignatureImage(
  buffer: Buffer,
  options: OptimizeOptions = {},
): Promise<Buffer> {
  const { maxWidth = 1024, maxHeight = 1024 } = options;

  try {
    const sharpInstance = sharp(buffer);

    // Get image metadata to decide if resizing is needed
    const metadata = await sharpInstance.metadata();

    let pipeline = sharpInstance
      .rotate() // Auto-rotate based on EXIF
      .resize({
        width: maxWidth,
        height: maxHeight,
        fit: "inside",
        withoutEnlargement: true,
      })
      .png({
        quality: 80,
        compressionLevel: 6,
      });

    return await pipeline.toBuffer();
  } catch (error) {
    console.error("Error optimizing signature image:", error);
    // If optimization fails, return original buffer as fallback
    return buffer;
  }
}

/**
 * Saves an optimized signature image to the filesystem.
 */
export async function saveOptimizedSignature(
  file: File,
  type: string,
  filename_prefix: string = "",
): Promise<{ filename: string; filepath: string; url: string }> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Optimize the buffer
  const optimizedBuffer = await optimizeSignatureImage(buffer);

  // Create signatures directory if it doesn't exist
  const signaturesDir = join(process.cwd(), "public", "signatures");
  await mkdir(signaturesDir, { recursive: true });

  // Generate unique filename
  const timestamp = Date.now();
  const nameWithoutExt = file.name.replace(/\.[^.]+$/, ""); // strip extension to avoid double .png.png
  const sanitizedOriginalName = nameWithoutExt.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${type}_${timestamp}_${sanitizedOriginalName}.png`;
  const filepath = join(signaturesDir, filename);

  // Save to public/signatures directory
  await writeFile(filepath, optimizedBuffer);

  return {
    filename,
    filepath,
    url: `/signatures/${filename}`,
  };
}
