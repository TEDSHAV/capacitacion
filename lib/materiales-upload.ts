import { MaterialDidactico, TipoMaterial } from "@/types/material-didactico";
import { registerUploadedMaterial } from "@/app/actions/material-didactico";

export interface MaterialUploadProgress {
  loaded: number;
  total: number;
  percent: number;
  speedFormatted?: string;
  stage: "preparing" | "uploading" | "optimizing" | "completed" | "error";
  statusText: string;
  detailText?: string;
  optimizingSeconds?: number;
}

export type MaterialProgressCallback = (progress: MaterialUploadProgress) => void;

export async function uploadMaterialDirectToB2(
  file: File,
  meta: {
    cursoId?: number;
    osiId?: number;
    tipoMaterial: TipoMaterial;
    titulo: string;
    descripcion?: string;
    autoOptimize?: boolean;
  },
  onProgress?: MaterialProgressCallback,
  signal?: AbortSignal,
): Promise<MaterialDidactico> {
  const isPptx = file.name.toLowerCase().endsWith(".pptx");

  onProgress?.({
    loaded: 0,
    total: file.size,
    percent: 0,
    stage: "uploading",
    statusText: "Iniciando transferencia segura...",
    detailText: "Conectando con el servidor para transmitir el archivo.",
  });

  const formData = new FormData();
  formData.append("file", file);
  if (meta.cursoId) formData.append("id_curso", String(meta.cursoId));
  if (meta.osiId) formData.append("id_osi", String(meta.osiId));
  formData.append("tipo_material", meta.tipoMaterial);
  formData.append("titulo", meta.titulo);
  if (meta.descripcion) formData.append("descripcion", meta.descripcion);
  formData.append("auto_optimize", meta.autoOptimize !== false ? "true" : "false");

  const startTime = Date.now();
  let optimizingTimer: NodeJS.Timeout | null = null;
  let optimizingStart = 0;

  const response = await new Promise<MaterialDidactico>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/materiales/upload");
    xhr.responseType = "json";

    const cleanup = () => {
      if (optimizingTimer) {
        clearInterval(optimizingTimer);
        optimizingTimer = null;
      }
    };

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        cleanup();
        return reject(new Error("Subida cancelada por el usuario"));
      }
      signal.addEventListener("abort", () => {
        xhr.abort();
        cleanup();
        reject(new Error("Subida cancelada por el usuario"));
      });
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
          const elapsedSec = (Date.now() - startTime) / 1000;
          let speedFormatted = "";
          if (elapsedSec > 0.5) {
            const bytesPerSec = event.loaded / elapsedSec;
            const mbPerSec = (bytesPerSec / (1024 * 1024)).toFixed(1);
            speedFormatted = `${mbPerSec} MB/s`;
          }

          onProgress({
            loaded: event.loaded,
            total: event.total,
            percent,
            speedFormatted,
            stage: "uploading",
            statusText: `Subiendo archivo al servidor... ${percent}%`,
            detailText: `Paso 1 de 2: Transfiriendo datos (${(event.loaded / 1024 / 1024).toFixed(1)} de ${(event.total / 1024 / 1024).toFixed(1)} MB)`,
          });
        }
      };

      xhr.upload.onload = () => {
        // Upload reached 100%, now server is compressing / re-encoding videos
        optimizingStart = Date.now();

        const updateOptimizingStatus = () => {
          const elapsed = Math.max(1, Math.round((Date.now() - optimizingStart) / 1000));
          let statusText = "⚡ Optimizando imágenes y videos con FFmpeg...";
          let detailText = `Paso 2 de 2: Re-codificando videos internos a 720p H.264 (${elapsed}s transcurridos, tiempo habitual ~20-45s)...`;

          if (elapsed > 25) {
            detailText = `Paso 2 de 2: Empaquetando presentación optimizada y enviando a Backblaze B2 (${elapsed}s transcurridos)...`;
          }

          if (!isPptx || meta.autoOptimize === false) {
            statusText = "Guardando recurso en Backblaze B2...";
            detailText = `Paso 2 de 2: Guardando archivo en almacenamiento (${elapsed}s)...`;
          }

          onProgress?.({
            loaded: file.size,
            total: file.size,
            percent: 100,
            stage: "optimizing",
            statusText,
            detailText,
            optimizingSeconds: elapsed,
          });
        };

        updateOptimizingStatus();
        optimizingTimer = setInterval(updateOptimizingStatus, 1000);
      };
    }

    xhr.onload = () => {
      cleanup();
      const result = xhr.response;
      if (xhr.status >= 200 && xhr.status < 300 && result?.success && result?.data) {
        onProgress?.({
          loaded: file.size,
          total: file.size,
          percent: 100,
          stage: "completed",
          statusText: "¡Material procesado y guardado con éxito!",
          detailText: "El archivo optimizado ya está disponible en la nube para facilitadores.",
        });
        resolve(result.data as MaterialDidactico);
      } else {
        const errorMsg =
          result?.error ||
          xhr.statusText ||
          `Error en el servidor (${xhr.status})`;
        reject(new Error(errorMsg));
      }
    };

    xhr.onerror = () => {
      cleanup();
      reject(new Error("Error de red durante la subida al servidor"));
    };

    xhr.send(formData);
  });

  return response;
}
