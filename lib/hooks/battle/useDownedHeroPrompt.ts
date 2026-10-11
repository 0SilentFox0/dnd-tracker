"use client";

import { useMemo, useState } from "react";

import { useBattleScene } from "./useBattleScene";

import { BattleStatus } from "@/lib/constants/battle";
import { downedHeroes } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";

export interface DownedHeroPrompt {
  heroes: BattleParticipant[];
  isPending: boolean;
  revive(p: BattleParticipant): void;
  dismiss(p: BattleParticipant): void;
}

export function useDownedHeroPrompt(): DownedHeroPrompt {
  const { battle, isDM, actions } = useBattleScene();

  const [dismissed, setDismissed] = useState<string[]>([]);

  const downed = useMemo(
    () => (isDM && battle.status === BattleStatus.ACTIVE ? downedHeroes(battle.initiativeOrder) : []),
    [isDM, battle.status, battle.initiativeOrder],
  );

  // герой, що піднявся, знову має викликати сповіщення, якщо впаде вдруге
  const stillDown = dismissed.filter((id) => downed.some((p) => p.basicInfo.id === id));

  if (stillDown.length !== dismissed.length) setDismissed(stillDown);

  return {
    heroes: downed.filter((p) => !stillDown.includes(p.basicInfo.id)),
    isPending: actions.updateParticipant.isPending,
    revive: (p) => actions.updateParticipant.mutate({ participantId: p.basicInfo.id, data: { revive: true } }),
    dismiss: (p) => setDismissed((ids) => [...ids, p.basicInfo.id]),
  };
}
