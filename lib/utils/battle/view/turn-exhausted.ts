import { canCastBonusSpell } from "./hero";

import { canStandUp } from "@/lib/utils/battle/actions/availability";
import { remainingMovement } from "@/lib/utils/battle/grid/path";
import type { BattleParticipant } from "@/types/battle";

type BonusSpell = Parameters<typeof canCastBonusSpell>[1][number];

/** coreActions: лишок руху на карті й підйом лежачого тримають хід відкритим. */
export function turnExhausted(p: BattleParticipant, bonusSpells: BonusSpell[], { canReturn = false, coreActions = false }: { canReturn?: boolean; coreActions?: boolean } = {}): boolean {
  const bonusLeft = (p.battleData.resolvedAbilities ?? []).some((a) => a.trigger.event === "bonusAction") && !p.actionFlags.hasUsedBonusAction;

  return p.actionFlags.hasUsedAction && !bonusLeft && !canCastBonusSpell(p, bonusSpells) && !canReturn && !(coreActions && (canStandUp(p) || (!!p.battleData.position && remainingMovement(p) > 0)));
}
