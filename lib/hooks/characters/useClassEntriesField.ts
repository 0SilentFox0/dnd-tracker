"use client";

import { classesLabel, classTotalLevel, subclassesLabel } from "@/lib/utils/characters/classes";
import type { CharacterFormBindings } from "@/lib/utils/characters/form/bindings";
import { resolveClassEntries } from "@/lib/utils/spells/class-slots";
import type { CharacterClassEntry, GameClassData } from "@/types/classes";

export const deriveClassFields = (entries: CharacterClassEntry[], byId: Record<string, GameClassData>) => {
  if (entries.length === 0) return null;

  const resolved = resolveClassEntries(entries, byId);

  return { class: classesLabel(resolved), subclass: subclassesLabel(resolved) ?? undefined, level: classTotalLevel(entries) };
};

export function useClassEntriesField(basicInfo: CharacterFormBindings["basicInfo"], byId: Record<string, GameClassData> = {}) {
  const { set } = basicInfo;

  return (entries: CharacterClassEntry[]) => {
    set("classes", entries);

    const derived = deriveClassFields(entries, byId);

    if (!derived) return;

    set("class", derived.class);
    set("subclass", derived.subclass);
    set("level", derived.level);
  };
}
