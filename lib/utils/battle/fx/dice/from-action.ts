import { MAX_SAVES_SHOWN } from "./layout";

import type { BattleAction, DiceRollGroup, DieSides } from "@/types/battle";

export interface DiceThrowSpec {
  seed: number;
  groups: Array<Array<{ sides: DieSides; value: number; chosen?: boolean; dropped?: boolean }>>;
}

const toDie = (group: DiceRollGroup) => {
  const pick = group.dice.some((d) => d.chosen);

  return group.dice.map((d) => ({ sides: d.sides, value: d.value, ...(d.chosen && { chosen: true }), ...(pick && !d.chosen && { dropped: true }) }));
};

type RollKind = DiceRollGroup["kind"];

// влучання і шкода в одній пачці нечитабельні — кожна фаза кидається окремо, у порядку подій
const PHASES: RollKind[][] = [["attack"], ["save"], ["damage"], ["heal"], ["morale"]];

export function diceThrowsOf(action: BattleAction): DiceThrowSpec[] {
  const rolls = action.actionDetails.diceRolls;

  if (action.isCancelled || !rolls?.length) return [];

  return PHASES.flatMap((kinds, phase) => {
    const own = rolls.filter((g) => kinds.includes(g.kind));

    if (!own.length) return [];

    const groups = kinds.includes("save") ? [own.slice(0, MAX_SAVES_SHOWN).flatMap(toDie)] : own.map(toDie);

    return [{ seed: action.actionIndex * PHASES.length + phase, groups }];
  });
}
