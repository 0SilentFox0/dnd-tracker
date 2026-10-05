import type { BattleAction } from "@/types/battle";

/** Остання дія-заклинання: після неї в тій самій відповіді може йти подія перемоги. */
export function findLastSpellAction(log: BattleAction[] | undefined): BattleAction | undefined {
  return log?.findLast((e) => e.actionType === "spell");
}
