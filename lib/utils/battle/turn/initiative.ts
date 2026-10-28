import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/core/participants";
import { BattleParticipant } from "@/types/battle";

/**
 * Розраховує ініціативу
 * @param participant - учасник бою
 * @returns розрахована ініціатива
 */
export function calculateInitiative(participant: BattleParticipant, participants: BattleParticipant[] = [participant]): number {
  return participant.abilities.baseInitiative + collectModifiers(withSelf(participants, participant), participant.basicInfo.id, { stat: "initiative" }).flat;
}

export function compareInitiative(a: BattleParticipant, b: BattleParticipant): number {
  if (b.abilities.initiative !== a.abilities.initiative) return b.abilities.initiative - a.abilities.initiative;

  if (b.abilities.baseInitiative !== a.abilities.baseInitiative) return b.abilities.baseInitiative - a.abilities.baseInitiative;

  return b.abilities.dexterity - a.abilities.dexterity;
}

/** Порядок: initiative (desc) → baseInitiative (desc) → dexterity (desc). */
export function sortByInitiative(participants: BattleParticipant[]): BattleParticipant[] {
  return [...participants].sort(compareInitiative);
}
