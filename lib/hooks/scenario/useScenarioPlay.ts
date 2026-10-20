"use client";

import { useMemo } from "react";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";

import { startBattle } from "@/lib/api/battles";
import { ApiError } from "@/lib/api/client";
import { getDeck } from "@/lib/api/decks";
import { battleKeys, useBattleBriefs } from "@/lib/hooks/battles";
import { useNotify } from "@/lib/hooks/common";
import { type ShowControl, showKeys, usePusherShowSync, useShowControl, useShowState } from "@/lib/hooks/show";
import { errorMessage } from "@/lib/utils/common/error-message";
import { battleAction, boundDeckIds, type PlayLookup, rowBattleState, rowSlideState } from "@/lib/utils/scenario/play";
import type { ScenarioContent, ScenarioRow } from "@/types/scenario";
import type { Slide } from "@/types/show";

export interface ScenarioPlay {
  lookup: PlayLookup;
  showSlide(row: ScenarioRow): void;
  runBattle(row: ScenarioRow): void;
  pending: boolean;
  control: ShowControl;
}

export function useScenarioPlay(campaignId: string, content: ScenarioContent): ScenarioPlay {
  const queryClient = useQueryClient();

  const notify = useNotify();

  usePusherShowSync(campaignId);

  const { show } = useShowState(campaignId);

  const control = useShowControl(campaignId, notify);

  const { data: briefs } = useBattleBriefs(campaignId);

  const deckIds = boundDeckIds(content);

  const deckQueries = useQueries({
    queries: deckIds.map((deckId) => ({
      queryKey: showKeys.deck(campaignId, deckId),
      queryFn: () => getDeck(campaignId, deckId),
      staleTime: 30_000,
      retry: (count: number, error: unknown) => !(error instanceof ApiError && error.status === 404) && count < 2,
    })),
  });

  const decks = new Map<string, Slide[] | null>();

  deckQueries.forEach((q, i) => {
    if (q.data) decks.set(deckIds[i], q.data.slides);
    else if (q.error instanceof ApiError && q.error.status === 404) decks.set(deckIds[i], null);
  });

  const battles = useMemo(() => (briefs ? new Map(briefs.map((b) => [b.id, b])) : null), [briefs]);

  const lookup: PlayLookup = { decks, battles, show };

  const battleRun = useMutation({
    mutationFn: async (row: ScenarioRow) => {
      const action = battleAction(rowBattleState(row, lookup));

      if (action === "none" || !row.battleId) return;

      if (action === "start") await startBattle(campaignId, row.battleId, {});

      await control.send({ action: "battle", battleId: row.battleId });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: battleKeys.briefs(campaignId) });
      void queryClient.invalidateQueries({ queryKey: battleKeys.active() });
    },
    onError: (error) => void notify(errorMessage(error, "Не вдалося почати бій")),
  });

  return {
    lookup,
    showSlide: (row) => {
      if (row.slide && rowSlideState(row, lookup).kind === "ready") void control.send({ action: "open", deckId: row.slide.deckId, slideId: row.slide.slideId });
    },
    runBattle: (row) => battleRun.mutate(row),
    pending: control.pending || battleRun.isPending,
    control,
  };
}
