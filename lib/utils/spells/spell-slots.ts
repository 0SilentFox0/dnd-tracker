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
 * - Кожен другий рівень (2, 4, 6, 8, 12, 14, 16, 18...): +1 регулярний слот
 * - Регулярні слоти розподіляються рівномірніше: рівень 1 обмежено (макс +1),
 *   решта йде на рівні 2 і 3 порівну, щоб уникнути 4+ слотів лише на 1 рівні.
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

  for (let i = 1; i <= highLevels; i++) {
    const lvl = highSlot(i).toString();

    slots[lvl].max += 1;
  }

  // Рівномірніший розподіл регулярних слотів: рівень 1 отримує щонайбільше +1,
  // решта йде на рівні 2 і 3 (приблизно порівну)
  const toLevel1 = Math.min(regularGained, 1);

  const forLevel2And3 = regularGained - toLevel1;

  slots["1"].max += toLevel1;
  slots["2"].max += Math.ceil(forLevel2And3 / 2);
  slots["3"].max += Math.floor(forLevel2And3 / 2);

  const entries = Object.entries(slots).filter(([, v]) => v.max > 0);

  return Object.fromEntries(entries) as SpellSlots;
}

/** Слоти повного заклинача 5e за рівнем героя (рівні заклять 1–5); програмація раси обмежує кожен рівень зверху. */
const FULL_CASTER_CURVE: number[][] = [
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
];

/**
 * Обчислює магічні слоти для рівня (з програмації раси)
 *
 * Використовується для рас з spellSlotProgression: кожен запис — максимум слотів цього рівня магії, а відкриваються вони за кривою заклинача 5e (рівень героя).
 * Для персонажів без програмації – використовуй calculateCharacterSpellSlots.
 */
export function calculateSpellSlotsForLevel(
  level: number,
  _maxLevel: number,
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

  const curve = FULL_CASTER_CURVE[Math.min(level, FULL_CASTER_CURVE.length) - 1];

  for (const { level: spellLevel, slots: cap } of spellSlotProgression) {
    const key = String(spellLevel);

    if (key in slots) slots[key].max = Math.min(Math.max(0, Math.floor(cap)), curve[spellLevel - 1] ?? 0);
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

  const gain: SpellSlots = {};
  
  for (let level = 1; level <= 5; level++) {
    const levelKey = level.toString();

    const increase = (newSlots[levelKey]?.max ?? 0) - (currentSlots[levelKey]?.max ?? 0);

    if (increase > 0) {
      gain[levelKey] = {
        max: increase,
        current: increase,
      };
    }
  }

  return gain;
}
