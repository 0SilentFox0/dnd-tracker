import type { ParticipantSnapshot } from "./types";

export const SNAPSHOT_CACHE_MAX = 1_000;

/**
 * Content-addressed (snapshotHash → snapshot) LRU, per server instance. Entries never go stale: every
 * write of `battle_participants.snapshot` (saveBattle) writes its `snapshotHash` alongside.
 * Stored as JSON so each read is a private copy the engine may mutate.
 */
export function createSnapshotCache(max: number) {
  const entries = new Map<string, string>();

  return {
    get(hash: string): ParticipantSnapshot | undefined {
      const json = entries.get(hash);

      if (json === undefined) return undefined;

      entries.delete(hash);
      entries.set(hash, json);

      return JSON.parse(json) as ParticipantSnapshot;
    },
    remember(hash: string, snapshot: unknown): void {
      entries.delete(hash);
      entries.set(hash, JSON.stringify(snapshot));

      while (entries.size > max) {
        const oldest = entries.keys().next().value;

        if (oldest === undefined) break;

        entries.delete(oldest);
      }
    },
    clear(): void {
      entries.clear();
    },
  };
}

export const snapshotCache = createSnapshotCache(SNAPSHOT_CACHE_MAX);

export const clearSnapshotCache = () => snapshotCache.clear();
