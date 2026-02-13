/**
 * Утиліти для розрахунку магічних слотів при прокачці рівня
 */

import type { SpellSlotProgression } from "@/types/races";

export interface SpellSlots {
  [key: string]: {
    max: number;
    current: number;
  };
}

/**
 * Обчислює магічні слоти для ПЕРСОНАЖА (фіксована програмація).
 *
 * Логіка:
 * - Рівень 1: завжди 2 слоти 1 рівня
 * - Рівні 5, 10, 15, 20...: слот високого рівня (4 або 5, чергується)
 * - Кожен другий рівень (2, 4, 6, 8, 12, 14, 16, 18...): +1 регулярний слот (рівні 1–3)
 *
 * Регулярні рівні (без 5,10,15,20): 2, 4, 6, 8, 12, 14, 16, 18
 */
export function calculateCharacterSpellSlots(level: number): SpellSlots {
  const slots: SpellSlots = {
    "1": { max: 0, current: 0 },
    "2": { max: 0, current: 0 },
    "3": { max: 0, current: 0 },
    "4": { max: 0, current: 0 },
    "5": { max: 0, current: 0 },
  };

  if (level < 1) return {} as SpellSlots;

  // Рівень 1: завжди тільки 2 слоти 1 рівня (без слотів 2–5)
  slots["1"].max = 2;

  if (level === 1) {
    return { "1": slots["1"] } as SpellSlots;
  }

  // Регулярні рівні (кожен другий, крім 5,10,15,20): 2,4,6,8,12,14,16,18...
  const regularLevels = [2, 4, 6, 8, 12, 14, 16, 18];
  const regularGained = regularLevels.filter((l) => l <= level).length;

  // Слоти високого рівня на 5,10,15,20...
  const highLevels = Math.floor(level / 5);
  const highSlot = (n: number) => (n % 2 === 1 ? 4 : 5); // 5->4, 10->5, 15->4, 20->5

  // Додаємо високорівневі слоти
  for (let i = 1; i <= highLevels; i++) {
    const lvl = highSlot(i).toString();
    slots[lvl].max += 1;
  }

  // Регулярні слоти: розподіляємо на рівні 1, 2, 3 (пріоритет: 1 -> 2 -> 3)
  let remaining = regularGained;
  for (let i = 0; i < remaining; i++) {
    const r = i % 3;
    const key = (r + 1).toString();
    slots[key].max += 1;
  }

  // Повертаємо тільки рівні з хоча б одним слотом (рівень 1 не має слотів 2–5)
  const entries = Object.entries(slots).filter(([, v]) => v.max > 0);
  return Object.fromEntries(entries) as SpellSlots;
}

/**
 * Обчислює магічні слоти для рівня (з програмації раси)
 *
 * Використовується для рас з spellSlotProgression.
 * Для персонажів без програмації – використовуй calculateCharacterSpellSlots.
 */
export function calculateSpellSlotsForLevel(
  level: number,
  maxLevel: number,
  spellSlotProgression: SpellSlotProgression[]
): SpellSlots {
  const slots: SpellSlots = {
    "1": { max: 0, current: 0 },
    "2": { max: 0, current: 0 },
    "3": { max: 0, current: 0 },
    "4": { max: 0, current: 0 },
    "5": { max: 0, current: 0 },
  };

  // Якщо немає програмації — використовуємо фіксовану програмацію для персонажів
  if (!spellSlotProgression || spellSlotProgression.length === 0) {
    return calculateCharacterSpellSlots(level);
  }

  if (level === 0) return slots;

  const totalSlotsFromProgression = spellSlotProgression.reduce(
    (sum, p) => sum + p.slots,
    0
  );

  const baseSlotsForLevel = Math.floor(
    (totalSlotsFromProgression / maxLevel) * level
  );

  const specialLevels = Math.floor(level / 5);
  const getSpecialSlotLevel = (specialCount: number): number =>
    specialCount % 2 === 1 ? 4 : 5;

  for (let i = 1; i <= specialLevels; i++) {
    slots[getSpecialSlotLevel(i).toString()].max += 1;
  }

  const remainingSlots = baseSlotsForLevel - specialLevels;

  if (remainingSlots > 0) {
    const slotsPerLevel = Math.floor(remainingSlots / 3);
    const remainder = remainingSlots % 3;
    slots["1"].max = slotsPerLevel + (remainder >= 1 ? 1 : 0);
    slots["2"].max = slotsPerLevel + (remainder >= 2 ? 1 : 0);
    slots["3"].max = slotsPerLevel;
  }

  return slots;
}

/**
 * Обчислює зміну магічних слотів при підвищенні рівня
 */
export function calculateSpellSlotGain(
  currentLevel: number,
  newLevel: number,
  maxLevel: number,
  spellSlotProgression: SpellSlotProgression[]
): SpellSlots {
  const currentSlots = calculateSpellSlotsForLevel(
    currentLevel,
    maxLevel,
    spellSlotProgression
  );

  const newSlots = calculateSpellSlotsForLevel(
    newLevel,
    maxLevel,
    spellSlotProgression
  );

  // Обчислюємо різницю (збільшення)
  const gain: SpellSlots = {};
  
  for (let level = 1; level <= 5; level++) {
    const levelKey = level.toString();

    const increase = newSlots[levelKey].max - currentSlots[levelKey].max;

    if (increase > 0) {
      gain[levelKey] = {
        max: increase,
        current: increase,
      };
    }
  }

  return gain;
}
