import { UploadedAttachment } from "@/types/email";

export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percent: number;
}

export type UploadProgressCallback = (progress: UploadProgressEvent) => void;

/**
 * Uploads a file directly to Backblaze B2 using a presigned S3 PUT URL.
 *
 * Flow:
 * 1. Client calls /api/email-attachments/presign to get a short-lived presigned upload URL (<50ms).
 * 2. Browser opens an XMLHttpRequest directly to Backblaze B2, streaming the file.
 * 3. Real-time byte progress is reported to the onProgress callback.
 * 4. Resolves with UploadedAttachment metadata ready for sendAssignmentEmail.
 */
export async function uploadFileDirectToB2(
  file: File,
  onProgress?: UploadProgressCallback,
  signal?: AbortSignal,
): Promise<UploadedAttachment> {
  const contentType = file.type || "application/octet-stream";

  // 1. Get presigned upload URL
  const presignRes = await fetch("/api/email-attachments/presign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filename: file.name,
      contentType,
      size: file.size,
    }),
    signal,
  });

  if (!presignRes.ok) {
    const err = await presignRes.json().catch(() => ({}));
    throw new Error(err.error || "No se pudo preparar la subida del archivo");
  }

  const { uploadUrl, key, name, size, contentType: resolvedContentType } =
    await presignRes.json();

  // 2. Direct upload to B2 via XHR to capture live progress
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", resolvedContentType || contentType);

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return reject(new Error("Subida cancelada"));
      }
      signal.addEventListener("abort", () => {
        xhr.abort();
        reject(new Error("Subida cancelada"));
      });
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.min(
            100,
            Math.round((event.loaded / event.total) * 100),
          );
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percent,
          });
        }
      };
    }

    xhr.onload = () => {
      // S3/B2 PutObject returns 200 OK or 204 No Content
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) {
          onProgress({
            loaded: file.size,
            total: file.size,
            percent: 100,
          });
        }
        resolve();
      } else {
        reject(
          new Error(
            `Error de Backblaze B2 (${xhr.status}): ${xhr.statusText || "Fallo en la subida directa"}`,
          ),
        );
      }
    };

    xhr.onerror = () => {
      reject(
        new Error(
          "Error de red al conectar directamente con Backblaze B2. Verifique la configuración CORS del bucket.",
        ),
      );
    };

    xhr.ontimeout = () => {
      reject(new Error("Tiempo de espera agotado al subir a Backblaze B2"));
    };

    xhr.send(file);
  });

  return {
    key,
    name,
    size,
    contentType: resolvedContentType || contentType,
  };
}
