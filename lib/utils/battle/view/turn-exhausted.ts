import { canCastBonusSpell } from "./hero";

import type { BattleParticipant } from "@/types/battle";

type BonusSpell = Parameters<typeof canCastBonusSpell>[1][number];

export function turnExhausted(p: BattleParticipant, bonusSpells: BonusSpell[], canReturn = false): boolean {
  const bonusLeft = (p.battleData.resolvedAbilities ?? []).some((a) => a.trigger.event === "bonusAction") && !p.actionFlags.hasUsedBonusAction;

  return p.actionFlags.hasUsedAction && !bonusLeft && !canCastBonusSpell(p, bonusSpells) && !canReturn;
}
