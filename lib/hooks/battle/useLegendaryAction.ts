"use client";

import { useMemo } from "react";

import { useBattleScene } from "./useBattleScene";
import { useSendCoreAction } from "./useCoreActions";

import { isAttackable } from "@/lib/utils/abilities/engine/core/participants";
import { legendaryAbilities, legendaryBlocker, legendaryCostOf } from "@/lib/utils/battle/actions/legendary-options";
import { abilityMaxTargets } from "@/lib/utils/battle/validation/ability-targets";
import { bonusTargetCandidates, needsBonusTarget } from "@/lib/utils/battle/view";
import type { BattleParticipant, LegendaryOption } from "@/types/battle";

export interface LegendaryChoice {
  id: string;
  kind: "attack" | "ability";
  label: string;
  cost: number;
  attackIndex?: number;
  abilityKey?: string;
  needsTarget: boolean;
  maxTargets: number;
  candidates: BattleParticipant[];
  blocked: string | null;
}

export function useLegendaryAction(participant: BattleParticipant) {
  const { battle, turn } = useBattleScene();

  const order = battle.initiativeOrder;

  const current = turn.current ?? undefined;

  const choices = useMemo<LegendaryChoice[]>(() => {
    const field = (order ?? []).filter((p) => !p.battleData.reserved);

    const allies = field.filter((p) => p.basicInfo.side === participant.basicInfo.side);

    const enemies = field.filter((p) => p.basicInfo.side !== participant.basicInfo.side);

    const attacks = participant.battleData.attacks.flatMap((a, i): LegendaryChoice[] =>
      a.hand === "off" ? [] : [{ id: `attack:${i}`, kind: "attack", label: a.name, cost: 1, attackIndex: i, needsTarget: true, maxTargets: 1, candidates: enemies.filter(isAttackable), blocked: legendaryBlocker(participant, current, 1) }],
    );

    const abilities = legendaryAbilities(participant).map((a): LegendaryChoice => {
      const cost = legendaryCostOf(a);

      return { id: `ability:${a.key}`, kind: "ability", label: a.name, cost, abilityKey: a.key, needsTarget: needsBonusTarget(a), maxTargets: abilityMaxTargets(a), candidates: bonusTargetCandidates(a, allies, enemies, participant), blocked: legendaryBlocker(participant, current, cost) };
    });

    return [...attacks, ...abilities];
  }, [order, participant, current]);

  const { send, isPending } = useSendCoreAction();

  const run = (option: LegendaryOption) => send({ action: "legendary", participantId: participant.basicInfo.id, option });

  return { legendary: participant.battleData.legendary, choices, run, isPending };
}
