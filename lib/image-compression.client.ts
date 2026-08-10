/**
 * Client-side image compression for mobile uploads.
 * Uses canvas to resize and compress images before sending to server.
 * This reduces bandwidth usage and prevents "Body exceeded 1MB limit" errors.
 */

interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Compresses an image File on the client side using canvas.
 * - Resizes to max dimensions (default 2000x2000)
 * - Converts to JPEG at specified quality (default 0.8)
 * - Returns a new File object
 * - Non-image files are returned unchanged
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const { maxWidth = 2000, maxHeight = 2000, quality = 0.8 } = options;

  // Only compress image files
  if (!file.type.startsWith("image/")) {
    return file;
  }

  // Skip small files (< 200KB) that are already likely fine
  if (file.size < 200 * 1024) {
    return file;
  }

  try {
    // Create an object URL for the image
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = objectUrl;
    });

    // Calculate scaled dimensions
    let { width, height } = img;
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    // Draw to canvas
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(objectUrl);
      return file;
    }

    // White background for JPEG (handles transparency in PNGs)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    URL.revokeObjectURL(objectUrl);

    // Convert to JPEG blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Failed to compress image"))),
        "image/jpeg",
        quality,
      );
    });

    // Generate new filename with .jpg extension
    const originalName = file.name.replace(/\.[^.]+$/, "");
    const newFileName = `${originalName}.jpg`;

    return new File([blob], newFileName, { type: "image/jpeg" });
  } catch (error) {
    console.error("[compressImage] Error, returning original:", error);
    return file;
  }
}
