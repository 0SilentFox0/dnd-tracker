import { canSeeExactStats, hiddenTargetSteps, type Viewer } from "./visibility";

import { computeDamageBreakdown } from "@/lib/utils/battle/damage";
import { obstacleStep } from "@/lib/utils/battle/damage/obstacle";
import type { BattleScene } from "@/types/api";
import type { BattleAttack, BattleParticipant, DamageStep } from "@/types/battle";

interface StrikeStepsInput {
  attacker: BattleParticipant;
  target: BattleParticipant;
  attack: BattleAttack;
  damage: number[];
  isCritical: boolean;
  blockedByCover: boolean;
  battle: Pick<BattleScene, "initiativeOrder" | "rules" | "battleLog" | "knowledge">;
  viewer: Viewer;
}

/** Кроки шкоди одного влучання так, як їх бачить глядач (з урахуванням прихованих цілей і укриття). */
export function strikeDamageSteps({ attacker, target, attack, damage, isCritical, blockedByCover, battle, viewer }: StrikeStepsInput): DamageStep[] {
  const full = computeDamageBreakdown({ attacker, target, attack, damageRolls: damage, allParticipants: battle.initiativeOrder, isCritical, rules: battle.rules }).steps;

  const shown = hiddenTargetSteps(full, target.basicInfo.id, battle.battleLog ?? [], canSeeExactStats(target, viewer), battle.knowledge);

  return blockedByCover ? [...shown, obstacleStep(shown.at(-1)?.after ?? 0)] : shown;
}
