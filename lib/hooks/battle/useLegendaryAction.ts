"use client";

import { useMemo } from "react";

import { useBattleScene } from "./useBattleScene";
import { useSendCoreAction } from "./useCoreActions";

import { useTranslator } from "@/lib/i18n/use-translator";
import { useSpellsByIds } from "@/lib/hooks/spells";
import { translateIssue } from "@/lib/i18n/translate-issue";
import { isAttackable } from "@/lib/utils/abilities/engine/core/participants";
import { cooldownLeft, withinCountLimits } from "@/lib/utils/abilities/engine/core/usage";
import { lairAbilities, lairBlocker } from "@/lib/utils/battle/actions/lair";
import { legendaryAbilities, legendaryBlocker, legendaryCostOf } from "@/lib/utils/battle/actions/legendary-options";
import { abilityMaxTargets } from "@/lib/utils/battle/validation/ability-targets";
import { bonusTargetCandidates, needsBonusTarget } from "@/lib/utils/battle/view";
import type { BattleParticipant, LegendaryOption } from "@/types/battle";

export interface LegendaryChoice {
  id: string;
  kind: "attack" | "ability" | "lair";
  label: string;
  cost: number;
  spellId?: string;
  attackIndex?: number;
  abilityKey?: string;
  needsTarget: boolean;
  maxTargets: number;
  candidates: BattleParticipant[];
  blocked: string | null;
}

export function useLegendaryAction(participant: BattleParticipant) {
  const { battle, turn, campaignId } = useBattleScene();

  const order = battle.initiativeOrder;

  const current = turn.current ?? undefined;

  const spellIds = participant.battleData.resolvedAbilities.flatMap((a) => a.perform?.kind === "spell" ? [a.perform.spellId] : []);

  const spells = useSpellsByIds(campaignId, spellIds);

  const t = useTranslator();

  const choices = useMemo<LegendaryChoice[]>(() => {
    const field = (order ?? []).filter((p) => !p.battleData.reserved);

    const allies = field.filter((p) => p.basicInfo.side === participant.basicInfo.side);

    const enemies = field.filter((p) => p.basicInfo.side !== participant.basicInfo.side);

    const attacks = participant.battleData.attacks.flatMap((a, i): LegendaryChoice[] =>
      a.hand === "off" ? [] : [{ id: `attack:${i}`, kind: "attack", label: a.name, cost: 1, attackIndex: i, needsTarget: true, maxTargets: 1, candidates: enemies.filter(isAttackable), blocked: legendaryBlocker(participant, current, 1) }],
    );

    const abilities = [...legendaryAbilities(participant), ...lairAbilities(participant)].map((a): LegendaryChoice => {
      const cost = legendaryCostOf(a);

      const perform = a.perform;

      const attack = perform?.kind === "attack" ? participant.battleData.attacks.find((at) => at.name.toLocaleLowerCase() === perform.attack.toLocaleLowerCase()) : undefined;

      const label = perform ? `${a.name} → ${perform.kind === "attack" ? perform.attack : spells.data?.find((s) => s.id === perform.spellId)?.name ?? perform.spellId}` : a.name;

      const blocked = (a.limits?.lair ? lairBlocker(participant, battle.currentRound, a.key) : legendaryBlocker(participant, current, cost)) ?? (!withinCountLimits(participant, a) ? "Ліміт використань вичерпано" : cooldownLeft(participant, a, battle.currentRound) > 0 ? `Перезарядка: ще ${cooldownLeft(participant, a, battle.currentRound)} р.` : perform?.kind === "attack" && !attack ? "Атаку вміння не знайдено" : null);

      return { id: `ability:${a.key}`, kind: a.limits?.lair ? "lair" : "ability", label, cost, abilityKey: a.key, ...(perform?.kind === "spell" && { spellId: perform.spellId }), needsTarget: perform?.kind === "spell" ? false : perform?.kind === "attack" ? true : needsBonusTarget(a), maxTargets: perform?.kind === "attack" ? 1 : abilityMaxTargets(a), candidates: perform?.kind === "attack" ? enemies.filter(isAttackable) : bonusTargetCandidates(a, allies, enemies, participant), blocked };
    });

    return [...attacks, ...abilities].map((c) => (c.blocked ? { ...c, blocked: translateIssue(t, { message: c.blocked }) } : c));
  }, [order, participant, current, spells.data, battle.currentRound, t]);

  const { send, isPending } = useSendCoreAction();

  const run = (option: LegendaryOption) => send({ action: "legendary", participantId: participant.basicInfo.id, option });

  return { legendary: participant.battleData.legendary, choices, run, isPending };
}
