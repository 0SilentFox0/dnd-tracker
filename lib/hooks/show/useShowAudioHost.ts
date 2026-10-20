"use client";

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { showKeys } from "./keys";
import { writeShowSnapshot } from "./show-snapshot";
import { useShowState } from "./useShowState";

import { getShow, sendShow } from "@/lib/api/show";
import type { AudioHost } from "@/lib/hooks/audio";
import type { BattleAudioCommand } from "@/types/audio";
import type { ShowSnapshot } from "@/types/show";

const toAudio = (s: ShowSnapshot) => ({ audio: s.show?.audio ?? null, clockOffsetMs: s.clockOffsetMs });

export function useShowAudioHost({ campaignId, isDM, onFailure }: { campaignId: string; isDM: boolean; onFailure(message: string): void }): AudioHost {
  const queryClient = useQueryClient();

  const { show } = useShowState(campaignId);

  const queryKey = useMemo(() => showKeys.audio(campaignId), [campaignId]);

  return useMemo(
    () => ({
      campaignId,
      isDM,
      queryKey,
      seed: show?.audio,
      fetch: async () => {
        const fresh = await getShow(campaignId);

        writeShowSnapshot(queryClient, campaignId, fresh);

        return toAudio(fresh);
      },
      send: async (cmd: BattleAudioCommand) => {
        const fresh = await sendShow(campaignId, { action: "audio", command: cmd });

        writeShowSnapshot(queryClient, campaignId, fresh);

        return toAudio(fresh);
      },
      onFailure,
    }),
    [campaignId, isDM, queryKey, show?.audio, queryClient, onFailure],
  );
}
