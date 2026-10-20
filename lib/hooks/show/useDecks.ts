"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showKeys } from "./keys";

import { createDeck, deleteDeck, getDeck, getDecks } from "@/lib/api/decks";
import type { SlideDeck, SlideDeckSummary } from "@/types/show";

export function useDecks(campaignId: string, options: { initial?: SlideDeckSummary[]; enabled?: boolean } = {}) {
  return useQuery<SlideDeckSummary[]>({
    queryKey: showKeys.decks(campaignId),
    queryFn: () => getDecks(campaignId),
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    ...(options.initial && { initialData: options.initial }),
  });
}

export function useDeck(campaignId: string, deckId: string | null, options: { initial?: SlideDeck } = {}) {
  return useQuery<SlideDeck>({
    queryKey: showKeys.deck(campaignId, deckId ?? ""),
    queryFn: () => getDeck(campaignId, deckId as string),
    enabled: !!deckId,
    staleTime: 30_000,
    ...(options.initial && { initialData: options.initial }),
  });
}

export function useDeckMutations(campaignId: string) {
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: showKeys.decks(campaignId) });

  const create = useMutation({ mutationFn: (title: string) => createDeck(campaignId, { title }), onSuccess: invalidate });

  const remove = useMutation({ mutationFn: (deckId: string) => deleteDeck(campaignId, deckId), onSuccess: invalidate });

  return {
    create: (title: string) => create.mutateAsync(title),
    remove: async (deckId: string) => {
      await remove.mutateAsync(deckId);
    },
    pending: create.isPending || remove.isPending,
  };
}
