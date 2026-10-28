"use client";

import { useQueryClient } from "@tanstack/react-query";

import { showKeys } from "./keys";
import { writeShowSnapshot } from "./show-snapshot";

import { usePusherChannel } from "@/lib/hooks/common";
import { SHOW_STATE_EVENT, showChannelName } from "@/lib/pusher/channels";
import type { ShowEvent } from "@/types/show";

export function usePusherShowSync(campaignId: string): void {
  const queryClient = useQueryClient();

  usePusherChannel(
    showChannelName(campaignId),
    {
      [SHOW_STATE_EVENT]: (data) => {
        const show = (data as Partial<ShowEvent> | null)?.show;

        if (!show || typeof show.seq !== "number") return;

        writeShowSnapshot(queryClient, campaignId, { show });
      },
    },
    {
      // стан із HTML старший за підписку: події між ними загубилися б
      onSubscribed: () => void queryClient.invalidateQueries({ queryKey: showKeys.state(campaignId) }),
      onError: (error) => console.warn("[show-sync] show channel subscription failed", error),
    },
  );
}
