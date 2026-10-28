import { describe, expect, it } from "vitest";

import { defaultSpellForm, formToPayload, spellToForm } from "@/lib/utils/spells/model/form";
import type { Spell } from "@/types/spells";

const minimalSpell: Spell = {
  id: "s1",
  name: "Рій",
  level: 2,
  description: null,
  groupId: null,
  icon: null,
  dice: 2,
  cost: "action",
  targeting: { kind: "enemy" },
  resolution: { kind: "auto" },
  spellEffects: [],
  raceModifiers: [],
};

describe("spell form fx", () => {
  it("round-trips fx", () => {
    const form = spellToForm({ ...minimalSpell, fx: { archetype: "swarm", aura: "stings" } });

    expect(formToPayload(form).fx).toEqual({ archetype: "swarm", aura: "stings" });
  });

  it("an empty fx form sends null (clears the column)", () => {
    expect(formToPayload({ ...defaultSpellForm(), name: "X", fx: {} }).fx).toBeNull();
  });
});
