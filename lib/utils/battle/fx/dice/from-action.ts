import { MAX_SAVES_SHOWN } from "./layout";

import type { BattleAction, DiceRollGroup, DieSides } from "@/types/battle";

export interface DiceThrowSpec {
  seed: number;
  groups: Array<Array<{ sides: DieSides; value: number; chosen?: boolean; dropped?: boolean }>>;
  caption: string;
  extraSaves: number;
}

const toDie = (group: DiceRollGroup) => {
  const pick = group.dice.some((d) => d.chosen);

  return group.dice.map((d) => ({ sides: d.sides, value: d.value, ...(d.chosen && { chosen: true }), ...(pick && !d.chosen && { dropped: true }) }));
};

function captionOf(action: BattleAction): string {
  const target = action.targets[0]?.participantName;

  if (action.actionType === "spell") return `${action.actorName} · ${action.actionDetails.spellName ?? "заклинання"}`;

  if (action.actionType === "attack") return `${action.actorName} · атака${target ? ` → ${target}` : ""}`;

  return `${action.actorName} · мораль`;
}

export function diceThrowOf(action: BattleAction): DiceThrowSpec | null {
  const rolls = action.actionDetails.diceRolls;

  if (action.isCancelled || !rolls?.length) return null;

  const saves = rolls.filter((g) => g.kind === "save");

  const shownSaves = saves.slice(0, MAX_SAVES_SHOWN).flatMap(toDie);

  const groups = [...rolls.filter((g) => g.kind !== "save").map(toDie), ...(shownSaves.length ? [shownSaves] : [])];

  return { seed: action.actionIndex, groups, caption: captionOf(action), extraSaves: Math.max(0, saves.length - MAX_SAVES_SHOWN) };
}
