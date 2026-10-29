import { UNGROUPED_KEY } from "@/lib/constants/ungrouped";
import { groupBy } from "@/lib/utils/common/collections";
import type { BookSpell } from "@/types/spells";

export interface SchoolGroup {
  name: string;
  color?: string | null;
  spells: BookSpell[];
}

export const NO_SCHOOL = UNGROUPED_KEY;

export function groupSpellsBySchool(spells: BookSpell[]): SchoolGroup[] {
  const map = groupBy(spells, (s) => s.spellGroup?.name ?? NO_SCHOOL);

  return [...map.entries()]
    .sort(([a], [b]) => (a === NO_SCHOOL ? 1 : b === NO_SCHOOL ? -1 : a.localeCompare(b, "uk")))
    .map(([name, list]) => ({ name, color: list[0].spellGroup?.color, spells: list }));
}
