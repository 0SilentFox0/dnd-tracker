import { flag } from "../text";
import type { EffectApplyInput, EffectApplyResult } from "./types";

import { CombatStatus, ParticipantSourceType } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { applyBakedAuras } from "@/lib/utils/abilities/build/bake";
import { findParticipant, participantNames, updateParticipant } from "@/lib/utils/abilities/engine/core/participants";
import type { Effect } from "@/lib/utils/abilities/schema";
import type { LogLine } from "@/types/text";

type Of<K extends Effect["kind"]> = Extract<Effect, { kind: K }>;

export function applySummon(input: EffectApplyInput<Of<"summon">>): EffectApplyResult {
  const { effect, ownerId } = input;

  const casterLevel = findParticipant(input.participants, ownerId)?.abilities.level;

  const spellId = input.event.type === "spellCast" ? input.event.spellId : undefined;

  return { participants: input.participants, messages: [], summons: [{ ownerId, group: effect.group, tier: effect.tier, unitId: effect.unitId, count: effect.count ?? 1, casterLevel, spellId }] };
}

export const describeSummon = (e: Of<"summon">) => textRef("abilityText.effects.summon", { unit: flag(e.unitId), count: e.count ?? 1, group: e.group ?? "", tier: e.tier ?? "" });

export function applyRaiseDead(input: EffectApplyInput<Of<"raiseDead">>): EffectApplyResult {
  const { effect, ability, ownerId } = input;

  const owner = findParticipant(input.participants, ownerId);

  let ps = input.participants;

  const raised: string[] = [];

  const refused: string[] = [];

  for (const id of input.targetIds) {
    const p = findParticipant(ps, id);

    const eligible = !!owner && !!p && p.combatStats.status !== CombatStatus.ACTIVE && p.basicInfo.sourceType === ParticipantSourceType.UNIT;

    if (!eligible) {
      refused.push(id);
      continue;
    }

    ps = updateParticipant(ps, id, (t) => ({
      ...t,
      basicInfo: { ...t.basicInfo, side: owner.basicInfo.side, controlledBy: owner.basicInfo.controlledBy },
      combatStats: { ...t.combatStats, status: CombatStatus.ACTIVE, currentHp: Math.max(1, Math.floor((t.combatStats.maxHp * effect.hpPercent) / 100)) },
      battleData: { ...t.battleData, activeEffects: [], summonedBy: ownerId },
      actionFlags: { hasUsedAction: false, hasUsedBonusAction: false, hasUsedReaction: false, hasExtraTurn: false },
    }));
    raised.push(id);
  }

  if (raised.length) ps = applyBakedAuras(ps, new Set(raised));

  const messages: LogLine[] = raised.length ? [textRef("abilityText.log.raisedDead", { ability: ability.name, target: participantNames(ps, raised), percent: effect.hpPercent })] : [];

  if (refused.length) messages.push(textRef("abilityText.log.raiseRefused", { ability: ability.name, target: participantNames(ps, refused) }));

  return { participants: ps, messages };
}

export const describeRaiseDead = (e: Of<"raiseDead">) => textRef("abilityText.effects.raiseDead", { percent: e.hpPercent });
