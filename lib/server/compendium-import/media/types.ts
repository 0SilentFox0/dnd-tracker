import { createHash } from "node:crypto";

import type { TargetKind } from "../types";

export type MediaRole = "avatar" | "icon" | "inline";

export type MediaReason =
  | "MEDIA_INVALID_URL" | "MEDIA_HTTPS_ONLY" | "MEDIA_INTERNAL_PATH" | "MEDIA_LIMIT" | "MEDIA_EXTRA" | "MEDIA_NESTED"
  | "MEDIA_PRIVATE_HOST" | "MEDIA_DNS" | "MEDIA_TIMEOUT" | "MEDIA_TOO_LARGE" | "MEDIA_REDIRECTS" | "MEDIA_HTTP_STATUS"
  | "MEDIA_BAD_FORMAT" | "MEDIA_FETCH_FAILED" | "MEDIA_STORAGE_FAILED" | "MEDIA_TARGET_CUSTOMIZED" | "MEDIA_TARGET_GONE";

export interface MediaRef { url: string; role: MediaRole; path: string; mediaId?: string; alt?: string; skip?: MediaReason }

export interface MediaTarget { kind: TargetKind; localId: string; field?: "avatar" | "icon"; mediaId?: string; status?: "saved" | "skipped"; reason?: MediaReason }

export interface MediaItem {
  id: string;
  url: string;
  targets: MediaTarget[];
  status: "pending" | "saved" | "failed";
  reason?: MediaReason;
  params?: { status?: number };
  retryable?: boolean;
  storedUrl?: string;
  leaseUntil?: number;
  attempts: number;
}

export interface MediaQueueState { version: 1; items: MediaItem[]; skipped: Partial<Record<MediaReason, number>> }

export const MEDIA_LIMITS = { perImport: 1000, bytes: 1024 * 1024, urlLength: 1024, batch: 30, concurrency: 6, deadlineMs: 40_000, leaseMs: 90_000, maxAttempts: 3, knownRuns: 50, failuresShown: 100 } as const;

export const mediaIdOf = (url: string): string => createHash("sha256").update(url).digest("hex").slice(0, 24);
