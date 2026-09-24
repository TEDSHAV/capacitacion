import { MaterialDidactico, TipoMaterial } from "@/types/material-didactico";

export interface MaterialUploadProgress {
  loaded: number;
  total: number;
  percent: number; // 0 to 100 overall
  speedFormatted?: string;
  stage: "preparing" | "uploading" | "optimizing" | "saving" | "completed" | "error";
  statusText: string;
  detailText?: string;
  optimizingSeconds?: number;
  subStage?: "analyzing" | "videos" | "images" | "packaging" | "b2_upload" | "db";
  current?: number;
  totalItems?: number;
  optResult?: {
    originalSize: string;
    finalSize: string;
    reduction: string;
    images?: number;
    videos?: number;
  } | null;
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
    visibleFacilitador?: boolean;
    parentMaterialId?: string;
    versionNotes?: string;
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
  formData.append("visible_facilitador", meta.visibleFacilitador !== false ? "true" : "false");
  if (meta.parentMaterialId) formData.append("parent_material_id", meta.parentMaterialId);
  if (meta.versionNotes) formData.append("version_notes", meta.versionNotes);

  const startTime = Date.now();
  let optimizingTimer: NodeJS.Timeout | null = null;
  let optimizingStart = 0;
  let serverCompletedData: MaterialDidactico | null = null;
  let serverOptResult: any = null;
  let lastServerStage = "";
  let lastServerMessage = "";
  let lastServerDetail = "";
  let lastServerPercent = 0;

  const response = await new Promise<MaterialDidactico>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/materiales/upload");
    // Leave responseType as text so we can stream chunked NDJSON lines
    xhr.responseType = "text";

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

    let processedLength = 0;

    const parseStreamChunks = () => {
      try {
        const text = xhr.responseText || "";
        if (text.length <= processedLength) return;

        const unprocessed = text.substring(processedLength);
        const lines = unprocessed.split("\n");

        // The last element might be incomplete if chunk arrived mid-line,
        // unless request finished (readyState === 4)
        const isDone = xhr.readyState === 4;
        const countToProcess = isDone ? lines.length : lines.length - 1;

        let bytesConsumed = 0;
        for (let i = 0; i < countToProcess; i++) {
          const line = lines[i].trim();
          bytesConsumed += lines[i].length + 1; // +1 for the \n

          if (!line) continue;

          try {
            const event = JSON.parse(line);

            if (event.stage === "error") {
              cleanup();
              reject(new Error(event.error || "Error al procesar archivo en el servidor"));
              return;
            }

            if (event.stage === "completed" && event.data) {
              serverCompletedData = event.data;
              serverOptResult = event.optResult || null;
            }

            lastServerStage = event.stage || lastServerStage;
            lastServerMessage = event.message || lastServerMessage;
            lastServerDetail = event.detail || lastServerDetail;
            if (typeof event.percent === "number") {
              lastServerPercent = event.percent;
            }

            const elapsedSec = optimizingStart
              ? Math.max(1, Math.round((Date.now() - optimizingStart) / 1000))
              : 0;

            onProgress?.({
              loaded: file.size,
              total: file.size,
              percent: Math.min(100, Math.max(50, lastServerPercent || 50)),
              stage:
                event.stage === "completed"
                  ? "completed"
                  : event.stage === "saving"
                  ? "saving"
                  : "optimizing",
              subStage: event.subStage,
              current: event.current,
              totalItems: event.total,
              statusText: event.message || lastServerMessage,
              detailText: event.detail || lastServerDetail,
              optimizingSeconds: elapsedSec,
              optResult: event.optResult || serverOptResult,
            });
          } catch {
            // ignore JSON parse error for incomplete line
          }
        }

        processedLength += bytesConsumed;
      } catch {
        // stream parsing safety
      }
    };

    // 1. Upload Phase: Track network transmission from browser to server
    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const rawPercent = Math.round((event.loaded / event.total) * 100);
          // Scale upload progress from 0% to 50% of global process
          const overallPercent = Math.min(48, Math.round(rawPercent * 0.48));
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
            percent: overallPercent,
            speedFormatted,
            stage: "uploading",
            statusText: `Subiendo archivo al servidor... ${rawPercent}%`,
            detailText: `Paso 1 de 3: Transfiriendo datos (${(event.loaded / 1024 / 1024).toFixed(1)} de ${(event.total / 1024 / 1024).toFixed(1)} MB)`,
          });
        }
      };

      xhr.upload.onload = () => {
        // Upload reached 100%, now server is running optimization/repackaging
        optimizingStart = Date.now();

        const updateOptimizingStatus = () => {
          const elapsed = Math.max(1, Math.round((Date.now() - optimizingStart) / 1000));

          // If we haven't received a live server message yet, use intelligent animated stages
          let currentStatus = lastServerMessage;
          let currentDetail = lastServerDetail;
          let stagePercent = lastServerPercent;

          if (!currentStatus) {
            if (!isPptx || meta.autoOptimize === false) {
              currentStatus = "Guardando recurso en Backblaze B2...";
              currentDetail = `Paso 2 de 2: Transfiriendo a almacenamiento en la nube (${elapsed}s)...`;
              stagePercent = Math.min(95, 50 + elapsed * 5);
            } else {
              // Intelligent simulation while server performs heavy operations
              if (elapsed < 6) {
                currentStatus = "🔍 Analizando diapositivas y extrayendo elementos...";
                currentDetail = `Paso 2 de 3: Inspeccionando estructura interna (${elapsed}s)...`;
                stagePercent = 52 + elapsed;
              } else if (elapsed < 20) {
                currentStatus = "⚡ Optimizando imágenes y videos con FFmpeg / Sharp...";
                currentDetail = `Paso 2 de 3: Re-codificando medios a 720p H.264 (${elapsed}s transcurridos, tiempo habitual ~15-35s)...`;
                stagePercent = Math.min(78, 58 + Math.round((elapsed - 6) * 1.5));
              } else if (elapsed < 35) {
                currentStatus = "📦 Re-empaquetando presentación con compresión DEFLATE...";
                currentDetail = `Paso 2 de 3: Reconstruyendo archivo optimizado para distribución (${elapsed}s)...`;
                stagePercent = Math.min(88, 78 + Math.round((elapsed - 20) * 0.7));
              } else {
                currentStatus = "☁️ Transfiriendo archivo optimizado a Backblaze B2...";
                currentDetail = `Paso 3 de 3: Finalizando sincronización en la nube (${elapsed}s)...`;
                stagePercent = Math.min(96, 88 + Math.round((elapsed - 35) * 0.4));
              }
            }
          }

          onProgress?.({
            loaded: file.size,
            total: file.size,
            percent: Math.min(98, Math.max(50, stagePercent || 50)),
            stage: "optimizing",
            statusText: currentStatus,
            detailText: currentDetail,
            optimizingSeconds: elapsed,
            optResult: serverOptResult,
          });
        };

        updateOptimizingStatus();
        optimizingTimer = setInterval(updateOptimizingStatus, 1000);
      };
    }

    // 2. Response stream / chunk progress
    xhr.onprogress = () => {
      parseStreamChunks();
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState >= 3) {
        parseStreamChunks();
      }
    };

    // 3. Final completion handler
    xhr.onload = () => {
      cleanup();
      parseStreamChunks();

      if (serverCompletedData) {
        onProgress?.({
          loaded: file.size,
          total: file.size,
          percent: 100,
          stage: "completed",
          statusText: "¡Material procesado y guardado con éxito!",
          detailText: "El archivo optimizado ya está disponible en la nube para facilitadores.",
          optResult: serverOptResult,
        });
        resolve(serverCompletedData);
        return;
      }

      // Fallback in case raw JSON was returned without streaming
      try {
        const result = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && (result?.success || result?.data)) {
          const finalRecord = result.data || result;
          onProgress?.({
            loaded: file.size,
            total: file.size,
            percent: 100,
            stage: "completed",
            statusText: "¡Material procesado y guardado con éxito!",
            detailText: "El archivo optimizado ya está disponible en la nube para facilitadores.",
          });
          resolve(finalRecord as MaterialDidactico);
          return;
        } else {
          const errorMsg = result?.error || `Error en el servidor (${xhr.status})`;
          reject(new Error(errorMsg));
          return;
        }
      } catch {
        if (xhr.status >= 200 && xhr.status < 300) {
          reject(new Error("Respuesta incompleta del servidor"));
        } else {
          reject(new Error(`Error de servidor (${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => {
      cleanup();
      reject(new Error("Error de red durante la transferencia al servidor"));
    };

    xhr.send(formData);
  });

  return response;
}
