import { describe, expect, it } from "vitest";

import { SPELL_ONLY_FIXTURES } from "@/components/spells/form/effects/__tests__/spell-only-fixtures";
import { formToPayload, spellToForm } from "@/lib/utils/spells/model/form";
import type { Spell } from "@/types/spells";

const row: Spell = {
  id: "s1",
  name: "Test",
  level: 3,
  description: null,
  groupId: null,
  icon: null,
  dice: 0,
  cost: "action",
  targeting: { kind: "enemy", range: 30 },
  resolution: { kind: "auto" },
  spellEffects: Object.values(SPELL_ONLY_FIXTURES).map((f) => f.effect),
  raceModifiers: [],
  stackable: false,
  maxStacks: null,
} as never;

describe("spell form with every spell-only kind", () => {
  it("load, open and save without edits keeps spellEffects identical", () => {
    expect(formToPayload(spellToForm(row)).spellEffects).toEqual(row.spellEffects);
  });
});
