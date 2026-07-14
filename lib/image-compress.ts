/**
 * Image compression utilities for reducing PDF file size.
 *
 * Converts PNG images (which are embedded uncompressed in PDFs by jsPDF)
 * to compressed JPEG, dramatically reducing the output PDF size.
 */

/**
 * Convert a browser-side image (URL, data URL, or HTMLImageElement)
 * to a JPEG data URL with the given quality and max dimensions.
 *
 * @param source Image source: URL, data URL, or HTMLImageElement
 * @param quality JPEG quality 0-1 (default 0.82 — visually near-lossless)
 * @param maxWidth Optional downscale target width in pixels
 */
export async function compressImageToJpeg(
  source: string | HTMLImageElement,
  quality: number = 0.82,
  maxWidth?: number
): Promise<string> {
  if (typeof window === "undefined") {
    // Server environment: just return original (server uses fs buffer directly)
    return typeof source === "string" ? source : "";
  }

  const img: HTMLImageElement =
    typeof source === "string"
      ? await loadImage(source)
      : source;

  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  let targetW = srcW;
  let targetH = srcH;
  if (maxWidth && srcW > maxWidth) {
    const ratio = maxWidth / srcW;
    targetW = Math.round(srcW * ratio);
    targetH = Math.round(srcH * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return typeof source === "string" ? source : "";

  // Fill white background (JPEG doesn't support transparency)
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);

  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Server-side placeholder - returns original PNG.
 * For actual JPEG compression on server, install sharp and use image-compress.server.ts
 */
export async function compressServerImageToJpeg(
  base64Png: string,
  _quality?: number,
  _maxWidth?: number
): Promise<{ base64: string; format: "JPEG" | "PNG" }> {
  // sharp can't be imported in client components; return PNG and rely on zlib compression
  return { base64: base64Png, format: "PNG" };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}
