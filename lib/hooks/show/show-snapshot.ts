import type { QueryClient } from "@tanstack/react-query";

import { showKeys } from "./keys";

import { writeAudioSnapshot } from "@/lib/hooks/audio";
import { mergeShow } from "@/lib/utils/show/merge-show";
import type { ShowSnapshot, ShowState } from "@/types/show";

/** Один вхід для GET, відповіді на команду і Pusher: стан показу за seq, аудіо — у кеш плеєра. */
export function writeShowSnapshot(queryClient: QueryClient, campaignId: string, incoming: { show: ShowState | null | undefined; clockOffsetMs?: number | null }): void {
  queryClient.setQueryData<ShowSnapshot>(showKeys.state(campaignId), (prev) => {
    const show = mergeShow(prev?.show ?? null, incoming.show);

    const clockOffsetMs = incoming.clockOffsetMs ?? prev?.clockOffsetMs ?? null;

    return prev && show === prev.show && clockOffsetMs === prev.clockOffsetMs ? prev : { show, clockOffsetMs };
  });

  writeAudioSnapshot(queryClient, showKeys.audio(campaignId), { audio: incoming.show?.audio, clockOffsetMs: incoming.clockOffsetMs });
}
