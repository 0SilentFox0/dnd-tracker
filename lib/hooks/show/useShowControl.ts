"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { showKeys } from "./keys";
import { writeShowSnapshot } from "./show-snapshot";

import { ApiError } from "@/lib/api/client";
import { sendShow } from "@/lib/api/show";
import { battleKeys } from "@/lib/hooks/battles";
import { errorMessage } from "@/lib/utils/common/error-message";
import type { ShowCommand } from "@/types/show";

export interface ShowControl {
  send(cmd: ShowCommand): Promise<boolean>;
  pending: boolean;
}

export function useShowControl(campaignId: string, onFailure: (message: string) => void): ShowControl {
  const t = useTranslations("show");

  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (cmd: ShowCommand) => sendShow(campaignId, cmd),
    onSuccess: (fresh, cmd) => {
      writeShowSnapshot(queryClient, campaignId, fresh);

      if (cmd.action === "open" || cmd.action === "end") void queryClient.invalidateQueries({ queryKey: battleKeys.active() });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) void queryClient.invalidateQueries({ queryKey: showKeys.state(campaignId) });

      onFailure(errorMessage(error, t("errors.control")));
    },
  });

  return useMemo(
    () => ({
      send: (cmd: ShowCommand) =>
        mutateAsync(cmd).then(
          () => true,
          () => false,
        ),
      pending: isPending,
    }),
    [mutateAsync, isPending],
  );
}
