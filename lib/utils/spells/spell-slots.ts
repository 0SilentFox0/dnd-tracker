import type { SpellSlotProgression } from '@/types/races';

export interface SpellSlots {
    [key: string]: {
        max: number;
        current: number;
    };
}

export function calculateCharacterSpellSlots(level: number): SpellSlots {
    const slots: SpellSlots = {
        '1': { max: 0, current: 0 },
        '2': { max: 0, current: 0 },
        '3': { max: 0, current: 0 },
        '4': { max: 0, current: 0 },
        '5': { max: 0, current: 0 },
    };

    if (level < 1) return {} as SpellSlots;

    slots['1'].max = 2;

    if (level === 1) {
        return { '1': slots['1'] } as SpellSlots;
    }

    const regularLevels = [2, 4, 6, 8, 12, 14, 16, 18];

    const regularGained = regularLevels.filter((l) => l <= level).length;

    const highLevels = Math.floor(level / 5);

    const highSlot = (n: number) => (n % 2 === 1 ? 4 : 5); // 5->4, 10->5, 15->4, 20->5

    for (let i = 1; i <= highLevels; i++) {
        const lvl = highSlot(i).toString();

        slots[lvl].max += 1;
    }

    const toLevel1 = Math.min(regularGained, 1);

    const forLevel2And3 = regularGained - toLevel1;

    slots['1'].max += toLevel1;
    slots['2'].max += Math.ceil(forLevel2And3 / 2);
    slots['3'].max += Math.floor(forLevel2And3 / 2);

    const entries = Object.entries(slots).filter(([, v]) => v.max > 0);

    return Object.fromEntries(entries) as SpellSlots;
}

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

export function hasSpellSlotProgression(
    progression: SpellSlotProgression[] | null | undefined
): progression is SpellSlotProgression[] {
    return Array.isArray(progression) && progression.some((p) => p.slots > 0);
}

export function fullSpellSlots(
    level: number,
    progression: SpellSlotProgression[] | null | undefined,
    maxLevel = 20
): SpellSlots {
    return Object.fromEntries(
        Object.entries(
            calculateSpellSlotsForLevel(level, maxLevel, progression ?? [])
        )
            .filter(([, v]) => v.max > 0)
            .map(([k, v]) => [k, { max: v.max, current: v.max }])
    );
}

export function calculateSpellSlotsForLevel(
    level: number,
    _maxLevel: number,
    spellSlotProgression: SpellSlotProgression[]
): SpellSlots {
    const slots: SpellSlots = {
        '1': { max: 0, current: 0 },
        '2': { max: 0, current: 0 },
        '3': { max: 0, current: 0 },
        '4': { max: 0, current: 0 },
        '5': { max: 0, current: 0 },
    };

    if (level < 1) return slots;

    if (!hasSpellSlotProgression(spellSlotProgression)) {
        return calculateCharacterSpellSlots(level);
    }

    const curve =
        FULL_CASTER_CURVE[Math.min(level, FULL_CASTER_CURVE.length) - 1];

    for (const { level: spellLevel, slots: cap } of spellSlotProgression) {
        const key = String(spellLevel);

        if (key in slots)
            slots[key].max = Math.min(
                Math.max(0, Math.floor(cap)),
                curve[spellLevel - 1] ?? 0
            );
    }

    return slots;
}

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

    for (let level = 1; level <= 9; level++) {
        const levelKey = level.toString();

        const increase =
            (newSlots[levelKey]?.max ?? 0) - (currentSlots[levelKey]?.max ?? 0);

        if (increase > 0) {
            gain[levelKey] = {
                max: increase,
                current: increase,
            };
        }
    }

    return gain;
}
