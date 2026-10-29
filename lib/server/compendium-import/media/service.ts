import { CompendiumError } from "../parse";
import type { FetchedImage, fetchImportImage } from "./fetch-image";
import { type MediaProgress, mediaProgress } from "./queue";
import { MEDIA_LIMITS, type MediaItem, type MediaQueueState, type MediaReason } from "./types";

import type { storeCompendiumImage } from "@/lib/supabase/compendium-media-storage";
import type { Actor } from "@/lib/utils/api/actor";

export type MediaResult =
  | { id: string; ok: true; storedUrl: string }
  | { id: string; ok: false; reason: MediaReason; params?: { status?: number }; retryable: boolean };

export interface MediaClaimOptions { max: number; leaseMs: number; now: number; retryFailed: boolean }

export interface MediaRepository {
  claim(actor: Actor, runId: string, opts: MediaClaimOptions): Promise<{ items: MediaItem[]; known: Map<string, string> } | null>;
  release(actor: Actor, runId: string, ids: string[]): Promise<void>;
  apply(actor: Actor, runId: string, results: MediaResult[]): Promise<MediaQueueState>;
}

export interface MediaDeps {
  repository: MediaRepository;
  fetchImage: typeof fetchImportImage;
  store: typeof storeCompendiumImage;
  now?: () => number;
}

const variantOf = (item: MediaItem) => item.targets.some((t) => t.mediaId) ? "inline" as const : item.targets.find((t) => t.field)?.field ?? "inline" as const;

async function processItem(item: MediaItem, known: Map<string, string>, deps: MediaDeps): Promise<MediaResult> {
  const storedUrl = known.get(item.url);

  if (storedUrl) return { id: item.id, ok: true, storedUrl };

  try {
    const image: FetchedImage = await deps.fetchImage(item.url);

    if (!image.ok) return { id: item.id, ok: false, reason: image.reason, retryable: image.retryable, ...(image.params && { params: image.params }) };

    const stored = await deps.store(image, variantOf(item));

    if (stored.ok) return { id: item.id, ok: true, storedUrl: stored.value };

    const reason = stored.message as MediaReason;

    return { id: item.id, ok: false, reason, retryable: reason === "MEDIA_STORAGE_FAILED" };
  } catch {
    return { id: item.id, ok: false, reason: "MEDIA_FETCH_FAILED", retryable: true };
  }
}

export async function processMediaBatch(actor: Actor, runId: string, deps: MediaDeps, opts: { retryFailed?: boolean } = {}): Promise<MediaProgress> {
  if (!actor.isDM || actor.via !== "session") throw new CompendiumError("FORBIDDEN");

  const now = deps.now ?? Date.now;

  const started = now();

  const claimed = await deps.repository.claim(actor, runId, { max: MEDIA_LIMITS.batch, leaseMs: MEDIA_LIMITS.leaseMs, now: started, retryFailed: opts.retryFailed ?? false });

  if (!claimed) throw new CompendiumError("FORBIDDEN");

  const results: MediaResult[] = [];

  const unstarted: string[] = [];

  let next = 0;

  const worker = async () => {
    while (next < claimed.items.length) {
      const item = claimed.items[next++];

      if (now() - started >= MEDIA_LIMITS.deadlineMs) {
        unstarted.push(item.id);

        continue;
      }

      results.push(await processItem(item, claimed.known, deps));
    }
  };

  await Promise.all(Array.from({ length: Math.min(MEDIA_LIMITS.concurrency, claimed.items.length) }, worker));

  if (unstarted.length) await deps.repository.release(actor, runId, unstarted);

  return mediaProgress(runId, await deps.repository.apply(actor, runId, results));
}
