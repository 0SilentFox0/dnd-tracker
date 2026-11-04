import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/core/participants";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import { rollDie } from "@/lib/utils/common/dice";
import type { Ruleset } from "@/lib/utils/rules/schema";
import { BattleParticipant } from "@/types/battle";

const PINNED_INITIATIVE = 1000;

export interface InitiativeRoll {
  rules?: Pick<Ruleset, "initiative">;
  rng?: () => number;
}

/** `rules.initiative.mode: "roll"` — d20 + DEX; pinned (always-first) bases stay static. */
export function calculateInitiative(participant: BattleParticipant, participants: BattleParticipant[] = [participant], roll: InitiativeRoll = {}): number {
  const { baseInitiative, dexterity, initiativeBonus = 0 } = participant.abilities;

  const bonus = collectModifiers(withSelf(participants, participant), participant.basicInfo.id, { stat: "initiative" }).flat;

  const rolled = roll.rules?.initiative.mode === "roll" && baseInitiative < PINNED_INITIATIVE;

  return (rolled ? rollDie(20, roll.rng) + getAbilityModifier(dexterity) + initiativeBonus : baseInitiative) + bonus;
}

export function compareInitiative(a: BattleParticipant, b: BattleParticipant): number {
  if (b.abilities.initiative !== a.abilities.initiative) return b.abilities.initiative - a.abilities.initiative;

  if (b.abilities.baseInitiative !== a.abilities.baseInitiative) return b.abilities.baseInitiative - a.abilities.baseInitiative;

  return b.abilities.dexterity - a.abilities.dexterity;
}

/** Index at which `p` fits into `order` (first slot it outranks at or after `from`), or `order.length`. */
export function initiativeSlot(order: BattleParticipant[], p: BattleParticipant, from = 0): number {
  const at = order.findIndex((other, i) => i >= from && compareInitiative(p, other) < 0);

  return at === -1 ? order.length : at;
}

/** Порядок: initiative (desc) → baseInitiative (desc) → dexterity (desc). */
export function sortByInitiative(participants: BattleParticipant[]): BattleParticipant[] {
  return [...participants].sort(compareInitiative);
}
