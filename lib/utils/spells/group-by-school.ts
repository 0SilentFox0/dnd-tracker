import type { BookSpell } from "@/types/spells";

export interface SchoolGroup {
  name: string;
  spells: BookSpell[];
}

const NO_SCHOOL = "Без школи";

export function groupSpellsBySchool(spells: BookSpell[]): SchoolGroup[] {
  const map = new Map<string, BookSpell[]>();

  for (const s of spells) {
    const name = s.spellGroup?.name ?? NO_SCHOOL;

    const list = map.get(name);

    if (list) list.push(s);
    else map.set(name, [s]);
  }

  return [...map.entries()]
    .sort(([a], [b]) => (a === NO_SCHOOL ? 1 : b === NO_SCHOOL ? -1 : a.localeCompare(b, "uk")))
    .map(([name, list]) => ({ name, spells: list }));
}
