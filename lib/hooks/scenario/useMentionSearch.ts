"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { searchMentions } from "@/lib/api/scenario";
import type { MentionOption } from "@/types/scenario";

export function useMentionSearch(campaignId: string): (query: string) => Promise<MentionOption[]> {
  const queryClient = useQueryClient();

  return useCallback(
    (query: string) => queryClient.fetchQuery({ queryKey: ["scenario-mentions", campaignId, query.trim()], queryFn: () => searchMentions(campaignId, query.trim()), staleTime: 60_000 }).catch(() => []),
    [campaignId, queryClient],
  );
}
