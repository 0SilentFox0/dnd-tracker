"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { notificationKeys } from "./keys";

import { markNotificationsRead } from "@/lib/api/notifications";
import { matchesRead } from "@/lib/utils/notifications/select";
import type { MarkNotificationsReadData, PlayerNotification } from "@/types/notifications";

export function useMarkRead(campaignId: string) {
  const queryClient = useQueryClient();

  const key = notificationKeys.list(campaignId);

  const mutation = useMutation({
    mutationFn: (data: MarkNotificationsReadData) => markNotificationsRead(campaignId, data),
    onMutate: (data) => {
      queryClient.setQueryData<PlayerNotification[]>(key, (list) => list?.filter((n) => !matchesRead(n, data)));
    },
    onError: () => void queryClient.invalidateQueries({ queryKey: key }),
  });

  return { markRead: (data: MarkNotificationsReadData) => mutation.mutateAsync(data).then(() => undefined, () => undefined) };
}
