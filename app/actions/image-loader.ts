"use server";

import { readFile } from "fs/promises";
import { join } from "path";

/**
 * Load an image from the public directory and return it as a base64 data URL
 * This is more reliable than fetch() for production deployments
 */
export async function loadImageAsBase64(imagePath: string) {
  try {
    // Remove leading slash if present
    const cleanPath = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
    
    // Construct full filesystem path
    const fullPath = join(process.cwd(), "public", cleanPath);
    
    // Read file as buffer
    const buffer = await readFile(fullPath);
    
    // Convert to base64
    const base64 = buffer.toString("base64");
    
    // Determine mime type from file extension
    const ext = cleanPath.split(".").pop()?.toLowerCase() || "png";
    const mimeType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
    
    // Return as data URL
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(`Failed to load image: ${imagePath}`, error);
    throw new Error(
      `Failed to load image: ${imagePath} - ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
