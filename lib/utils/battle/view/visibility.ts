import { type BattleKnowledge, resolveObservedTraits } from "./knowledge";

import { ParticipantSide } from "@/lib/constants/battle";
import { lineKey, textRef } from "@/lib/i18n/text-ref";
import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/core/participants";
import type { BattleAction, BattleParticipant, DamageStep } from "@/types/battle";
import type { LogLine } from "@/types/text";

export interface Viewer {
  userId: string | null;
  isDM: boolean;
  readOnly: boolean;
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

function hideDefense(line: LogLine): LogLine {
  if (typeof line === "string" || line.message !== "battleLog.percentile.opposed") return line;

  const { roll, target, sl, netSl } = line.params ?? {};

  return textRef("battleLog.percentile.opposedHidden", { roll: roll ?? 0, target: target ?? 0, sl: sl ?? 0, netSl: netSl ?? 0 });
}

export function sanitizeLogEntry(e: BattleAction, viewer: Viewer): BattleAction {
  if (viewer.isDM) return e;

  const { targetAC: _ac, damageBreakdown: _b, damageRows: _r, percentile, ...rest } = e.actionDetails ?? {};

  const hidden: BattleAction = { ...e, actionDetails: percentile ? { ...rest, percentile: { ...percentile, defender: undefined } } : rest };

  return e.log ? { ...hidden, log: e.log.map(hideDefense) } : hidden;
}

export function hiddenTargetSteps(steps: DamageStep[], targetId: string, log: BattleAction[], exact: boolean, knowledge?: BattleKnowledge): DamageStep[] {
  if (exact) return steps;

  const known = new Set(resolveObservedTraits(log, targetId, knowledge).map((t) => lineKey(t.label)));

  const allKnown = steps.every((s) => s.side === "attacker" || known.has(lineKey(s.label)));

  // after відомого кроку вже містить прихований опір, тож або всі кроки цілі, або жодного
  return allKnown ? steps : steps.filter((s) => s.side === "attacker");
}
