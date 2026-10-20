"use client";

import { useCallback, useReducer, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { showKeys } from "./keys";
import { useDeck } from "./useDecks";
import { useSlideUpload } from "./useSlideUpload";

import { saveDeck } from "@/lib/api/decks";
import { useNotify, useUnsavedChangesGuard } from "@/lib/hooks/common";
import { errorMessage } from "@/lib/utils/common/error-message";
import { type DeckDraft, deckDraftReducer, newSlideId } from "@/lib/utils/show/deck-draft";
import type { SlideDeck } from "@/types/show";

const draftOf = (deck: SlideDeck): DeckDraft => ({ title: deck.title, slides: deck.slides });

export function useDeckEditor(campaignId: string, deck: SlideDeck) {
  const queryClient = useQueryClient();

  const notify = useNotify();

  const { data: server = deck } = useDeck(campaignId, deck.id, { initial: deck });

  const [saved, setSaved] = useState(() => ({ draft: draftOf(server), updatedAt: server.updatedAt }));

  const [draft, dispatch] = useReducer(deckDraftReducer, saved.draft);

  const dirty = draft !== saved.draft;

  const adopt = (fresh: SlideDeck) => {
    const next = { draft: draftOf(fresh), updatedAt: fresh.updatedAt };

    setSaved(next);
    dispatch({ type: "reset", draft: next.draft });
  };

  const { upload, progress } = useSlideUpload(campaignId, notify);

  const mutation = useMutation({
    mutationFn: (data: DeckDraft) => saveDeck(campaignId, deck.id, { ...data, expectedUpdatedAt: saved.updatedAt }),
    onSuccess: (fresh) => {
      adopt(fresh);
      queryClient.setQueryData(showKeys.deck(campaignId, deck.id), fresh);
      void queryClient.invalidateQueries({ queryKey: showKeys.decks(campaignId) });
    },
    onError: (e) => void notify(errorMessage(e, "Не вдалося зберегти набір")),
  });

  if (server.updatedAt !== saved.updatedAt && !dirty) adopt(server);

  useUnsavedChangesGuard(dirty);

  const addFiles = useCallback(async (files: File[]) => dispatch({ type: "add", slides: await upload(files) }), [upload]);

  const addUrl = useCallback((url: string) => dispatch({ type: "add", slides: [{ id: newSlideId(), imageUrl: url.trim() }] }), []);

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
