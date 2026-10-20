"use client";

import { useMemo } from "react";

import { useBattleScene } from "./useBattleScene";

import { getBattleAudio, sendBattleAudio } from "@/lib/api/battle-audio";
import type { AudioHost } from "@/lib/hooks/audio";
import { battleKeys } from "@/lib/hooks/battles";
import type { BattleAudioCommand } from "@/types/audio";

export function useBattleAudioHost(): AudioHost {
  const { campaignId, battleId, battle, viewer: { isDM }, toast: { show } } = useBattleScene();

  return useMemo(
    () => ({
      campaignId,
      isDM,
      queryKey: battleKeys.audio(campaignId, battleId),
      seed: battle.audio,
      fetch: () => getBattleAudio(campaignId, battleId),
      send: (cmd: BattleAudioCommand) => sendBattleAudio(campaignId, battleId, cmd),
      onFailure: show,
    }),
    [campaignId, battleId, isDM, battle.audio, show],
  );
}
