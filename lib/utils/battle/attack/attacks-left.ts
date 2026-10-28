import { hasTrait, isFiveE } from "./ability";

import { AttackType } from "@/lib/constants/battle";
import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/core/participants";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { applyMainActionUsed } from "@/lib/utils/battle/participant/helpers";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

export function attacksPerAction(p: BattleParticipant, participants: BattleParticipant[]): number {
  return Math.max(0, Math.floor(collectModifiers(withSelf(participants, p), p.basicInfo.id, { stat: "attacksPerAction" }).flat));
}

export const canAttackFromPool = (p: BattleParticipant): boolean => (p.battleData.attacksLeft ?? 0) > 0;

export const canOffHandAttack = (p: BattleParticipant): boolean =>
  isFiveE(p) && !!p.battleData.attackedWithLight && !p.actionFlags.hasUsedBonusAction && p.battleData.attacks.some((a) => a.hand === "off");

/** «Атака N/M» лише для героя з додатковими атаками; N — наступна атака дією. */
export function attackCounter(p: BattleParticipant, participants: BattleParticipant[]): { n: number; m: number } | null {
  const m = 1 + attacksPerAction(p, participants);

  if (m < 2) return null;

  const left = p.battleData.attacksLeft ?? 0;

  return { n: left > 0 ? Math.min(m, m - left + 1) : p.actionFlags.hasUsedAction ? m : 1, m };
}

/** З лічильника, якщо він є; інакше витрачає дію й пише attacksLeft = attacksPerAction. */
export function spendFromPool(p: BattleParticipant, participants: BattleParticipant[]): BattleParticipant {
  return canAttackFromPool(p) ? { ...p, battleData: { ...p.battleData, attacksLeft: (p.battleData.attacksLeft ?? 0) - 1 } } : withAttacksLeft(applyMainActionUsed(p), attacksPerAction(p, participants));
}

/** Атака дією «Атака». */
export function spendAttack(p: BattleParticipant, participants: BattleParticipant[], attack: BattleAttack): BattleParticipant {
  const light = attack.hand !== "off" && attackKindOf(attack.type) === AttackType.MELEE && hasTrait(attack, "light");

  const next = spendFromPool(p, participants);

  return light && isFiveE(p) ? { ...next, battleData: { ...next.battleData, attackedWithLight: true } } : next;
}

export function withAttacksLeft(p: BattleParticipant, attacksLeft: number): BattleParticipant {
  return attacksLeft > 0 ? { ...p, battleData: { ...p.battleData, attacksLeft } } : p;
}
