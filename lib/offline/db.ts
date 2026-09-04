"use client";

import Dexie, { type Table } from "dexie";

export type SyncOpStatus = "pending" | "syncing" | "done" | "error";

export type SyncOpType =
  | "saveParticipants"
  | "uploadAttachment"
  | "deleteAttachment"
  | "saveAcknowledgment"
  | "submitSurvey"
  | "toggleUnifiedStep"
  | "toggleAttachmentReceived"
  | "updateCertificateScore";

export type PortalDataType =
  | "cliente_batches"
  | "cliente_certs"
  | "facilitador_osis"
  | "facilitador_participants"
  | "dash_home"
  | "dash_osis"
  | "dash_osi_filters"
  | "dash_certs"
  | "dash_cert_filters"
  | "dash_seguimiento"
  | "dash_indicadores"
  | "dash_reportes"
  | "dash_cursos"
  | "dash_facilitadores"
  | "dash_asignaciones"
  | "dash_eval_facilitadores"
  | "dash_gen_cert_refdata"
  | "survey_osi_data";

export interface SyncOp {
  id?: number;
  type: SyncOpType;
  /** Key for deduplication / grouping (e.g. `osi_${osiId}_participants`) */
  groupKey: string;
  /** JSON-serializable payload for the API route */
  payload: Record<string, unknown>;
  /** Optional blob data (for attachment uploads) stored separately */
  blobId?: number | null;
  status: SyncOpStatus;
  retries: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
}

export interface OfflineBlob {
  id?: number;
  /** Associated group key to link with SyncOp */
  groupKey: string;
  /** The file blob */
  blob: Blob;
  /** Original filename */
  name: string;
  /** MIME type */
  type: string;
  createdAt: number;
}

export interface PortalDataCache {
  /** Unique key, e.g. `cliente_batches_page_1` or `cliente_certs_osi_123` */
  key: string;
  /** Type of cached data for namespace queries */
  type: PortalDataType;
  /** JSON-serialized data */
  data: string;
  /** Timestamp of when the data was cached */
  cachedAt: number;
}

export interface ClientSession {
  id?: number;
  /** Which portal this session belongs to */
  portal: "facilitador" | "cliente";
  /** User ID from the server session */
  userId: number;
  /** Display name for the user */
  nombre: string;
  /** Timestamp of login */
  loggedInAt: number;
  /** Expiry timestamp (matches cookie maxAge: 30 days) */
  expiresAt: number;
}

export class OfflineDB extends Dexie {
  syncOps!: Table<SyncOp, number>;
  blobs!: Table<OfflineBlob, number>;
  portalData!: Table<PortalDataCache, string>;
  clientSession!: Table<ClientSession, number>;

  constructor() {
    super("capacitacion-offline");
    this.version(1).stores({
      syncOps: "++id, type, groupKey, status, createdAt",
      blobs: "++id, groupKey, createdAt",
    });
    this.version(2).stores({
      syncOps: "++id, type, groupKey, status, createdAt",
      blobs: "++id, groupKey, createdAt",
      portalData: "key, type, cachedAt",
    });
    this.version(3).stores({
      syncOps: "++id, type, groupKey, status, createdAt",
      blobs: "++id, groupKey, createdAt",
      portalData: "key, type, cachedAt",
      clientSession: "++id, portal, expiresAt",
    });
  }
}

let dbInstance: OfflineDB | null = null;

export function getOfflineDB(): OfflineDB {
  if (!dbInstance) {
    dbInstance = new OfflineDB();
  }
  return dbInstance;
}
