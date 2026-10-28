import { CASTER_LEVEL_DIVISOR, MAX_CLASS_LEVEL, MULTICLASS_SLOTS, PACT_SLOTS } from "@/lib/constants/classes";
import { PACT_KEY } from "@/lib/utils/spells/slot-keys";
import type { CharacterClassEntry, GameClassData, ResolvedClassEntry } from "@/types/classes";

export type ClassSlots = Record<string, { max: number; level?: number }>;

const clampLevel = (level: number) => Math.max(0, Math.min(MAX_CLASS_LEVEL, Math.floor(level)));

export function casterLevel(entries: ResolvedClassEntry[]): number {
  const casters = entries.filter((e) => e.class && e.class.caster in CASTER_LEVEL_DIVISOR);

  if (casters.length === 0) return 0;

  if (casters.length === 1) {
    const { class: cls, level } = casters[0];

    if (cls?.caster === "full") return clampLevel(level);

    if (cls?.caster === "half") return level >= 2 ? clampLevel(Math.ceil(level / 2)) : 0;

    return level >= 3 ? clampLevel(Math.ceil(level / 3)) : 0;
  }

  const sum = casters.reduce((acc, { class: cls, level }) => {
    if (cls?.caster === "full") return acc + level;

    if (cls?.caster === "half") return acc + Math.floor(level / 2);

    return acc + Math.floor(level / 3);
  }, 0);

  return clampLevel(sum);
}

export function classSpellSlots(entries: ResolvedClassEntry[]): ClassSlots {
  const slots: ClassSlots = {};

  const level = casterLevel(entries);

  if (level > 0) {
    MULTICLASS_SLOTS[level - 1].forEach((max, i) => {
      if (max > 0) slots[String(i + 1)] = { max };
    });
  }

  const pactLevel = clampLevel(entries.filter((e) => e.class?.caster === "pact").reduce((acc, e) => acc + e.level, 0));

  if (pactLevel > 0) slots[PACT_KEY] = PACT_SLOTS[pactLevel - 1];

  return slots;
}

export function maxSlotLevelFor(entry: ResolvedClassEntry): number {
  const slots = classSpellSlots([entry]);

  const regular = Object.keys(slots).filter((k) => k !== PACT_KEY).map(Number).filter(Number.isFinite);

  return Math.max(0, slots[PACT_KEY]?.level ?? 0, ...regular);
}

export function resolveClassEntries(entries: CharacterClassEntry[], classesById: Record<string, GameClassData>): ResolvedClassEntry[] {
  return entries.map((entry) => {
    const cls = classesById[entry.classId] ?? null;

    const subclass = (entry.subclassId && cls?.subclasses.find((s) => s.id === entry.subclassId)) || null;

    return { ...entry, class: cls, subclass };
  });
}
