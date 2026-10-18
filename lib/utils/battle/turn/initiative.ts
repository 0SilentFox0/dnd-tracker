import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/core/participants";
import { BattleParticipant } from "@/types/battle";

/**
 * Розраховує ініціативу з урахуванням спеціальних правил
 * @param participant - учасник бою
 * @returns розрахована ініціатива
 */
export function calculateInitiative(participant: BattleParticipant, participants: BattleParticipant[] = [participant]): number {
  // Спеціальні правила: певні персонажі завжди перші в черзі (initiative 999)
  const nameLower = participant.basicInfo.name.toLowerCase();

  const raceLower = participant.abilities.race?.toLowerCase() ?? "";

  if (
    nameLower.includes("фајдаен") ||
    nameLower.includes("файдаен") ||
    raceLower === "фајдаен"
  ) {
    return 999;
  }

  if (nameLower.includes("айвен") || nameLower.includes("iven")) {
    return 999;
  }

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
