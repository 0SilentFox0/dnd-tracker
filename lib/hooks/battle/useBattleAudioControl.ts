"use client";

import { useMemo, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { writeAudioSnapshot } from "./audio-snapshot";

import { sendBattleAudio } from "@/lib/api/battle-audio";
import { ApiError } from "@/lib/api/client";
import { battleKeys } from "@/lib/hooks/battles";
import type { BattleAudioCommand } from "@/types/audio";

export interface BattleAudioControl {
  send(cmd: BattleAudioCommand): void;
  pending: boolean;
}

export function useBattleAudioControl(args: { campaignId: string; battleId: string; enabled: boolean; onFailure(message: string): void }): BattleAudioControl | null {
  const { campaignId, battleId, enabled, onFailure } = args;

  const queryClient = useQueryClient();

  // disabled={pending} діє лише після рендеру: другий клік подвійного натискання встигає раніше
  const inFlight = useRef(false);

  const { mutate, isPending } = useMutation({
    mutationFn: (cmd: BattleAudioCommand) => sendBattleAudio(campaignId, battleId, cmd),
    onSuccess: (fresh) => writeAudioSnapshot(queryClient, { campaignId, battleId }, fresh),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) void queryClient.invalidateQueries({ queryKey: battleKeys.audio(campaignId, battleId) });

      onFailure(error instanceof Error && error.message ? error.message : "Не вдалося керувати музикою");
    },
    onSettled: () => {
      inFlight.current = false;
    },
  });

  const control = useMemo(
    () => ({
      send: (cmd: BattleAudioCommand) => {
        if (inFlight.current) return;

        inFlight.current = true;
        mutate(cmd);
      },
      pending: isPending,
    }),
    [mutate, isPending],
  );

  return enabled ? control : null;
}
