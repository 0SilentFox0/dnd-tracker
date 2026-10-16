import { describe, expect, it } from "vitest";

import { groupSpellsBySchool } from "@/lib/utils/spells/group-by-level";
import type { BookSpell } from "@/types/spells";

const spell = (id: string, school?: string) => ({ id, name: id, level: 1, ...(school && { spellGroup: { id: school, name: school } }) }) as BookSpell;

describe("groupSpellsBySchool", () => {
  it("школи за абеткою, «Без школи» — в кінці, порядок усередині зберігається", () => {
    const groups = groupSpellsBySchool([spell("a"), spell("b", "Хаос"), spell("c", "Природа"), spell("d", "Хаос")]);

    expect(groups.map((g) => [g.name, g.spells.map((s) => s.id)])).toEqual([["Природа", ["c"]], ["Хаос", ["b", "d"]], ["Без школи", ["a"]]]);
  });
});
