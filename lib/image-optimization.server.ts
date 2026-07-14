import sharp from "sharp";

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

    const pipeline = sharpInstance
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
 * Optimizes a document image (photo of a list) for storage and OCR.
 * Compresses to JPEG with reasonable quality and resizes to a max dimension.
 */
export async function optimizeDocumentImage(
  buffer: Buffer,
  options: OptimizeOptions = {},
): Promise<Buffer> {
  const { maxWidth = 2000, maxHeight = 2000, quality = 80 } = options;

  console.log("[optimizeDocumentImage] ENTRY", { inputSize: buffer.length, maxWidth, maxHeight, quality });

  try {
    const sharpInstance = sharp(buffer);

    const metadata = await sharpInstance.metadata();
    console.log("[optimizeDocumentImage] Image metadata:", { format: metadata.format, width: metadata.width, height: metadata.height, orientation: metadata.orientation });

    const pipeline = sharpInstance
      .rotate() // Auto-rotate based on EXIF
      .resize({
        width: maxWidth,
        height: maxHeight,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: quality,
        progressive: true,
        mozjpeg: true, // Use mozjpeg for better compression
      });

    const result = await pipeline.toBuffer();
    console.log("[optimizeDocumentImage] Success:", { outputSize: result.length, ratio: `${(result.length / buffer.length * 100).toFixed(1)}%` });
    return result;
  } catch (error) {
    console.error("[optimizeDocumentImage] CATCH Error:", error instanceof Error ? { message: error.message, stack: error.stack } : String(error));
    console.log("[optimizeDocumentImage] Returning original buffer as fallback, size:", buffer.length);
    return buffer;
  }
}

/**
 * Saves an optimized signature image as base64 for database storage.
 * This approach works reliably in containerized environments (Coolify, Docker, etc.)
 * without requiring filesystem access or volume mounts.
 */
export async function saveOptimizedSignature(
  file: File,
  type: string,
  filename_prefix: string = "",
): Promise<{ filename: string; imagen_base64: string }> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Optimize the buffer
  const optimizedBuffer = await optimizeSignatureImage(buffer);

  // Convert to base64
  const base64String = optimizedBuffer.toString("base64");

  // Generate filename for reference (not used for storage)
  const timestamp = Date.now();
  const nameWithoutExt = file.name.replace(/\.[^.]+$/, ""); // strip extension to avoid double .png.png
  const sanitizedOriginalName = nameWithoutExt.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${type}_${timestamp}_${sanitizedOriginalName}.png`;

  return {
    filename,
    imagen_base64: base64String,
  };
}
