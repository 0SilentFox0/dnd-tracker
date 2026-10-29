"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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

  return useMutation({
    mutationFn: (body: SourceApplyBody) => applySourceChanges(campaignId, body),
    onSuccess: (_result, body) => {
      if (body.apply.length === 0) {
        void queryClient.invalidateQueries({ queryKey: campaignKeys.sourceDiff(campaignId) });

        return;
      }

      void invalidateCampaignQueries(queryClient, campaignId);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) void queryClient.invalidateQueries({ queryKey: campaignKeys.sourceDiff(campaignId) });
    },
  });
}

export function useSourceSyncApply(campaignId: string, items: SourceDiffItem[]) {
  const t = useTranslations("campaigns");

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
        else setErrorState({ message: errorMessage(err, t("sourceSync.failed")), items });
      },
    });
  };

  return { run, reset, isPending: apply.isPending, staleNotice, error: errorState?.items === items ? errorState.message : null };
}

// new diff (refetch after 409 or apply) → reset to its defaults
const currentSelection = (s: { items: SourceDiffItem[]; selected: Set<string> }, items: SourceDiffItem[]) => (s.items === items ? s.selected : defaultSelection(items));

export function useSourceSyncSelection(items: SourceDiffItem[]) {
  const [state, setState] = useState(() => ({ items, selected: defaultSelection(items) }));

  const selected = currentSelection(state, items);

  const update = useCallback((change: (next: Set<string>) => void) =>
    setState((prev) => {
      const next = new Set(currentSelection(prev, items));

      change(next);

      return { items, selected: next };
    }), [items]);

  const toggle = useCallback((i: SourceDiffItem) => update((next) => void (next.delete(itemKey(i)) || next.add(itemKey(i)))), [update]);

  const setGroup = useCallback((scope: SourceSyncScope, on: boolean) =>
    update((next) => {
      for (const i of items) if (i.scope === scope) next[on ? "add" : "delete"](itemKey(i));
    }), [update, items]);

  const autoAdded = useMemo(() => autoAddedPreview(items, selected), [items, selected]);

  const refs = useMemo(() => toRefs(items, selected), [items, selected]);

  return { selected, isSelected: (i: SourceDiffItem) => selected.has(itemKey(i)), toggle, setGroup, autoAdded, refs };
}
