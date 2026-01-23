// Утиліти для розрахунків D&D

import {
  Artifact,
  ArtifactBonus,
  ArtifactModifier,
} from "@/types/artifacts";
import { EquippedItems } from "@/types/inventory";
import { CharacterSkill, UnlockedSkill } from "@/types/skills";

/**
 * Розраховує модифікатор з ability score
 * Формула: (score - 10) / 2 (rounded down)
 */
export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Розраховує proficiency bonus залежно від рівня
 */
export function getProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}

/**
 * Розраховує пасивне значення (perception, investigation, insight)
 * Формула: 10 + ability modifier + (proficiency bonus якщо є proficiency)
 */
export function getPassiveScore(
  abilityModifier: number,
  hasProficiency: boolean,
  proficiencyBonus: number
): number {
  return 10 + abilityModifier + (hasProficiency ? proficiencyBonus : 0);
}

/**
 * Розраховує Spell Save DC
 * Формула: 8 + proficiency bonus + ability modifier
 */
export function getSpellSaveDC(
  proficiencyBonus: number,
  abilityModifier: number
): number {
  return 8 + proficiencyBonus + abilityModifier;
}

/**
 * Розраховує Spell Attack Bonus
 * Формула: proficiency bonus + ability modifier
 */
export function getSpellAttackBonus(
  proficiencyBonus: number,
  abilityModifier: number
): number {
  return proficiencyBonus + abilityModifier;
}

/**
 * Розраховує XP для рівня
 * Level 1 = 1000 XP
 * Кожен наступний рівень = попередній × multiplier
 */
export function getXPForLevel(level: number, multiplier: number = 2.5): number {
  if (level === 1) return 1000;

  return Math.floor(getXPForLevel(level - 1, multiplier) * multiplier);
}

/**
 * Розраховує рівень на основі XP
 */
export function getLevelFromXP(xp: number, multiplier: number = 2.5): number {
  let level = 1;

  let requiredXP = 1000;

  while (xp >= requiredXP) {
    level++;
    requiredXP = Math.floor(requiredXP * multiplier);
  }

  return level;
}

/**
 * Розраховує HP при прокачці
 * Формула: hitDice середнє значення + CON modifier
 */
export function calculateHPGain(
  hitDice: string,
  constitutionModifier: number
): number {
  // Парсимо hitDice (наприклад "1d8" -> 8)
  const match = hitDice.match(/(\d+)d(\d+)/);

  if (!match) return 0;

  const diceSize = parseInt(match[2]);

  const averageRoll = Math.ceil(diceSize / 2) + 0.5; // Середнє значення для dN

  return Math.floor(averageRoll) + constitutionModifier;
}

/**
 * Розраховує урон з кубиків
 * Підтримує формати: "2d4", "3d8+4", "1d6-1"
 */
export function rollDamage(dice: string, modifier: number = 0): number {
  const match = dice.match(/(\d+)d(\d+)([+-]\d+)?/);

  if (!match) return 0;

  const count = parseInt(match[1]);

  const size = parseInt(match[2]);

  const diceModifier = match[3] ? parseInt(match[3]) : 0;

  // В реальному застосунку тут буде генерація випадкових чисел
  // Для тестування повертаємо середнє значення
  const averageRoll = (count * (size + 1)) / 2;

  return Math.floor(averageRoll) + diceModifier + modifier;
}

/**
 * Перевіряє чи є критичне попадання (20 на d20)
 */
export function isCriticalHit(roll: number): boolean {
  return roll === 20;
}

/**
 * Перевіряє чи є критичний промах (1 на d20)
 */
export function isCriticalMiss(roll: number): boolean {
  return roll === 1;
}

/**
 * Розраховує чи попадання успішне
 */
export function isHit(attackRoll: number, targetAC: number): boolean {
  return attackRoll >= targetAC;
}

/**
 * Розраховує модифікатор атаки на основі типу атаки та характеристик
 * @param attackType - "melee" або "ranged"
 * @param strength - Сила персонажа
 * @param dexterity - Спритність персонажа
 * @returns Модифікатор для додавання до урону
 */
export function getAttackDamageModifier(
  attackType: "melee" | "ranged",
  strength: number,
  dexterity: number
): number {
  if (attackType === "melee") {
    return getAbilityModifier(strength);
  } else {
    return getAbilityModifier(dexterity);
  }
}

/**
 * Розраховує бонус до урону з артефактів
 * @param equipped - Об'єкт з екіпірованими артефактами { slot: artifactId }
 * @param artifacts - Масив артефактів кампанії
 * @returns Бонус до урону
 */
export function getArtifactDamageBonus(
  equipped: EquippedItems,
  artifacts: Artifact[]
): number {
  let bonus = 0;

  // Перевіряємо екіпіровані артефакти
  Object.values(equipped).forEach((artifactId) => {
    if (typeof artifactId === "string" && artifactId) {
      const artifact = artifacts.find((a) => a.id === artifactId);

      if (artifact) {
        // Додаємо бонуси з bonuses (наприклад { damage: 2 })
        const bonuses = artifact.bonuses as ArtifactBonus;

        if (bonuses?.damage) {
          bonus += Number(bonuses.damage) || 0;
        }

        // Додаємо модифікатори з modifiers
        if (Array.isArray(artifact.modifiers)) {
          artifact.modifiers.forEach((modifier: ArtifactModifier) => {
            if (modifier.type === "damage" && modifier.value) {
              bonus += Number(modifier.value) || 0;
            }
          });
        }
      }
    }
  });

  return bonus;
}

/**
 * Розраховує бонус до атаки з артефактів
 * @param equipped - Об'єкт з екіпірованими артефактами
 * @param artifacts - Масив артефактів кампанії
 * @returns Бонус до атаки
 */
export function getArtifactAttackBonus(
  equipped: EquippedItems,
  artifacts: Artifact[]
): number {
  let bonus = 0;

  Object.values(equipped).forEach((artifactId) => {
    if (typeof artifactId === "string" && artifactId) {
      const artifact = artifacts.find((a) => a.id === artifactId);

      if (artifact) {
        const bonuses = artifact.bonuses as ArtifactBonus;

        if (bonuses?.attack) {
          bonus += Number(bonuses.attack) || 0;
        }

        if (Array.isArray(artifact.modifiers)) {
          artifact.modifiers.forEach((modifier: ArtifactModifier) => {
            if (modifier.type === "attack" && modifier.value) {
              bonus += Number(modifier.value) || 0;
            }
          });
        }
      }
    }
  });

  return bonus;
}

/**
 * Розраховує бонус з дерева скілів
 * @param characterSkills - Масив CharacterSkills
 * @param skillTreeId - ID дерева скілів
 * @param skillName - Назва скілу (наприклад "melee_damage", "ranged_damage")
 * @returns Бонус зі скілу
 */
export function getSkillTreeBonus(
  characterSkills: CharacterSkill[],
  skillTreeId: string,
  skillName: string
): number {
  const characterSkill = characterSkills.find(
    (cs: CharacterSkill) => cs.skillTreeId === skillTreeId
  );

  if (!characterSkill) return 0;

  const unlockedSkills = Array.isArray(characterSkill.unlockedSkills)
    ? characterSkill.unlockedSkills
    : [];

  const skill = unlockedSkills.find(
    (s: UnlockedSkill) => s && (s.name === skillName || s.id === skillName)
  );

  if (skill?.bonus) {
    return Number(skill.bonus) || 0;
  }

  return 0;
}
