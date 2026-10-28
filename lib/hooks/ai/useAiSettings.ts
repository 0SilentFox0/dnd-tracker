"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { aiKeys } from "./keys";

import { getAiSettings, saveAiSettings } from "@/lib/api/ai";
import { useOptionalNotify } from "@/lib/hooks/common";

export function useAiSettings(campaignId: string) {
  const queryClient = useQueryClient();

  const notify = useOptionalNotify();

  const key = aiKeys.settings(campaignId);

  const query = useQuery({ queryKey: key, queryFn: () => getAiSettings(campaignId) });

  const mutation = useMutation({
    mutationFn: (text: string) => saveAiSettings(campaignId, { instructions: text }),
    onSuccess: (data) => queryClient.setQueryData(key, data),
    onError: (e: Error) => notify(e.message),
  });

  return {
    query,
    instructions: query.data?.instructions ?? "",
    save: (text: string) => mutation.mutateAsync(text).then(() => true, () => false),
    isPending: mutation.isPending,
  };
}
