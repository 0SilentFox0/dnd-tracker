"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getBattleEvents } from "@/lib/api/battles";
import { battleQueryKey } from "@/lib/hooks/battles";
import { prependBattleLog } from "@/lib/utils/battle/client/apply-delta";
import type { BattleScene } from "@/types/api";
import type { BattleAction } from "@/types/battle";

const FIRST_EVENT_SEQ = 1;

export type BattleLogHistory = ReturnType<typeof useBattleLogHistory>;

export function useBattleLogHistory(campaignId: string, battleId: string, battleLog: BattleAction[] | undefined) {
  const queryClient = useQueryClient();

  const oldest = battleLog?.[0]?.actionIndex;

  const [exhaustedAt, setExhaustedAt] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: (before: number) => getBattleEvents(campaignId, battleId, { before }),
    onSuccess: (page, before) => {
      queryClient.setQueryData<BattleScene>(battleQueryKey(campaignId, battleId), (cached) =>
        cached ? prependBattleLog(cached, page.events) : cached,
      );

      if (!page.hasMore) setExhaustedAt(page.events[0]?.actionIndex ?? before);
    },
  });

  const canLoadEarlier = oldest !== undefined && oldest > FIRST_EVENT_SEQ && exhaustedAt !== oldest;

  return {
    canLoadEarlier,
    isLoading: mutation.isPending,
    loadEarlier: () => {
      if (oldest !== undefined) mutation.mutate(oldest);
    },
  };
}
