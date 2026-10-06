import type { BookSpell } from "@/types/spells";

export function groupSpellsByLevel(spells: BookSpell[]): Record<number, BookSpell[]> {
  const map: Record<number, BookSpell[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };

  for (const s of spells) (map[s.level] ??= []).push(s);

  for (const list of Object.values(map)) list.sort((a, b) => a.name.localeCompare(b.name, "uk"));

  return map;
}
