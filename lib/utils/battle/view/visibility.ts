import { observedTraits } from "./knowledge";

import { ParticipantSide } from "@/lib/constants/battle";
import type { BattleAction, BattleParticipant, DamageStep } from "@/types/battle";

export interface Viewer {
  userId: string | null;
  isDM: boolean;
  canSeeEnemyHp: boolean;
}

export function canSeeExactStats(p: BattleParticipant, viewer: Viewer): boolean {
  return viewer.isDM || viewer.canSeeEnemyHp || p.basicInfo.side === ParticipantSide.ALLY;
}

export function sanitizeLogEntry(e: BattleAction, viewer: Viewer): BattleAction {
  if (viewer.isDM) return e;

  const { targetAC: _ac, damageBreakdown: _b, ...rest } = e.actionDetails ?? {};

  void _ac;
  void _b;

  return { ...e, actionDetails: rest };
}

export function hiddenTargetSteps(steps: DamageStep[], targetId: string, log: BattleAction[], exact: boolean): DamageStep[] {
  if (exact) return steps;

  const known = new Set(observedTraits(log, targetId).map((t) => t.label));

  const allKnown = steps.every((s) => s.side === "attacker" || known.has(s.label));

  // after відомого кроку вже містить прихований опір, тож або всі кроки цілі, або жодного
  return allKnown ? steps : steps.filter((s) => s.side === "attacker");
}
