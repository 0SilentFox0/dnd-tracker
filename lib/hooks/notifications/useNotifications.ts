"use client";

import { useQuery } from "@tanstack/react-query";

import { notificationKeys } from "./keys";

import { getNotifications } from "@/lib/api/notifications";

const STALE_MS = 60_000;

export function useNotifications(campaignId: string, { enabled = true }: { enabled?: boolean } = {}) {
  const live = !!process.env.NEXT_PUBLIC_PUSHER_KEY;

  return useQuery({
    queryKey: notificationKeys.list(campaignId),
    queryFn: () => getNotifications(campaignId),
    enabled,
    staleTime: STALE_MS,
    refetchInterval: live ? false : STALE_MS,
  });
}
