"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { aiKeys } from "./keys";

import { applyAiProposal, getAiProposals, getAiProposalSummaries, rejectAiProposal } from "@/lib/api/ai";
import { useOptionalNotify } from "@/lib/hooks/common";
import { scenarioKeys } from "@/lib/hooks/scenario/keys";
import { showKeys } from "@/lib/hooks/show/keys";
import type { ScenarioPage } from "@/types/scenario";

type Options = { enabled?: boolean; full?: boolean; beforeApply?: () => Promise<boolean>; onApplied?: (page: ScenarioPage) => void };

export function useAiProposals(campaignId: string, pageId: string, { enabled = true, full = true, beforeApply, onApplied }: Options = {}) {
  const queryClient = useQueryClient();

  const notify = useOptionalNotify();

  const key = aiKeys.proposals(campaignId, pageId);

  const summaryKey = aiKeys.proposalSummaries(campaignId, pageId);

  const query = useQuery({ queryKey: key, queryFn: () => getAiProposals(campaignId, { pageId }), enabled: enabled && full });

  const summary = useQuery({ queryKey: summaryKey, queryFn: () => getAiProposalSummaries(campaignId, { pageId, status: "pending" }), enabled: enabled && !full });

  const invalidate = useCallback(async () => {
    await Promise.all([queryClient.invalidateQueries({ queryKey: key }), queryClient.invalidateQueries({ queryKey: summaryKey })]);
  }, [queryClient, key, summaryKey]);

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

  const pending = all.filter((p) => p.status === "pending");

  return {
    all,
    pending,
    pendingCount: full ? pending.length : (summary.data ?? []).length,
    byId: (id: string) => all.find((p) => p.id === id),
    apply: (id: string) => applyMutation.mutateAsync(id).then(() => undefined, () => undefined),
    reject: (id: string) => rejectMutation.mutateAsync(id).then(() => undefined, () => undefined),
    isApplying: applyMutation.isPending,
    refresh: invalidate,
  };
}
