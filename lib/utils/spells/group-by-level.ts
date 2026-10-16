import type { BookSpell } from "@/types/spells";

export function groupSpellsByLevel(spells: BookSpell[]): Record<number, BookSpell[]> {
  const map: Record<number, BookSpell[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };

  for (const s of spells) (map[s.level] ??= []).push(s);

  for (const list of Object.values(map)) list.sort((a, b) => a.name.localeCompare(b.name, "uk"));

  return map;
}

export interface SchoolGroup {
  name: string;
  spells: BookSpell[];
}

const NO_SCHOOL = "Без школи";

export function groupSpellsBySchool(spells: BookSpell[]): SchoolGroup[] {
  const map = new Map<string, BookSpell[]>();

  for (const s of spells) {
    const name = s.spellGroup?.name ?? NO_SCHOOL;

    map.set(name, [...(map.get(name) ?? []), s]);
  }

  return [...map.entries()]
    .sort(([a], [b]) => (a === NO_SCHOOL ? 1 : b === NO_SCHOOL ? -1 : a.localeCompare(b, "uk")))
    .map(([name, list]) => ({ name, spells: list }));
}
