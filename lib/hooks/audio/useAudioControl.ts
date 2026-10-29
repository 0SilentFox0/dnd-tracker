"use client";

import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { writeAudioSnapshot } from "./audio-snapshot";
import type { AudioHost } from "./host";

import { ApiError } from "@/lib/api/client";
import { useSingleFlight } from "@/lib/hooks/common";
import { translateIssue } from "@/lib/i18n/translate-issue";
import { useTranslator } from "@/lib/i18n/use-translator";
import { errorMessage } from "@/lib/utils/common/error-message";
import type { BattleAudioCommand } from "@/types/audio";

export interface AudioControl {
  send(cmd: BattleAudioCommand): void;
  pending: boolean;
}

export function useAudioControl(host: AudioHost): AudioControl | null {
  const { queryKey, send, onFailure, isDM } = host;

  const t = useTranslator();

  const queryClient = useQueryClient();

  const singleFlight = useSingleFlight();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: send,
    onSuccess: (fresh) => writeAudioSnapshot(queryClient, queryKey, fresh),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) void queryClient.invalidateQueries({ queryKey });

      onFailure(translateIssue(t, { message: errorMessage(error, "music.player.controlFailed") }));
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

  return isDM ? control : null;
}
