"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { showKeys } from "./keys";
import { useSlideUpload } from "./useSlideUpload";

import { saveDeck } from "@/lib/api/decks";
import { useNotify } from "@/lib/hooks/common";
import { errorMessage } from "@/lib/utils/common/error-message";
import { type DeckDraft, deckDraftReducer } from "@/lib/utils/show/deck-draft";
import type { SlideDeck } from "@/types/show";

const draftOf = (deck: SlideDeck): DeckDraft => ({ title: deck.title, slides: deck.slides });

export function useDeckEditor(campaignId: string, deck: SlideDeck) {
  const queryClient = useQueryClient();

  const notify = useNotify();

  const [saved, setSaved] = useState(() => draftOf(deck));

  const [draft, dispatch] = useReducer(deckDraftReducer, saved);

  const dirty = draft !== saved;

  const fail = useCallback((message: string) => void notify(message), [notify]);

  const { upload, progress, newSlideId } = useSlideUpload(campaignId, fail);

  const mutation = useMutation({
    mutationFn: (data: DeckDraft) => saveDeck(campaignId, deck.id, data),
    onSuccess: (fresh) => {
      const next = draftOf(fresh);

      setSaved(next);
      dispatch({ type: "reset", draft: next });
      queryClient.setQueryData(showKeys.deck(campaignId, deck.id), fresh);
      void queryClient.invalidateQueries({ queryKey: showKeys.decks(campaignId) });
    },
    onError: (e) => fail(errorMessage(e, "Не вдалося зберегти набір")),
  });

  useEffect(() => {
    if (!dirty) return;

    const warn = (e: BeforeUnloadEvent) => e.preventDefault();

    window.addEventListener("beforeunload", warn);

    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const addFiles = useCallback(async (files: File[]) => dispatch({ type: "add", slides: await upload(files) }), [upload]);

  const addUrl = useCallback((url: string) => dispatch({ type: "add", slides: [{ id: newSlideId(), imageUrl: url.trim() }] }), [newSlideId]);

  return {
    draft,
    dispatch,
    dirty,
    save: async () => {
      await mutation.mutateAsync(draft).catch(() => undefined);
    },
    saving: mutation.isPending,
    upload: { addFiles, addUrl, progress },
  };
}
