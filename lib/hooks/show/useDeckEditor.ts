"use client";

import { useCallback, useReducer, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { showKeys } from "./keys";
import { useDeck } from "./useDecks";
import { useSlideUpload } from "./useSlideUpload";

import { ApiError } from "@/lib/api/client";
import { getDeck, saveDeck } from "@/lib/api/decks";
import { SLIDE_MAX_EDGE_PX } from "@/lib/constants/show";
import { useConfirm, useNotify, useUnsavedChangesGuard } from "@/lib/hooks/common";
import { errorMessage } from "@/lib/utils/common/error-message";
import { fitWithin } from "@/lib/utils/common/image-resize";
import { randomPuzzleSeed } from "@/lib/utils/puzzle/generate";
import { type DeckDraft, deckDraftReducer, newSlideId, sameDraft } from "@/lib/utils/show/deck-draft";
import type { SlideDeck } from "@/types/show";

const draftOf = (deck: SlideDeck): DeckDraft => ({ title: deck.title, slides: deck.slides });

const isConflict = (e: unknown) => e instanceof ApiError && e.status === 409;

export function useDeckEditor(campaignId: string, deck: SlideDeck) {
  const t = useTranslations("show");

  const queryClient = useQueryClient();

  const notify = useNotify();

  const confirm = useConfirm();

  const { data: server = deck } = useDeck(campaignId, deck.id, { initial: deck });

  const [saved, setSaved] = useState(() => ({ draft: draftOf(server), updatedAt: server.updatedAt }));

  const [draft, dispatch] = useReducer(deckDraftReducer, saved.draft);

  const dirty = !sameDraft(draft, saved.draft);

  const adopt = (fresh: SlideDeck) => {
    const next = { draft: draftOf(fresh), updatedAt: fresh.updatedAt };

    setSaved(next);
    dispatch({ type: "reset", draft: next.draft });
  };

  const { upload, progress } = useSlideUpload(campaignId, notify);

  const mutation = useMutation({
    mutationFn: ({ sent, expectedUpdatedAt }: { sent: DeckDraft; expectedUpdatedAt: string }) => saveDeck(campaignId, deck.id, { ...sent, expectedUpdatedAt }),
    onSuccess: (fresh, { sent }) => {
      setSaved({ draft: draftOf(fresh), updatedAt: fresh.updatedAt });
      dispatch({ type: "saved", sent, saved: draftOf(fresh) });
      queryClient.setQueryData(showKeys.deck(campaignId, deck.id), fresh);
      void queryClient.invalidateQueries({ queryKey: showKeys.decks(campaignId) });
    },
  });

  if (server.updatedAt !== saved.updatedAt && !dirty) adopt(server);

  useUnsavedChangesGuard(dirty);

  const addFiles = useCallback(async (files: File[]) => dispatch({ type: "add", slides: await upload(files) }), [upload]);

  const addPuzzle = useCallback(
    async (file: File) => {
      const bitmap = await createImageBitmap(file);

      const { width, height } = fitWithin(bitmap.width, bitmap.height, SLIDE_MAX_EDGE_PX);

      bitmap.close();

      const [slide] = await upload([file]);

      if (slide) dispatch({ type: "add", slides: [{ ...slide, kind: "puzzle", puzzle: { cut: "classic", count: 24, seed: randomPuzzleSeed(), imageWidth: width, imageHeight: height } }] });
    },
    [upload],
  );

  const addUrl = useCallback((url: string) => dispatch({ type: "add", slides: [{ id: newSlideId(), imageUrl: url.trim() }] }), []);

  const fail = (e: unknown) => {
    void notify(errorMessage(e, t("errors.save")));

    return false;
  };

  const resolveConflict = async (sent: DeckDraft): Promise<boolean> => {
    const fresh = await queryClient.fetchQuery({ queryKey: showKeys.deck(campaignId, deck.id), queryFn: () => getDeck(campaignId, deck.id), staleTime: 0 });

    if (sameDraft(sent, saved.draft)) {
      adopt(fresh);

      return true;
    }

    if (!(await confirm({ title: t("conflict.title"), confirmLabel: t("conflict.confirm"), cancelLabel: t("conflict.cancel") }))) {
      adopt(fresh);
      void notify(t("conflict.discarded"));

      return false;
    }

    // база — свіжа версія: якщо повтор впаде не через 409, наступне збереження не впреться в конфлікт знову
    setSaved({ draft: draftOf(fresh), updatedAt: fresh.updatedAt });
    await mutation.mutateAsync({ sent, expectedUpdatedAt: fresh.updatedAt });

    return true;
  };

  const save = async (): Promise<boolean> => {
    const sent = draft;

    try {
      await mutation.mutateAsync({ sent, expectedUpdatedAt: saved.updatedAt });

      return true;
    } catch (e) {
      return isConflict(e) ? resolveConflict(sent).catch(fail) : fail(e);
    }
  };

  return { draft, dispatch, dirty, save, saving: mutation.isPending, upload: { addFiles, addUrl, addPuzzle, progress } };
}
