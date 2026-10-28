"use client";

import { useQueryClient } from "@tanstack/react-query";

import { notificationKeys } from "./keys";

import { usePusherChannel } from "@/lib/hooks/common";
import { NOTIFICATIONS_CHANGED_EVENT, notifyChannelName } from "@/lib/pusher/channels";
import type { NotificationsChangedEvent } from "@/types/notifications";

export function useNotificationsSync(campaignId: string, userId: string | null): void {
  const queryClient = useQueryClient();

  usePusherChannel(userId ? notifyChannelName(userId) : null, {
    [NOTIFICATIONS_CHANGED_EVENT]: (data) => {
      if ((data as NotificationsChangedEvent).campaignId === campaignId) {
        void queryClient.invalidateQueries({ queryKey: notificationKeys.list(campaignId) });
      }
    },
  });
}
