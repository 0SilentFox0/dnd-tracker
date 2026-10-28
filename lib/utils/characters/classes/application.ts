import { SPELLCASTING_ABILITIES, type SpellcastingAbility } from "@/lib/constants/abilities";
import { API_ERRORS, maxLevelMessage, subclassTooEarlyMessage } from "@/lib/constants/api-errors";
import { classesLabel, classSpellcastingAbility, classTotalLevel, subclassesLabel } from "@/lib/utils/characters/classes/derive";
import type { Ruleset } from "@/lib/utils/rules/schema";
import { classSpellSlots, resolveClassEntries } from "@/lib/utils/spells/class-slots";
import type { StoredSpellSlots } from "@/lib/utils/spells/slot-keys";
import type { CharacterClassEntry, GameClassData } from "@/types/classes";

export interface ClassesApplied {
  classes: CharacterClassEntry[];
  level: number;
  class: string;
  subclass: string | null;
  spellSlots: StoredSpellSlots;
  spellcastingAbility?: SpellcastingAbility;
}

export type ClassesApplyResult = { ok: true; data: ClassesApplied | null; classesById?: Record<string, GameClassData> } | { ok: false; status: 422; error: string };

export function validateClassEntries(entries: CharacterClassEntry[], classesById: Record<string, GameClassData>, maxLevel: number): string | null {
  for (const entry of entries) {
    const cls = classesById[entry.classId];

    if (!cls) return API_ERRORS.CLASS_NOT_FOUND;

    if (entry.subclassId) {
      if (!cls.subclasses.some((s) => s.id === entry.subclassId)) return API_ERRORS.SUBCLASS_NOT_FOUND;

      if (cls.subclassLevel === null || entry.level < cls.subclassLevel) return subclassTooEarlyMessage(cls.subclassLevel ?? 1);
    }
  }

  return classTotalLevel(entries) > maxLevel ? maxLevelMessage(maxLevel) : null;
}

export interface ClassApplicationInput {
  rules: Ruleset;
  maxLevel: number;
  entries: CharacterClassEntry[];
  spellcastingAbility: string | null;
}

export function deriveClassApplication({ rules, maxLevel, entries, spellcastingAbility }: ClassApplicationInput, byId: Record<string, GameClassData>): ClassesApplyResult {
  if (entries.length === 0) return { ok: true, data: null };

  if (!rules.classes.enabled) return { ok: false, status: 422, error: API_ERRORS.CLASSES_DISABLED };

  const error = validateClassEntries(entries, byId, maxLevel);

  if (error) return { ok: false, status: 422, error };

  const resolved = resolveClassEntries(entries, byId);

  const spellSlots: StoredSpellSlots = Object.fromEntries(Object.entries(classSpellSlots(resolved)).map(([key, slot]) => [key, { ...slot, current: slot.max }]));

  return {
    ok: true,
    classesById: byId,
    data: {
      classes: entries,
      level: classTotalLevel(entries),
      class: classesLabel(resolved),
      subclass: subclassesLabel(resolved),
      spellSlots,
      spellcastingAbility: spellcastingAbility ? undefined : SPELLCASTING_ABILITIES.find((a) => a === classSpellcastingAbility(resolved)),
    },
  };
}
