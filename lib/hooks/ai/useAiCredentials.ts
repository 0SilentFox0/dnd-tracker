"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { aiKeys } from "./keys";

import { deleteAiCredential, getAiCredentials, patchAiCredential, saveAiCredential } from "@/lib/api/ai";
import { useOptionalNotify } from "@/lib/hooks/common";
import type { AiProvider } from "@/types/ai";

export function useAiCredentials() {
  const queryClient = useQueryClient();

  const notify = useOptionalNotify();

  const key = aiKeys.credentials();

  const query = useQuery({ queryKey: key, queryFn: getAiCredentials });

  const options = { onError: (e: Error) => notify(e.message), onSettled: () => queryClient.invalidateQueries({ queryKey: key }) };

  const saveMutation = useMutation({
    mutationFn: ({ provider, apiKey, defaultModel }: { provider: AiProvider; apiKey: string; defaultModel?: string | null }) =>
      saveAiCredential(provider, { apiKey, defaultModel }),
    ...options,
  });

  const patchMutation = useMutation({
    mutationFn: ({ provider, defaultModel }: { provider: AiProvider; defaultModel: string | null }) => patchAiCredential(provider, { defaultModel }),
    ...options,
  });

  const removeMutation = useMutation({ mutationFn: (provider: AiProvider) => deleteAiCredential(provider), ...options });

  return {
    query,
    credentials: query.data ?? [],
    save: (v: { provider: AiProvider; apiKey: string; defaultModel?: string | null }) => saveMutation.mutateAsync(v).then(() => true, () => false),
    patch: (v: { provider: AiProvider; defaultModel: string | null }) => patchMutation.mutateAsync(v).then(() => true, () => false),
    remove: (provider: AiProvider) => removeMutation.mutateAsync(provider).then(() => true, () => false),
    isPending: saveMutation.isPending || patchMutation.isPending || removeMutation.isPending,
  };
}
