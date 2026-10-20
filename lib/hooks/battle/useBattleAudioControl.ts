"use client";

import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { writeAudioSnapshot } from "./audio-snapshot";

import { sendBattleAudio } from "@/lib/api/battle-audio";
import { ApiError } from "@/lib/api/client";
import { battleKeys } from "@/lib/hooks/battles";
import { useSingleFlight } from "@/lib/hooks/common";
import { errorMessage } from "@/lib/utils/common/error-message";
import type { BattleAudioCommand } from "@/types/audio";

export interface BattleAudioControl {
  send(cmd: BattleAudioCommand): void;
  pending: boolean;
}

export function useBattleAudioControl(args: { campaignId: string; battleId: string; enabled: boolean; onFailure(message: string): void }): BattleAudioControl | null {
  const { campaignId, battleId, enabled, onFailure } = args;

  const queryClient = useQueryClient();

  const singleFlight = useSingleFlight();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (cmd: BattleAudioCommand) => sendBattleAudio(campaignId, battleId, cmd),
    onSuccess: (fresh) => writeAudioSnapshot(queryClient, { campaignId, battleId }, fresh),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) void queryClient.invalidateQueries({ queryKey: battleKeys.audio(campaignId, battleId) });

      onFailure(errorMessage(error, "Не вдалося керувати музикою"));
    },
  });

  const control = useMemo(
    () => ({
      // помилку вже обробив onError
      send: (cmd: BattleAudioCommand) => void singleFlight(() => mutateAsync(cmd).catch(() => undefined)),
      pending: isPending,
    }),
    [singleFlight, mutateAsync, isPending],
  );

  return enabled ? control : null;
}
