/**
 * Утиліти для обробки атак в бою
 */

import { addActiveEffect } from "./battle-effects";

import { AttackType } from "@/lib/constants/battle";
import {
  getHeroDamageDiceForLevel,
} from "@/lib/constants/hero-scaling";
import { getDiceAverage } from "@/lib/utils/battle/balance-calculations";
import type { CriticalEffect } from "@/lib/constants/critical-effects";
import { getRandomCriticalEffect } from "@/lib/constants/critical-effects";
import { BattleAttack, BattleParticipant } from "@/types/battle";

/**
 * Результат Attack Roll
 */
export interface AttackRollResult {
  isHit: boolean;
  isCritical: boolean;
  isCriticalFail: boolean;
  totalAttackValue: number;
  attackBonus: number;
  criticalEffect?: CriticalEffect;
  advantageUsed: boolean; // чи використано Advantage (для ельфів)
}

/**
 * Результат повної атаки
 */
export interface AttackResult {
  attackRoll: AttackRollResult;
  damageResult?: {
    totalDamage: number;
    finalDamage: number; // після опору/імунітету
    breakdown: string[];
    resistanceBreakdown: string[];
  };
  targetHpChange: {
    oldHp: number;
    newHp: number;
    oldTempHp: number;
    newTempHp: number;
  };
  criticalEffectApplied?: CriticalEffect;
  reactionTriggered: boolean; // чи спрацював контр-удар
}

/**
 * Розраховує бонус до атаки
 * @param attacker - атакуючий учасник
 * @param attack - атака
 * @returns загальний бонус до атаки
 */
export function calculateAttackBonus(
  attacker: BattleParticipant,
  attack: BattleAttack,
): number {
  let bonus = attack.attackBonus || 0;

  // Додаємо модифікатор характеристики
  const statModifier =
    attack.type === AttackType.MELEE
      ? attacker.abilities.modifiers.strength
      : attacker.abilities.modifiers.dexterity;

  bonus += statModifier;

  // Додаємо proficiency bonus
  bonus += attacker.abilities.proficiencyBonus;

  // Додаємо бонуси з activeEffects
  for (const effect of attacker.battleData.activeEffects) {
    for (const effectDetail of effect.effects) {
      if (
        effectDetail.type === "attack_bonus" ||
        effectDetail.type === "attack"
      ) {
        bonus += effectDetail.value || 0;
      }
    }
  }

  // Додаємо бонуси з артефактів
  for (const artifact of attacker.battleData.equippedArtifacts) {
    for (const modifier of artifact.modifiers) {
      if (
        modifier.type.toLowerCase().includes("attack") &&
        !modifier.isPercentage
      ) {
        bonus += modifier.value;
      }
    }
  }

  return bonus;
}

/**
 * Перевіряє чи атакуючий має Advantage для цієї атаки
 * (наприклад, ельфи з ranged атаками)
 * @param attacker - атакуючий
 * @param attack - атака
 * @returns true якщо є Advantage
 */
export function hasAdvantage(
  attacker: BattleParticipant,
  attack: BattleAttack,
): boolean {
  // Ельфи мають Advantage на ranged атаки
  if (
    attacker.abilities.race?.toLowerCase().includes("elf") &&
    attack.type === AttackType.RANGED
  ) {
    return true;
  }

  // Перевіряємо activeEffects на Advantage
  for (const effect of attacker.battleData.activeEffects) {
    for (const effectDetail of effect.effects) {
      if (
        effectDetail.type === "advantage" ||
        effectDetail.type === "advantage_attack"
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Розраховує Attack Roll з усіма бонусами
 * @param attacker - атакуючий учасник
 * @param attack - атака
 * @param d20Roll - результат кидка d20
 * @param advantageRoll - другий кидок для Advantage (опціонально)
 * @returns результат Attack Roll
 */
export function calculateAttackRoll(
  attacker: BattleParticipant,
  attack: BattleAttack,
  d20Roll: number,
  advantageRoll?: number,
): AttackRollResult {
  const attackBonus = calculateAttackBonus(attacker, attack);

  const hasAdv = hasAdvantage(attacker, attack);

  // Якщо є Advantage, використовуємо кращий результат
  let finalRoll = d20Roll;

  let advantageUsed = false;

  // Якщо є Advantage, але advantageRoll не надано, використовуємо тільки d20Roll
  // (в UI має бути два кидки, але якщо не надано - використовуємо один)
  if (hasAdv) {
    if (advantageRoll !== undefined) {
      finalRoll = Math.max(d20Roll, advantageRoll);
      advantageUsed = true;
    } else {
      // Якщо Advantage є, але другий кидок не надано, використовуємо перший
      // (в реальному застосунку UI має завжди надавати обидва кидки)
      finalRoll = d20Roll;
      advantageUsed = false; // не використано, бо немає другого кидка
    }
  }

  const totalAttackValue = finalRoll + attackBonus;

  // Критичне попадання (Natural 20)
  const isCritical = finalRoll === 20;

  // Критичний промах (Natural 1)
  const isCriticalFail = finalRoll === 1;

  // Перевірка попадання буде виконана в основній функції з AC цілі
  // Тут просто повертаємо що не критичний промах
  const isHit = !isCriticalFail;

  let criticalEffect: CriticalEffect | undefined;

  if (isCritical) {
    criticalEffect = getRandomCriticalEffect("success");
  } else if (isCriticalFail) {
    criticalEffect = getRandomCriticalEffect("fail");
  }

  return {
    isHit,
    isCritical,
    isCriticalFail,
    totalAttackValue,
    attackBonus,
    criticalEffect,
    advantageUsed,
  };
}

/**
 * Застосовує критичний ефект до учасника
 * @param participant - учасник
 * @param effect - критичний ефект
 * @param currentRound - поточний раунд
 * @param target - ціль (якщо ефект застосовується до цілі)
 * @returns оновлений учасник або ціль
 */
export function applyCriticalEffect(
  participant: BattleParticipant,
  effect: CriticalEffect,
  currentRound: number,
  target?: BattleParticipant,
): BattleParticipant {
  const targetParticipant = target || participant;

  let updated = { ...targetParticipant };

  switch (effect.effect.type) {
    case "stun":
      updated = {
        ...updated,
        battleData: {
          ...updated.battleData,
          activeEffects: addActiveEffect(
            updated,
            {
              id: `critical-${effect.id}-${Date.now()}`,
              name: effect.name,
              type: "debuff",
              description: effect.description,
              duration: effect.effect.duration || 1,
              effects: [{ type: "stun", value: 1 }],
            },
            currentRound,
          ),
        },
      };
      break;

    case "disarm":
      // TODO: Реалізувати втрату зброї
      break;

    case "extra_damage":
    case "double_damage":
    case "max_damage":
    case "additional_damage":
    case "ignore_reactions":
    case "simple_miss":
    case "half_damage":
    case "provoke_opportunity_attack":
      // Обробляються в processAttack (урон або реакція)
      break;

    case "advantage_next_attack":
      updated = {
        ...updated,
        battleData: {
          ...updated.battleData,
          activeEffects: addActiveEffect(
            updated,
            {
              id: `critical-advantage-${Date.now()}`,
              name: effect.name,
              type: "buff",
              description: effect.description,
              duration: effect.effect.duration || 1,
              effects: [{ type: "advantage_attack", value: 1 }],
            },
            currentRound,
          ),
        },
      };
      break;

    case "ac_debuff":
      updated = {
        ...updated,
        battleData: {
          ...updated.battleData,
          activeEffects: addActiveEffect(
            updated,
            {
              id: `critical-ac-debuff-${Date.now()}`,
              name: effect.name,
              type: "debuff",
              description: effect.description,
              duration: effect.effect.duration ?? 1,
              effects: [
                {
                  type: "ac_bonus",
                  value:
                    typeof effect.effect.value === "number"
                      ? effect.effect.value
                      : -2,
                },
              ],
            },
            currentRound,
          ),
        },
      };
      break;

    case "free_attack":
      updated = {
        ...updated,
        battleData: {
          ...updated.battleData,
          activeEffects: addActiveEffect(
            updated,
            {
              id: `critical-free-attack-${Date.now()}`,
              name: effect.name,
              type: "buff",
              description: effect.description,
              duration: effect.effect.duration ?? 1,
              effects: [{ type: "extra_attack", value: 1 }],
            },
            currentRound,
          ),
        },
      };
      break;

    case "block_bonus_action":
      updated = {
        ...updated,
        battleData: {
          ...updated.battleData,
          activeEffects: addActiveEffect(
            updated,
            {
              id: `critical-block-bonus-${Date.now()}`,
              name: effect.name,
              type: "debuff",
              description: effect.description,
              duration: effect.effect.duration ?? 1,
              effects: [{ type: "no_bonus_action", value: 1 }],
            },
            currentRound,
          ),
        },
      };
      break;

    case "advantage_on_target":
      updated = {
        ...updated,
        battleData: {
          ...updated.battleData,
          activeEffects: addActiveEffect(
            updated,
            {
              id: `critical-advantage-on-target-${Date.now()}`,
              name: effect.name,
              type: "debuff",
              description: effect.description,
              duration: effect.effect.duration ?? 1,
              effects: [{ type: "advantage_against_me", value: 1 }],
            },
            currentRound,
          ),
        },
      };
      break;

    case "combo_attack":
      updated = {
        ...updated,
        battleData: {
          ...updated.battleData,
          activeEffects: addActiveEffect(
            updated,
            {
              id: `critical-combo-${Date.now()}`,
              name: effect.name,
              type: "buff",
              description: effect.description,
              duration: effect.effect.duration ?? 1,
              effects: [{ type: "combo_attack_disadvantage", value: 1 }],
            },
            currentRound,
          ),
        },
      };
      break;

    // --- Критична невдача (fail) ---
    case "prone":
      updated = {
        ...updated,
        battleData: {
          ...updated.battleData,
          activeEffects: addActiveEffect(
            updated,
            {
              id: `critical-prone-${Date.now()}`,
              name: effect.name,
              type: "condition",
              description: effect.description,
              duration: effect.effect.duration ?? 1,
              effects: [{ type: "prone", value: 1 }],
            },
            currentRound,
          ),
        },
      };
      break;

    case "disadvantage_next_attack":
      updated = {
        ...updated,
        battleData: {
          ...updated.battleData,
          activeEffects: addActiveEffect(
            updated,
            {
              id: `critical-disadvantage-${Date.now()}`,
              name: effect.name,
              type: "debuff",
              description: effect.description,
              duration: effect.effect.duration ?? 1,
              effects: [{ type: "disadvantage_attack", value: 1 }],
            },
            currentRound,
          ),
        },
      };
      break;

    case "lose_bonus_action":
      updated = {
        ...updated,
        actionFlags: {
          ...updated.actionFlags,
          hasUsedBonusAction: true,
        },
      };
      break;

    case "lose_reaction":
      updated = {
        ...updated,
        battleData: {
          ...updated.battleData,
          activeEffects: addActiveEffect(
            updated,
            {
              id: `critical-no-reaction-${Date.now()}`,
              name: effect.name,
              type: "debuff",
              description: effect.description,
              duration: effect.effect.duration ?? 1,
              effects: [{ type: "no_reaction", value: 1 }],
            },
            currentRound,
          ),
        },
      };
      break;

    case "advantage_on_self":
      updated = {
        ...updated,
        battleData: {
          ...updated.battleData,
          activeEffects: addActiveEffect(
            updated,
            {
              id: `critical-advantage-on-self-${Date.now()}`,
              name: effect.name,
              type: "debuff",
              description: effect.description,
              duration: effect.effect.duration ?? 1,
              effects: [{ type: "advantage_against_me", value: 1 }],
            },
            currentRound,
          ),
        },
      };
      break;

    case "lose_action":
      // Дія вже витрачена (промах)
      updated = {
        ...updated,
        actionFlags: {
          ...updated.actionFlags,
          hasUsedAction: true,
        },
      };
      break;
  }

  return updated;
}

/**
 * Перевіряє чи може ціль виконати контр-удар (Reaction)
 * @param defender - ціль атаки
 * @param attacker - атакуючий
 * @param allParticipants - всі учасники (для перевірки кількості атак)
 * @param currentRound - поточний раунд
 * @returns true якщо контр-удар можливий
 */
/** Сумарний відсоток counter_damage зі скілів цілі (для контр-атаки) */
export function getCounterDamagePercent(defender: BattleParticipant): number {
  let total = 0;

  for (const skill of defender.battleData.activeSkills) {
    for (const effect of skill.effects) {
      if (
        effect.stat === "counter_damage" &&
        effect.isPercentage &&
        typeof effect.value === "number"
      ) {
        total += effect.value;
      }
    }
  }

  return total;
}

export function canPerformReaction(defender: BattleParticipant): boolean {
  if (defender.actionFlags.hasUsedReaction) {
    return false;
  }

  const counterPercent = getCounterDamagePercent(defender);

  if (counterPercent <= 0) {
    return false;
  }

  const hasCounterSkill = defender.battleData.activeSkills.some((skill) =>
    skill.effects.some(
      (e) => e.stat === "counter_damage" && e.isPercentage && typeof e.value === "number" && e.value > 0
    )
  );

  return hasCounterSkill;
}

/**
 * Виконує контр-удар
 * @param defender - ціль що виконує контр-удар
 * @param attacker - оригінальний атакуючий (тепер ціль)
 * @param currentRound - поточний раунд
 * @returns результат контр-удару (спрощений) та оновлений defender
 */

export function performReaction(
  defender: BattleParticipant,
  attacker: BattleParticipant,
): {
  damage: number;
  message: string;
  updatedDefender: BattleParticipant;
} {
  // Використовуємо першу доступну атаку
  const reactionAttack = defender.battleData.attacks[0];

  if (!reactionAttack) {
    return {
      damage: 0,
      message: "Немає доступної атаки для контр-удару",
      updatedDefender: defender,
    };
  }

  // Розраховуємо базовий урон з атаки (середнє значення кубиків)
  // Наприклад, для "1d8" базовий урон = 4.5 (округлюємо до 4)
  const diceMatch = reactionAttack.damageDice?.match(/(\d+)d(\d+)/);

  let baseDamage = 0;

  if (diceMatch) {
    const diceCount = parseInt(diceMatch[1]);

    const diceSize = parseInt(diceMatch[2]);

    const averageRoll = Math.floor((diceCount * (diceSize + 1)) / 2);

    baseDamage = averageRoll;
  }

  // Додаємо модифікатор характеристики
  const statModifier =
    reactionAttack.type === AttackType.MELEE
      ? Math.floor((defender.abilities.strength - 10) / 2)
      : Math.floor((defender.abilities.dexterity - 10) / 2);

  baseDamage += statModifier;

  if (defender.basicInfo.sourceType === "character") {
    baseDamage += defender.abilities.level;
    const heroDice = getHeroDamageDiceForLevel(
      defender.abilities.level,
      reactionAttack.type as AttackType
    );
    baseDamage += getDiceAverage(heroDice);
  }

  const counterPercent = getCounterDamagePercent(defender);

  const multiplier = counterPercent > 0 ? 1 + counterPercent / 100 : 1.15;

  const reactionDamage = Math.floor(baseDamage * multiplier);

  // Оновлюємо defender (іммутабельно)

  const updatedDefender: BattleParticipant = {
    ...defender,
    actionFlags: {
      ...defender.actionFlags,
      hasUsedReaction: true,
    },
  };

  return {
    damage: reactionDamage,
    message: `${defender.basicInfo.name} виконує контр-удар на ${attacker.basicInfo.name}!`,
    updatedDefender,
  };
}
