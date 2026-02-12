/**
 * Утиліти для старту бою
 */

import { addActiveEffect } from "./battle-effects";
import { checkTriggerCondition,getPassiveAbilitiesByTrigger } from "./battle-triggers";

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
        const updatedEffects = addActiveEffect(updatedParticipant, effect, currentRound);

        updatedParticipant = {
          ...updatedParticipant,
          battleData: {
            ...updatedParticipant.battleData,
            activeEffects: updatedEffects,
          },
        };
      }
    }
  }

  // Перевіряємо артефакти з пасивними здібностями "start_of_battle"
  for (const artifact of participant.battleData.equippedArtifacts) {
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

          const updatedEffects = addActiveEffect(updatedParticipant, effect, currentRound);

          updatedParticipant = {
            ...updatedParticipant,
            battleData: {
              ...updatedParticipant.battleData,
              activeEffects: updatedEffects,
            },
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

  // Базова ініціатива з participant
  let initiative = participant.abilities.baseInitiative;

  // Додаємо тимчасові бонуси з activeEffects
  for (const effect of participant.battleData.activeEffects) {
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
    if (b.abilities.initiative !== a.abilities.initiative) {
      return b.abilities.initiative - a.abilities.initiative;
    }

    // Якщо однакова, за baseInitiative
    if (b.abilities.baseInitiative !== a.abilities.baseInitiative) {
      return b.abilities.baseInitiative - a.abilities.baseInitiative;
    }

    // Якщо однакова, за dexterity
    return b.abilities.dexterity - a.abilities.dexterity;
  });
}
