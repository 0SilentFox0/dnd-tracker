import type { CharacterClassEntry } from "@/types/classes";

export function nextClassEntries(entries: CharacterClassEntry[], pick: { classId: string; subclassId?: string | null }): CharacterClassEntry[] {
  if (!entries.some((e) => e.classId === pick.classId)) return [...entries, { classId: pick.classId, level: 1, subclassId: pick.subclassId }];

  return entries.map((e) => (e.classId === pick.classId ? { ...e, level: e.level + 1, subclassId: e.subclassId ?? pick.subclassId } : e));
}
