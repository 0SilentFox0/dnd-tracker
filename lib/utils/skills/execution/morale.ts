/**
 * Оновлення моралі після подій (вбивство/смерть союзника)
 */

import type { BattleParticipant } from "@/types/battle";

/**
 * Оновлює мораль після вбивства/смерті (наприклад Лідерство: Помста).
 */
export function updateMoraleOnEvent(
  participants: BattleParticipant[],
  eventType: "kill" | "allyDeath",
  eventParticipantId: string,
): { updatedParticipants: BattleParticipant[]; messages: string[] } {
  const messages: string[] = [];

  const eventParticipant = participants.find(
    (p) => p.basicInfo.id === eventParticipantId,
  );

  if (!eventParticipant) {
    return { updatedParticipants: participants, messages };
  }

  const updatedParticipants = participants.map((p) => {
    if (p.basicInfo.side !== eventParticipant.basicInfo.side) return p;

    if (p.combatStats.status !== "active") return p;

    let moraleChange = 0;

    for (const skill of p.battleData.activeSkills) {
      for (const effect of skill.effects) {
        if (
          eventType === "kill" &&
          effect.stat === "morale_per_kill" &&
          typeof effect.value === "number"
        ) {
          moraleChange += effect.value;
        }

        if (
          eventType === "allyDeath" &&
          effect.stat === "morale_per_ally_death" &&
          typeof effect.value === "number"
        ) {
          moraleChange += effect.value;
        }
      }
    }

    if (moraleChange !== 0) {
      const newMorale = Math.max(
        -3,
        Math.min(3, p.combatStats.morale + moraleChange),
      );

      if (newMorale !== p.combatStats.morale) {
        messages.push(
          `📊 ${p.basicInfo.name}: мораль ${moraleChange > 0 ? "+" : ""}${moraleChange} (${eventType === "kill" ? "вбивство" : "смерть союзника"})`,
        );

        return { ...p, combatStats: { ...p.combatStats, morale: newMorale } };
      }
    }

    return p;
  });

  return { updatedParticipants, messages };
}
