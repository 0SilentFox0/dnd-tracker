"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { invalidateCampaignQueries } from "./invalidate";
import { campaignKeys } from "./keys";

import { ApiError } from "@/lib/api/client";
import { applySourceChanges, getSourceDiff } from "@/lib/api/source-sync";
import { autoAddedPreview, defaultSelection, itemKey, toRefs } from "@/lib/utils/campaigns/source-sync";
import { errorMessage } from "@/lib/utils/common/error-message";
import type { SourceApplyBody, SourceApplyResult, SourceDiffItem, SourceSyncScope } from "@/types/campaigns";

export function useSourceDiff(campaignId: string, enabled: boolean) {
  return useQuery({
    queryKey: campaignKeys.sourceDiff(campaignId),
    queryFn: () => getSourceDiff(campaignId),
    enabled,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useApplySourceChanges(campaignId: string) {
  const queryClient = useQueryClient();

  const router = useRouter();

  return useMutation({
    mutationFn: (body: SourceApplyBody) => applySourceChanges(campaignId, body),
    onSuccess: (_result, body) => {
      if (body.apply.length === 0) {
        void queryClient.invalidateQueries({ queryKey: campaignKeys.sourceDiff(campaignId) });

        return;
      }

      void invalidateCampaignQueries(queryClient, campaignId);
      router.refresh();
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) void queryClient.invalidateQueries({ queryKey: campaignKeys.sourceDiff(campaignId) });
    },
  });
}

export function useSourceSyncApply(campaignId: string, items: SourceDiffItem[]) {
  const apply = useApplySourceChanges(campaignId);

  const [errorState, setErrorState] = useState<{ message: string; items: SourceDiffItem[] } | null>(null);

  const [staleNotice, setStaleNotice] = useState(false);

  const reset = () => {
    setErrorState(null);
    setStaleNotice(false);
  };

  const run = (body: SourceApplyBody, onSuccess: (r: SourceApplyResult) => void) => {
    reset();
    apply.mutate(body, {
      onSuccess,
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409) setStaleNotice(true);
        else setErrorState({ message: errorMessage(err, "Помилка синхронізації"), items });
      },
    });
  };

  return { run, reset, isPending: apply.isPending, staleNotice, error: errorState?.items === items ? errorState.message : null };
}

export function useSourceSyncSelection(items: SourceDiffItem[]) {
  const [state, setState] = useState(() => ({ items, selected: defaultSelection(items) }));

  // new diff (refetch after 409 or apply) → reset to its defaults
  const current = (s: typeof state) => (s.items === items ? s.selected : defaultSelection(items));

  const selected = current(state);

  const update = (change: (next: Set<string>) => void) =>
    setState((prev) => {
      const next = new Set(current(prev));

      change(next);

      return { items, selected: next };
    });

  return {
    selected,
    isSelected: (i: SourceDiffItem) => selected.has(itemKey(i)),
    toggle: (i: SourceDiffItem) => update((next) => void (next.delete(itemKey(i)) || next.add(itemKey(i)))),
    setGroup: (scope: SourceSyncScope, on: boolean) =>
      update((next) => {
        for (const i of items) if (i.scope === scope) next[on ? "add" : "delete"](itemKey(i));
      }),
    autoAdded: autoAddedPreview(items, selected),
    refs: toRefs(items, selected),
  };
}
