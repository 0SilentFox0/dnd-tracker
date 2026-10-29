"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { showKeys } from "./keys";
import { writeShowSnapshot } from "./show-snapshot";

import { sendPuzzle } from "@/lib/api/show";
import { errorMessage } from "@/lib/utils/common/error-message";
import type { PuzzleCommand } from "@/types/show";

export interface PuzzleControl {
  send(cmd: PuzzleCommand): Promise<boolean>;
}

export function usePuzzleControl(campaignId: string, onFailure: (message: string) => void): PuzzleControl {
  const t = useTranslations("show");

  const queryClient = useQueryClient();

  const { mutateAsync } = useMutation({
    mutationFn: (cmd: PuzzleCommand) => sendPuzzle(campaignId, cmd),
    onSuccess: (fresh) => writeShowSnapshot(queryClient, campaignId, fresh),
    onError: (error) => {
      void queryClient.invalidateQueries({ queryKey: showKeys.state(campaignId) });

      onFailure(errorMessage(error, t("errors.puzzle")));
    },
  });

  return useMemo(
    () => ({
      send: (cmd: PuzzleCommand) =>
        mutateAsync(cmd).then(
          () => true,
          () => false,
        ),
    }),
    [mutateAsync],
  );
}
