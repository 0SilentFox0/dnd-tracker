"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { showKeys } from "./keys";
import { writeShowSnapshot } from "./show-snapshot";

import { usePusherChannel } from "@/lib/hooks/common";
import { worldKeys } from "@/lib/hooks/world/keys";
import { SHOW_STATE_EVENT, showChannelName, WORLD_CHANGED_EVENT } from "@/lib/pusher/channels";
import type { ShowEvent } from "@/types/show";
import type { WorldChangedEvent } from "@/types/world";

const WORLD_THROTTLE_MS = 1000;

export function usePusherShowSync(campaignId: string, enabled = true): void {
  const queryClient = useQueryClient();

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastWorldSeq = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const invalidateWorld = () => {
    for (const queryKey of [worldKeys.viewAll(campaignId), worldKeys.mapAll(campaignId), worldKeys.maps(campaignId), worldKeys.log(campaignId)]) void queryClient.invalidateQueries({ queryKey });
  };

  usePusherChannel(
    enabled ? showChannelName(campaignId) : null,
    {
      [SHOW_STATE_EVENT]: (data) => {
        const show = (data as Partial<ShowEvent> | null)?.show;

        if (!show || typeof show.seq !== "number") return;

        writeShowSnapshot(queryClient, campaignId, { show });
      },
      [WORLD_CHANGED_EVENT]: (data) => {
        const seq = (data as Partial<WorldChangedEvent> | null)?.seq;

        if (typeof seq !== "number" || seq === lastWorldSeq.current) return;

        lastWorldSeq.current = seq;

        // trailing: остання подія серії встигає потрапити в одне перечитування
        if (timer.current) return;

        timer.current = setTimeout(() => {
          timer.current = null;
          invalidateWorld();
        }, WORLD_THROTTLE_MS);
      },
    },
    {
      // стан із HTML старший за підписку: події між ними загубилися б
      onSubscribed: () => {
        void queryClient.invalidateQueries({ queryKey: showKeys.state(campaignId) });
        void queryClient.invalidateQueries({ queryKey: worldKeys.viewAll(campaignId) });
      },
      onError: (error) => console.warn("[show-sync] show channel subscription failed", error),
    },
  );
}
