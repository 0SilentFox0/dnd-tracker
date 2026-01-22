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
 * Обчислює магічні слоти для рівня персонажа
 * 
 * Логіка:
 * 1. Базові слоти розраховуються: (загальна_кількість_слотів / максимальний_рівень) * поточний_рівень
 * 2. Кожні 5 рівнів (5, 10, 15, 20, 25...) додається 1 слот високого рівня (4 або 5)
 * 3. Решта слотів розподіляються рівномірно на рівнях 1-3
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

  // Якщо немає програмації або рівень 0
  if (!spellSlotProgression || spellSlotProgression.length === 0 || level === 0) {
    return slots;
  }

  // Обчислюємо загальну кількість слотів з програмації раси
  const totalSlotsFromProgression = spellSlotProgression.reduce(
    (sum, p) => sum + p.slots,
    0
  );

  // Базова кількість слотів для цього рівня
  const baseSlotsForLevel = Math.floor(
    (totalSlotsFromProgression / maxLevel) * level
  );

  // Рахуємо кількість "особливих" рівнів (кожні 5 рівнів)
  const specialLevels = Math.floor(level / 5);
  
  // Визначаємо рівень для "особливого" слота (чергуємо 4 і 5)
  // Паттерн: 5->4, 10->5, 15->4, 20->5, 25->4 (непарні -> 4, парні -> 5)
  const getSpecialSlotLevel = (specialCount: number): number => {
    // specialCount: 1(5р), 2(10р), 3(15р), 4(20р), 5(25р)...
    // Непарні (1,3,5...) -> 4 рівень
    // Парні (2,4...) -> 5 рівень
    return specialCount % 2 === 1 ? 4 : 5;
  };

  // Додаємо "особливі" слоти високого рівня
  for (let i = 1; i <= specialLevels; i++) {
    const specialSlotLevel = getSpecialSlotLevel(i);
    slots[specialSlotLevel.toString()].max += 1;
  }

  // Решта слотів розподіляємо рівномірно на рівнях 1-3
  const remainingSlots = baseSlotsForLevel - specialLevels;

  if (remainingSlots > 0) {
    // Розподіляємо рівномірно між рівнями 1, 2, 3
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
