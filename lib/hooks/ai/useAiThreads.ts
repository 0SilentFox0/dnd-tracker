"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { aiKeys } from "./keys";

import { createAiThread, getAiThreads, patchAiThread } from "@/lib/api/ai";
import { useOptionalNotify } from "@/lib/hooks/common";
import type { AiThread } from "@/types/ai";

type CreateBody = Parameters<typeof createAiThread>[1];
type PatchBody = Parameters<typeof patchAiThread>[2];

export function useAiThreads(campaignId: string, pageId?: string) {
  const queryClient = useQueryClient();

  const notify = useOptionalNotify();

  const key = aiKeys.threads(campaignId, pageId);

  const query = useQuery({ queryKey: key, queryFn: () => getAiThreads(campaignId, pageId) });

  const options = { onError: (e: Error) => notify(e.message), onSettled: () => queryClient.invalidateQueries({ queryKey: key }) };

  const createMutation = useMutation({
    mutationFn: (body: CreateBody) => createAiThread(campaignId, body),
    onSuccess: (thread) => queryClient.setQueryData<AiThread[]>(key, (old) => [thread, ...(old ?? [])]),
    ...options,
  });

  const patchMutation = useMutation({ mutationFn: ({ threadId, body }: { threadId: string; body: PatchBody }) => patchAiThread(campaignId, threadId, body), ...options });

  return {
    query,
    threads: query.data ?? [],
    create: (body: CreateBody) => createMutation.mutateAsync(body),
    patch: (threadId: string, body: PatchBody) => patchMutation.mutateAsync({ threadId, body }).then(() => true, () => false),
  };
}
