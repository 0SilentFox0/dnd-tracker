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

export function useShowAudioHost({ campaignId, isDM, onFailure }: { campaignId: string; isDM: boolean; onFailure(message: string): void }): AudioHost {
  const queryClient = useQueryClient();

  const { show } = useShowState(campaignId);

  return useMemo(() => {
    const apply = async (pending: Promise<ShowSnapshot>) => {
      const fresh = await pending;

      writeShowSnapshot(queryClient, campaignId, fresh);

      return { audio: fresh.show?.audio ?? null, clockOffsetMs: fresh.clockOffsetMs };
    };

    return {
      campaignId,
      isDM,
      queryKey: showKeys.audio(campaignId),
      seed: show?.audio,
      fetch: () => apply(getShow(campaignId)),
      send: (cmd: BattleAudioCommand) => apply(sendShow(campaignId, { action: "audio", command: cmd })),
      onFailure,
    };
  }, [campaignId, isDM, show?.audio, queryClient, onFailure]);
}
