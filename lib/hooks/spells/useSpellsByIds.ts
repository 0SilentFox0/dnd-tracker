"use client";

import { useEffect } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSpellsByIds } from "@/lib/api/spells";
import { REFERENCE_STALE_MS } from "@/lib/providers/query-provider";

const IDLE_FALLBACK_MS = 1500;

const idsKey = (ids: string[]) => [...new Set(ids)].sort().join(",");

const spellsByIdsQuery = (campaignId: string, key: string) =>
  queryOptions({
    queryKey: ["spells", campaignId, "by-ids", key],
    queryFn: () => getSpellsByIds(campaignId, key.split(",")),
    staleTime: REFERENCE_STALE_MS,
  });

export function useSpellsByIds(campaignId: string, ids: string[], opts?: { enabled?: boolean }) {
  const key = idsKey(ids);

  return useQuery({ ...spellsByIdsQuery(campaignId, key), enabled: !!campaignId && !!key && (opts?.enabled ?? true) });
}

function whenIdle(run: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(run);

    return () => window.cancelIdleCallback(id);
  }

  const id = setTimeout(run, IDLE_FALLBACK_MS);

  return () => clearTimeout(id);
}

export function usePrefetchSpellsByIds(campaignId: string, ids: string[]) {
  const queryClient = useQueryClient();

  const key = idsKey(ids);

  useEffect(() => {
    if (!campaignId || !key) return;

    return whenIdle(() => void queryClient.prefetchQuery(spellsByIdsQuery(campaignId, key)));
  }, [queryClient, campaignId, key]);
}
