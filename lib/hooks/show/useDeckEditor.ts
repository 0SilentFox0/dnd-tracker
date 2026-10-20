"use client";

import { useCallback, useReducer, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { showKeys } from "./keys";
import { useDeck } from "./useDecks";
import { useSlideUpload } from "./useSlideUpload";

import { saveDeck } from "@/lib/api/decks";
import { useNotify, useUnsavedChangesGuard } from "@/lib/hooks/common";
import { errorMessage } from "@/lib/utils/common/error-message";
import { type DeckDraft, deckDraftReducer } from "@/lib/utils/show/deck-draft";
import type { SlideDeck } from "@/types/show";

const draftOf = (deck: SlideDeck): DeckDraft => ({ title: deck.title, slides: deck.slides });

export function useDeckEditor(campaignId: string, deck: SlideDeck) {
  const queryClient = useQueryClient();

  const notify = useNotify();

  const { data: server = deck } = useDeck(campaignId, deck.id, { initial: deck });

  const [saved, setSaved] = useState(() => draftOf(server));

  // updatedAt, на якому стоїть чернетка: PUT з ним відхилиться, якщо набір змінили деінде
  const [base, setBase] = useState(server.updatedAt);

  const [draft, dispatch] = useReducer(deckDraftReducer, saved);

  const dirty = draft !== saved;

  const fail = useCallback((message: string) => void notify(message), [notify]);

  const { upload, progress, newSlideId } = useSlideUpload(campaignId, fail);

  const mutation = useMutation({
    mutationFn: (data: DeckDraft) => saveDeck(campaignId, deck.id, { ...data, expectedUpdatedAt: base }),
    onSuccess: (fresh) => {
      const next = draftOf(fresh);

      setBase(fresh.updatedAt);
      setSaved(next);
      dispatch({ type: "reset", draft: next });
      queryClient.setQueryData(showKeys.deck(campaignId, deck.id), fresh);
      void queryClient.invalidateQueries({ queryKey: showKeys.decks(campaignId) });
    },
    onError: (e) => fail(errorMessage(e, "Не вдалося зберегти набір")),
  });

  if (server.updatedAt !== base && !dirty) {
    const next = draftOf(server);

    setBase(server.updatedAt);
    setSaved(next);
    dispatch({ type: "reset", draft: next });
  }

  useUnsavedChangesGuard(dirty);

  const addFiles = useCallback(async (files: File[]) => dispatch({ type: "add", slides: await upload(files) }), [upload]);

  const addUrl = useCallback((url: string) => dispatch({ type: "add", slides: [{ id: newSlideId(), imageUrl: url.trim() }] }), [newSlideId]);

  return {
    draft,
    dispatch,
    dirty,
    save: () =>
      mutation.mutateAsync(draft).then(
        () => true,
        () => false,
      ),
    saving: mutation.isPending,
    upload: { addFiles, addUrl, progress },
  };
}
