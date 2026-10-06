import { type BattleKnowledge, resolveObservedTraits } from "./knowledge";

import { ParticipantSide } from "@/lib/constants/battle";
import { findFlags } from "@/lib/utils/abilities/engine/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/participants";
import type { BattleAction, BattleParticipant, DamageStep } from "@/types/battle";

export interface Viewer {
  userId: string | null;
  isDM: boolean;
  canSeeEnemyHp: boolean;
}

export function canSeeExactStats(p: BattleParticipant, viewer: Viewer): boolean {
  return viewer.isDM || viewer.canSeeEnemyHp || p.basicInfo.side === ParticipantSide.ALLY;
}

export function canSeeEnemyHp(hero: BattleParticipant | null, order: BattleParticipant[]): boolean {
  if (!hero) return false;

  return findFlags(withSelf(order, hero), hero.basicInfo.id, "seeEnemyHp").length > 0;
}

// клієнт обирає героя за ходом, тож точні стати гарантовані лише коли прапорець має кожен герой гравця
export function alwaysSeesEnemyStats(order: BattleParticipant[], userId: string): boolean {
  const mine = order.filter((p) => p.basicInfo.controlledBy === userId);

  return mine.length > 0 && mine.every((p) => canSeeEnemyHp(p, order));
}

export function sanitizeLogEntry(e: BattleAction, viewer: Viewer): BattleAction {
  if (viewer.isDM) return e;

  const { targetAC: _ac, damageBreakdown: _b, ...rest } = e.actionDetails ?? {};

  void _ac;
  void _b;

  return { ...e, actionDetails: rest };
}

export function hiddenTargetSteps(steps: DamageStep[], targetId: string, log: BattleAction[], exact: boolean, knowledge?: BattleKnowledge): DamageStep[] {
  if (exact) return steps;

  const known = new Set(resolveObservedTraits(log, targetId, knowledge).map((t) => t.label));

  const allKnown = steps.every((s) => s.side === "attacker" || known.has(s.label));

  // after відомого кроку вже містить прихований опір, тож або всі кроки цілі, або жодного
  return allKnown ? steps : steps.filter((s) => s.side === "attacker");
}
