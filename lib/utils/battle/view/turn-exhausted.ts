import { canCastBonusSpell } from "./hero";

import { canAttackFromPool, canOffHandAttack } from "@/lib/utils/battle/attack/attacks-left";
import { remainingMovement } from "@/lib/utils/battle/grid/path";
import type { Ruleset } from "@/lib/utils/rules/schema";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import type { BattleParticipant } from "@/types/battle";

type BonusSpell = Parameters<typeof canCastBonusSpell>[1][number];

/** coreActions: лишок руху на карті й підйом лежачого тримають хід відкритим. */
export function turnExhausted(p: BattleParticipant, bonusSpells: BonusSpell[], rules: Ruleset, { canReturn = false, coreActions = false }: { canReturn?: boolean; coreActions?: boolean } = {}): boolean {
  const bonusLeft = (p.battleData.resolvedAbilities ?? []).some((a) => a.trigger.event === "bonusAction") && !p.actionFlags.hasUsedBonusAction;

  return p.actionFlags.hasUsedAction && !canAttackFromPool(p) && !bonusLeft && !canOffHandAttack(p) && !canCastBonusSpell(p, bonusSpells) && !canReturn && !(coreActions && (ruleSystemOf(rules).combat.actions.canStandUp(p, rules) || (!!p.battleData.position && remainingMovement(p, rules) > 0)));
}
