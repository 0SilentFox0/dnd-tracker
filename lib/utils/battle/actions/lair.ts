import { actionReason } from "./reasons";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { textRef } from "@/lib/i18n/text-ref";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { hasCondition } from "@/lib/utils/battle/conditions/query";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export const lairAbilities = (p: BattleParticipant) => p.battleData.resolvedAbilities.filter((a) => a.limits?.lair);

export function lairBlocker(p: BattleParticipant, round: number, key: string): LogLine | null {
  const lair = p.battleData.lair;

  if (!lair?.active) return textRef(API_ERRORS.LAIR_NOT_ACTIVE);

  if (!isActive(p) || hasCondition(p, "incapacitated") || p.battleData.reserved) return actionReason("cannotAct");

  if (lair.usedRound === round) return textRef(API_ERRORS.LAIR_USED);

  return lair.usedRound === round - 1 && lair.lastKey === key ? textRef(API_ERRORS.LAIR_REPEAT) : null;
}

export function spendLair(p: BattleParticipant, round: number, key: string): BattleParticipant {
  const lair = p.battleData.lair;

  return lair ? { ...p, battleData: { ...p.battleData, lair: { ...lair, usedRound: round, lastKey: key } } } : p;
}

export function toggleLair(p: BattleParticipant, active: boolean): BattleParticipant {
  const lair = p.battleData.lair ?? { active: false, baseResistances: p.battleData.legendary?.resistLeft ?? 0, resistSpent: 0 };

  const maximum = active ? Math.max(lair.baseResistances, p.battleData.lairResistances ?? 0) : lair.baseResistances;

  const legendary = p.battleData.legendary ?? { actions: 0, actionsLeft: 0, resistLeft: 0 };

  return { ...p, battleData: { ...p.battleData, lair: { ...lair, active }, legendary: { ...legendary, resistLeft: Math.max(0, maximum - lair.resistSpent) } } };
}
