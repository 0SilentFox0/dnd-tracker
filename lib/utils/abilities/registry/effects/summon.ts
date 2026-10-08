import type { EffectApplyInput, EffectApplyResult } from "./types";

import { CombatStatus, ParticipantSourceType } from "@/lib/constants/battle";
import { applyBakedAuras } from "@/lib/utils/abilities/build/bake";
import { findParticipant, participantNames, updateParticipant } from "@/lib/utils/abilities/engine/participants";
import type { Effect } from "@/lib/utils/abilities/schema";

type Of<K extends Effect["kind"]> = Extract<Effect, { kind: K }>;

export function applySummon(input: EffectApplyInput<Of<"summon">>): EffectApplyResult {
  const { effect, ownerId } = input;

  return { participants: input.participants, messages: [], summons: [{ ownerId, group: effect.group, tier: effect.tier, unitId: effect.unitId, count: effect.count ?? 1 }] };
}

export const describeSummon = (e: Of<"summon">) => (e.unitId ? `прикликати ${e.count ?? 1}× обраного юніта` : `прикликати ${e.count ?? 1}× юніта «${e.group}», Tier ${e.tier}`);

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

  const messages = raised.length ? [`💀 ${ability.name}: ${participantNames(ps, raised)} повстали (${effect.hpPercent}% HP)`] : [];

  if (refused.length) messages.push(`⛔ ${ability.name}: ${participantNames(ps, refused)} — не можна підняти`);

  return { participants: ps, messages };
}

export const describeRaiseDead = (e: Of<"raiseDead">) => `підняти мертвих юнітів на ${e.hpPercent}% HP`;
