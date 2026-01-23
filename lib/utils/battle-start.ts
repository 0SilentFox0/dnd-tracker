/**
 * Утиліти для старту бою
 */

import { addActiveEffect } from "./battle-effects";
import { checkTriggerCondition,getPassiveAbilitiesByTrigger } from "./battle-triggers";

import { BATTLE_CONSTANTS } from "@/lib/constants/battle";
import { ActiveEffect,BattleParticipant } from "@/types/battle";

/**
 * Застосовує початкові ефекти з артефактів та пасивних здібностей
 * при старті бою (тригер "start_of_battle")
 * @param participant - учасник бою
 * @param currentRound - поточний раунд (зазвичай 1)
 * @param allParticipants - всі учасники бою (для контексту пасивок)
 * @returns оновлений учасник з застосованими ефектами
 */
export function applyStartOfBattleEffects(
  participant: BattleParticipant,
  currentRound: number,
  allParticipants: BattleParticipant[]
): BattleParticipant {
  let updatedParticipant = { ...participant };

  const appliedEffects: ActiveEffect[] = [];

  // Перевіряємо пасивні здібності з тригером "start_of_battle"
  const startOfBattleAbilities = getPassiveAbilitiesByTrigger(
    participant,
    "start_of_battle"
  );

  for (const ability of startOfBattleAbilities) {
    // Перевіряємо чи умова виконана
    if (
      checkTriggerCondition(ability.trigger, participant, {
        allParticipants,
        currentRound,
      })
    ) {
      // Застосовуємо ефект зі здібності
      // Залежно від типу ефекту, можемо додавати activeEffect
      if (ability.effect.type === "add_effect" || ability.effect.type === "buff") {
        // Створюємо активний ефект з пасивної здібності
        const effect: Omit<ActiveEffect, "appliedAt"> = {
          id: `${ability.id}-start-${Date.now()}`,
          name: ability.name,
          type: "buff",
          description: ability.description,
          duration: (ability.effect as { duration?: number }).duration || 999, // До кінця бою
          effects: [],
        };

        // Додаємо ефект до списку
        updatedParticipant = {
          ...updatedParticipant,
          activeEffects: addActiveEffect(updatedParticipant, effect, currentRound),
        };
      }
    }
  }

  // Перевіряємо артефакти з пасивними здібностями "start_of_battle"
  for (const artifact of participant.equippedArtifacts) {
    if (artifact.passiveAbility) {
      const passiveAbility = artifact.passiveAbility as {
        trigger?: { type?: string };
        effect?: { type?: string; duration?: number };
        name?: string;
        description?: string;
      };

      if (passiveAbility.trigger?.type === "start_of_battle") {
        // Застосовуємо ефект з артефакту
        if (
          passiveAbility.effect?.type === "add_effect" ||
          passiveAbility.effect?.type === "buff"
        ) {
          const effect: Omit<ActiveEffect, "appliedAt"> = {
            id: `${artifact.artifactId}-start-${Date.now()}`,
            name: passiveAbility.name || artifact.name,
            type: "buff",
            description: passiveAbility.description || "",
            duration: passiveAbility.effect.duration || 999,
            effects: [],
          };

          updatedParticipant = {
            ...updatedParticipant,
            activeEffects: addActiveEffect(updatedParticipant, effect, currentRound),
          };
        }
      }
    }
  }

  return updatedParticipant;
}

/**
 * Розраховує ініціативу з урахуванням спеціальних правил
 * @param participant - учасник бою
 * @returns розрахована ініціатива
 */
export function calculateInitiative(participant: BattleParticipant): number {
  // Спеціальні правила
  // Файдаен завжди перший (initiative 999)
  if (participant.name.toLowerCase().includes("фајдаен") || 
      participant.name.toLowerCase().includes("файдаен") ||
      participant.race?.toLowerCase() === "фајдаен") {
    return 999;
  }

  // Базова ініціатива з participant
  let initiative = participant.baseInitiative;

  // Додаємо тимчасові бонуси з activeEffects
  for (const effect of participant.activeEffects) {
    for (const effectDetail of effect.effects) {
      if (effectDetail.type === "initiative_bonus" || effectDetail.type === "initiative") {
        initiative += effectDetail.value || 0;
      }
    }
  }

  return initiative;
}

/**
 * Сортує учасників за ініціативою
 * Порядок: initiative (desc) → baseInitiative (desc) → dexterity (desc)
 * @param participants - масив учасників
 * @returns відсортований масив
 */
export function sortByInitiative(
  participants: BattleParticipant[]
): BattleParticipant[] {
  return [...participants].sort((a, b) => {
    // Спочатку за поточною initiative
    if (b.initiative !== a.initiative) {
      return b.initiative - a.initiative;
    }

    // Якщо однакова, за baseInitiative
    if (b.baseInitiative !== a.baseInitiative) {
      return b.baseInitiative - a.baseInitiative;
    }

    // Якщо однакова, за dexterity
    return b.dexterity - a.dexterity;
  });
}
