"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { aiKeys } from "./keys";

import { applyAiProposal, getAiProposals, rejectAiProposal } from "@/lib/api/ai";
import { useOptionalNotify } from "@/lib/hooks/common";
import { scenarioKeys } from "@/lib/hooks/scenario/keys";
import { showKeys } from "@/lib/hooks/show/keys";
import type { ScenarioPage } from "@/types/scenario";

type Options = { beforeApply?: () => Promise<boolean>; onApplied?: (page: ScenarioPage) => void };

export function useAiProposals(campaignId: string, pageId: string, { beforeApply, onApplied }: Options = {}) {
  const queryClient = useQueryClient();

  const notify = useOptionalNotify();

  const key = aiKeys.proposals(campaignId, pageId);

  const query = useQuery({ queryKey: key, queryFn: () => getAiProposals(campaignId, { pageId }) });

  const invalidate = useCallback(() => queryClient.invalidateQueries({ queryKey: key }), [queryClient, key]);

  const applyMutation = useMutation({
    mutationFn: async (id: string) => {
      const slideOnly = (query.data ?? []).find((p) => p.id === id)?.ops?.some((o) => o.op === "addSlide");

      if (!slideOnly && beforeApply && !(await beforeApply())) return null;

      return applyAiProposal(campaignId, id);
    },
    onSuccess: (result) => {
      if (!result) return;

      if ("deck" in result) {
        queryClient.invalidateQueries({ queryKey: showKeys.decks(campaignId) });
        queryClient.invalidateQueries({ queryKey: showKeys.deck(campaignId, result.deck.id) });

        return;
      }

      const page = result;

      queryClient.setQueryData(scenarioKeys.page(campaignId, pageId), page);
      onApplied?.(page);
    },
    onError: (e: Error) => notify(e.message),
    onSettled: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectAiProposal(campaignId, id),
    onError: (e: Error) => notify(e.message),
    onSettled: invalidate,
  });

  const all = query.data ?? [];

  return {
    all,
    pending: all.filter((p) => p.status === "pending"),
    byId: (id: string) => all.find((p) => p.id === id),
    apply: (id: string) => applyMutation.mutateAsync(id).then(() => undefined, () => undefined),
    reject: (id: string) => rejectMutation.mutateAsync(id).then(() => undefined, () => undefined),
    isApplying: applyMutation.isPending,
    refresh: invalidate,
  };
}
