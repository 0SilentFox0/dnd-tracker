"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { showKeys } from "./keys";
import { writeShowSnapshot } from "./show-snapshot";

import { getShow } from "@/lib/api/show";
import type { ShowSnapshot, ShowState } from "@/types/show";

/** Сервер кладе стан у кеш через PrefetchedQuery; далі — Pusher і повторний GET після перепідписки. */
export function useShowState(campaignId: string): { show: ShowState | null } {
  const queryClient = useQueryClient();

  const { data } = useQuery<ShowSnapshot>({
    queryKey: showKeys.state(campaignId),
    queryFn: async () => {
      writeShowSnapshot(queryClient, campaignId, await getShow(campaignId));

      return queryClient.getQueryData<ShowSnapshot>(showKeys.state(campaignId)) ?? { show: null, clockOffsetMs: null };
    },
    staleTime: Infinity,
    // без Pusher стан не доходить подіями — повільний polling
    refetchInterval: process.env.NEXT_PUBLIC_PUSHER_KEY ? false : 30_000,
    refetchOnWindowFocus: false,
  });

  return { show: data?.show ?? null };
}
