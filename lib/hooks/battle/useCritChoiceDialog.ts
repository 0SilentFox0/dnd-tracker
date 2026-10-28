"use client";

import { useBattleScene } from "./useBattleScene";

import type { CriticalEffect } from "@/lib/constants/critical-effects";
import { critEffectsFor } from "@/lib/utils/battle/crit-choice/catalog";
import type { CritTrigger, PendingCritChoice } from "@/lib/utils/battle/crit-choice/types";

export interface CritChoiceRow {
  trigger: CritTrigger;
  actorName: string;
  targetName: string;
  options: readonly CriticalEffect[];
}

export function useCritChoiceDialog() {
  const { battle, viewer, actions } = useBattleScene();

  const pending: PendingCritChoice | null = battle.pendingCritChoice ?? null;

  const nameOf = (id: string) => battle.initiativeOrder.find((p) => p.basicInfo.id === id)?.basicInfo.name ?? "";

  const rows: CritChoiceRow[] = (pending?.triggers ?? []).map((trigger) => ({
    trigger,
    actorName: nameOf(trigger.actorId),
    targetName: nameOf(trigger.targetId),
    options: critEffectsFor(trigger.source, trigger.kind),
  }));

  return {
    open: viewer.isDM && pending !== null,
    rows,
    submit: (choices: Record<string, number | "random">) => actions.critChoice.mutate({ choices }),
    cancel: () => actions.critChoice.mutate({ cancel: true }),
    isSubmitting: actions.critChoice.isPending,
  };
}
