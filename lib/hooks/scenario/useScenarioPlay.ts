"use client";

import { useMemo } from "react";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";

import { startBattle } from "@/lib/api/battles";
import { ApiError } from "@/lib/api/client";
import { getDeck } from "@/lib/api/decks";
import { BattleStatus } from "@/lib/constants/battle";
import { battleKeys, useBattleBriefs } from "@/lib/hooks/battles";
import { useNotify } from "@/lib/hooks/common";
import { type ShowControl, showKeys, usePusherShowSync, useShowControl, useShowState } from "@/lib/hooks/show";
import { errorMessage } from "@/lib/utils/common/error-message";
import { battleAction, boundDeckIds, currentSlideRow, hasBattleBindings, nextSlideRow, type PlayLookup, rowBattleState, rowSlideState } from "@/lib/utils/scenario/play";
import type { BattleBrief } from "@/types/battle";
import type { ScenarioContent, ScenarioRow } from "@/types/scenario";
import type { Slide } from "@/types/show";

export interface ScenarioPlay {
  lookup: PlayLookup;
  showSlide(row: ScenarioRow): void;
  /** Рядок, на чиєму слайді стоїть показ. */
  currentRow: ScenarioRow | null;
  /** Рядок для «Наступний рядок»; null — далі слайдів немає. */
  nextRow: ScenarioRow | null;
  runBattle(row: ScenarioRow): void;
  pending: boolean;
  control: ShowControl;
}

export function useScenarioPlay(campaignId: string, content: ScenarioContent, enabled = true): ScenarioPlay {
  const queryClient = useQueryClient();

  const notify = useNotify();

  usePusherShowSync(campaignId, enabled);

  const { show } = useShowState(campaignId, enabled);

  const control = useShowControl(campaignId, notify);

  const { data: briefs } = useBattleBriefs(campaignId, { enabled: enabled && hasBattleBindings(content) });

  const deckIds = boundDeckIds(content);

  const deckQueries = useQueries({
    queries: deckIds.map((deckId) => ({
      queryKey: showKeys.deck(campaignId, deckId),
      queryFn: () => getDeck(campaignId, deckId),
      enabled,
      staleTime: 30_000,
      retry: (count: number, error: unknown) => !(error instanceof ApiError && error.status === 404) && count < 2,
    })),
  });

  const decks = new Map<string, Slide[] | null>();

  deckQueries.forEach((q, i) => {
    if (q.data) decks.set(deckIds[i], q.data.slides);
    else if (q.error) decks.set(deckIds[i], null);
  });

  const battles = useMemo(() => (briefs ? new Map(briefs.map((b) => [b.id, b])) : null), [briefs]);

  const lookup: PlayLookup = { decks, battles, show };

  const battleRun = useMutation({
    mutationFn: async (row: ScenarioRow) => {
      const fresh = queryClient.getQueryData<BattleBrief[]>(battleKeys.briefs(campaignId));

      const action = battleAction(rowBattleState(row, { ...lookup, battles: fresh ? new Map(fresh.map((b) => [b.id, b])) : lookup.battles }));

      if (action === "none" || !row.battleId) return;

      if (action === "start") await startBattle(campaignId, row.battleId, {});

      await control.send({ action: "battle", battleId: row.battleId });
    },
    onSuccess: (_data, row) => {
      queryClient.setQueryData<BattleBrief[]>(battleKeys.briefs(campaignId), (old) => old?.map((b) => (b.id === row.battleId && b.status === BattleStatus.PREPARED ? { ...b, status: BattleStatus.ACTIVE } : b)));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: battleKeys.list(campaignId) });
      void queryClient.invalidateQueries({ queryKey: battleKeys.briefs(campaignId) });
      void queryClient.invalidateQueries({ queryKey: battleKeys.active() });
    },
    onError: (error) => void notify(errorMessage(error, "Не вдалося почати бій")),
  });

  return {
    lookup,
    // open на поточному слайді знімає й заглушку
    showSlide: (row) => {
      const state = rowSlideState(row, lookup);

      if (row.slide && state.kind === "ready" && !state.active) void control.send({ action: "open", deckId: row.slide.deckId, slideId: row.slide.slideId });
    },
    currentRow: currentSlideRow(content, lookup),
    nextRow: nextSlideRow(content, lookup),
    runBattle: (row) => battleRun.mutate(row),
    pending: control.pending || battleRun.isPending,
    control,
  };
}
