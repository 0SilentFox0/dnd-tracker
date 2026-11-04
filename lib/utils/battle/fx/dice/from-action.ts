import { MAX_INITIATIVE_DICE, MAX_SAVES_SHOWN } from "./layout";

import type { BattleAction, DiceRollGroup, DieSides } from "@/types/battle";

export interface DiceThrowSpec {
  seed: number;
  groups: Array<Array<{ sides: DieSides; value: number; chosen?: boolean; dropped?: boolean; tens?: boolean }>>;
}

const toDie = (group: DiceRollGroup) => {
  const pick = group.dice.some((d) => d.chosen);

  return group.dice.map((d) => ({ sides: d.sides, value: d.value, ...(d.chosen && { chosen: true }), ...(pick && !d.chosen && { dropped: true }) }));
};

type RollKind = DiceRollGroup["kind"];

// влучання і шкода в одній пачці нечитабельні — кожна фаза кидається окремо, у порядку подій
const PHASES: RollKind[][] = [["attack"], ["save"], ["damage"], ["heal"], ["morale"], ["initiative"]];

export function percentileDice(roll: number): [{ sides: 10; value: number; tens: true }, { sides: 10; value: number }] {
  return [{ sides: 10, value: Math.floor((roll === 100 ? 0 : roll) / 10) || 10, tens: true }, { sides: 10, value: roll % 10 || 10 }];
}

const PERCENTILE_SEED_BASE = 1_000_003;

export function diceThrowsOf(action: BattleAction): DiceThrowSpec[] {
  const rolls = action.actionDetails.diceRolls;

  if (action.isCancelled) return [];

  const { percentile } = action.actionDetails;

  const percentileThrow: DiceThrowSpec[] = percentile ? [{ seed: PERCENTILE_SEED_BASE + action.actionIndex, groups: [percentileDice(percentile.roll)] }] : [];

  if (!rolls?.length) return percentileThrow;

  return [...percentileThrow, ...PHASES.flatMap((kinds, phase) => {
    const own = rolls.filter((g) => kinds.includes(g.kind));

    if (!own.length) return [];

    const pooled = (cap: number) => [own.flatMap(toDie).slice(0, cap)];

    const groups = kinds.includes("save") ? [own.slice(0, MAX_SAVES_SHOWN).flatMap(toDie)] : kinds.includes("initiative") ? pooled(MAX_INITIATIVE_DICE) : own.map(toDie);

    return [{ seed: action.actionIndex * PHASES.length + phase, groups }];
  })];
}
