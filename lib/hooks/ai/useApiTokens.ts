"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { aiKeys } from "./keys";

import { createApiToken, getApiTokens, revokeApiToken } from "@/lib/api/ai";
import { useOptionalNotify } from "@/lib/hooks/common";
import type { CreateApiTokenInput, CreatedApiToken } from "@/types/ai";

export function useApiTokens(campaignId: string) {
  const queryClient = useQueryClient();

  const notify = useOptionalNotify();

  const key = aiKeys.apiTokens(campaignId);

  const query = useQuery({ queryKey: key, queryFn: () => getApiTokens(campaignId) });

  const options = { onError: (e: Error) => notify(e.message), onSettled: () => queryClient.invalidateQueries({ queryKey: key }) };

  const createMutation = useMutation({ mutationFn: (input: CreateApiTokenInput) => createApiToken(campaignId, input), ...options });

  const revokeMutation = useMutation({ mutationFn: (id: string) => revokeApiToken(campaignId, id), ...options });

  return {
    query,
    tokens: query.data ?? [],
    create: (input: CreateApiTokenInput): Promise<CreatedApiToken | null> => createMutation.mutateAsync(input).catch(() => null),
    revoke: (id: string) => revokeMutation.mutateAsync(id).then(() => true, () => false),
  };
}
