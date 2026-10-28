"use client";

import { useQuery } from "@tanstack/react-query";

import { aiKeys } from "./keys";

import { getAiThreadMessages } from "@/lib/api/ai";

// the chat owns the messages once mounted, so a cached copy must never seed a later mount
export function useAiThreadMessages(campaignId: string, threadId: string) {
  const query = useQuery({
    queryKey: aiKeys.messages(campaignId, threadId),
    queryFn: () => getAiThreadMessages(campaignId, threadId),
    gcTime: 0,
    refetchOnWindowFocus: false,
  });

  return { query, messages: query.data?.messages };
}
