"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  CertificateGeneration,
  ManualOSIInput,
} from "@/types";

export interface CertificateDraft {
  savedAt: string;
  certificateData: CertificateGeneration;
  manualOSIData?: ManualOSIInput;
  osiInputMode: "automatic" | "manual";
}

interface UseCertificateDraftProps {
  userId: string;
  osiNumber: string | null;
  enabled: boolean;
  certificateData: CertificateGeneration;
  manualOSIData: ManualOSIInput;
  osiInputMode: "automatic" | "manual";
  onRestore: (draft: CertificateDraft) => void;
}

const DRAFT_KEY_PREFIX = "cert_draft_";
const DRAFT_EXPIRY_DAYS = 7;

function buildKey(userId: string, osiNumber: string): string {
  return `${DRAFT_KEY_PREFIX}${userId}_${osiNumber}`;
}

function isExpired(savedAt: string): boolean {
  try {
    const saved = new Date(savedAt).getTime();
    if (isNaN(saved)) return true;
    const ageMs = Date.now() - saved;
    return ageMs > DRAFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return true;
  }
}

function readDraft(key: string): CertificateDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CertificateDraft;
    if (!parsed.savedAt || isExpired(parsed.savedAt)) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeDraft(key: string, draft: CertificateDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // Quota exceeded or other storage error — silently ignore
  }
}

function removeDraft(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Cleanup expired drafts on mount. Scans all keys with the draft prefix.
 */
function cleanupExpiredDrafts(): void {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(DRAFT_KEY_PREFIX)) continue;
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as CertificateDraft;
        if (!parsed.savedAt || isExpired(parsed.savedAt)) {
          keysToRemove.push(key);
        }
      } catch {
        // Corrupted entry — remove it
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

export function useCertificateDraft({
  userId,
  osiNumber,
  enabled,
  certificateData,
  manualOSIData,
  osiInputMode,
  onRestore,
}: UseCertificateDraftProps) {
  const [draft, setDraft] = useState<CertificateDraft | null>(null);
  const [hasDraftInStorage, setHasDraftInStorage] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const justSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRestoreRef = useRef(onRestore);
  const currentKeyRef = useRef<string | null>(null);

  // Keep onRestore ref fresh without retriggering the osiNumber effect
  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  // One-time expired-draft cleanup on mount
  useEffect(() => {
    cleanupExpiredDrafts();
  }, []);

  // When osiNumber changes, check for an existing draft (debounced)
  useEffect(() => {
    if (!enabled) {
      setDraft(null);
      setHasDraftInStorage(false);
      currentKeyRef.current = null;
      return;
    }

    const normalizedOsi = osiNumber?.trim() || null;

    if (!normalizedOsi) {
      setDraft(null);
      setHasDraftInStorage(false);
      currentKeyRef.current = null;
      return;
    }

    const key = buildKey(userId, normalizedOsi);
    currentKeyRef.current = key;

    // Debounce the draft check to avoid flicker while typing in manual mode
    const timer = setTimeout(() => {
      // Stale check: if osiNumber changed again during the debounce, skip
      if (currentKeyRef.current !== key) return;
      const existing = readDraft(key);
      setDraft(existing);
      setHasDraftInStorage(!!existing);
    }, 300);

    return () => clearTimeout(timer);
  }, [userId, osiNumber, enabled]);

  const saveDraft = useCallback(() => {
    if (!enabled) return;
    const normalizedOsi = osiNumber?.trim();
    if (!normalizedOsi) return;

    const key = buildKey(userId, normalizedOsi);
    const newDraft: CertificateDraft = {
      savedAt: new Date().toISOString(),
      certificateData,
      manualOSIData,
      osiInputMode,
    };
    writeDraft(key, newDraft);
    setHasDraftInStorage(true);
    setJustSaved(true);

    if (justSavedTimerRef.current) {
      clearTimeout(justSavedTimerRef.current);
    }
    justSavedTimerRef.current = setTimeout(() => {
      setJustSaved(false);
    }, 2000);
  }, [enabled, osiNumber, userId, certificateData, manualOSIData, osiInputMode]);

  const restoreDraft = useCallback(() => {
    setDraft(null);
    const key = currentKeyRef.current;
    if (key) {
      const existing = readDraft(key);
      if (existing) {
        onRestoreRef.current(existing);
      }
    }
  }, []);

  const dismissDraft = useCallback(() => {
    const key = currentKeyRef.current;
    if (key) {
      removeDraft(key);
    }
    setDraft(null);
    setHasDraftInStorage(false);
  }, []);

  const clearDraft = useCallback(() => {
    const key = currentKeyRef.current;
    if (key) {
      removeDraft(key);
    }
    setHasDraftInStorage(false);
  }, []);

  // Cleanup justSaved timer on unmount
  useEffect(() => {
    return () => {
      if (justSavedTimerRef.current) {
        clearTimeout(justSavedTimerRef.current);
      }
    };
  }, []);

  return {
    draft,
    hasDraftInStorage,
    saveDraft,
    restoreDraft,
    dismissDraft,
    clearDraft,
    justSaved,
  };
}
