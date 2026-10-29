import type { PlannedWrite } from "../plan";
import { MEDIA_LIMITS, mediaIdOf,type MediaItem, type MediaQueueState, type MediaReason, type MediaRef } from "./types";

export interface MediaPlanSummary { queued: number; skipped: Partial<Record<MediaReason, number>> }

export type MediaReportState = MediaPlanSummary & { items?: MediaItem[] };

type QueueWrite = Pick<PlannedWrite, "kind" | "localId" | "nested" | "media">;

const bump = (skipped: MediaQueueState["skipped"], reason: MediaReason) => {
  skipped[reason] = (skipped[reason] ?? 0) + 1;
};

const targetOf = (write: QueueWrite, ref: MediaRef) => ref.role === "inline"
  ? { kind: write.kind, localId: write.localId, mediaId: ref.mediaId }
  : { kind: write.kind, localId: write.localId, field: ref.role };

export function buildMediaQueue(writes: QueueWrite[], limit: number = MEDIA_LIMITS.perImport): MediaQueueState {
  const items = new Map<string, MediaItem>();

  const skipped: MediaQueueState["skipped"] = {};

  for (const write of writes) {
    for (const ref of write.media ?? []) {
      if (ref.skip) {
        bump(skipped, ref.skip);
        continue;
      }

      let item = items.get(ref.url);

      if (!item) {
        if (items.size >= limit) {
          bump(skipped, "MEDIA_LIMIT");
          continue;
        }

        item = { id: mediaIdOf(ref.url), url: ref.url, targets: [], status: "pending", attempts: 0 };
        items.set(ref.url, item);
      }

      item.targets.push(targetOf(write, ref));
    }
  }

  return { version: 1, items: [...items.values()], skipped };
}

export const summarizeQueue = (state: MediaQueueState): MediaPlanSummary => ({ queued: state.items.length, skipped: state.skipped });
