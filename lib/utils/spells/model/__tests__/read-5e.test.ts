import { describe, expect, it } from "vitest";

import { readSpellDefinition, spellDefinitionColumns } from "@/lib/utils/spells/model/read";

describe("readSpellDefinition 5e", () => {
  it("читає нові колонки", () => {
    const def = readSpellDefinition({ id: "s", dice: 3, dieSides: 8, upcastDice: 1, upcastTargets: 2, addAbilityMod: true });

    expect(def).toMatchObject({ dieSides: 8, upcastDice: 1, upcastTargets: 2, addAbilityMod: true });
  });

  it("null колонки — полів немає", () => {
    const def = readSpellDefinition({ id: "s", dice: 3, dieSides: null, upcastDice: null, upcastTargets: null, addAbilityMod: null });

    expect(def).not.toHaveProperty("dieSides");
    expect(def).not.toHaveProperty("upcastDice");
    expect(def).not.toHaveProperty("upcastTargets");
    expect(def).not.toHaveProperty("addAbilityMod");
  });

  it("некоректний dieSides ігнорується", () => {
    expect(readSpellDefinition({ id: "s", dieSides: 7 })).not.toHaveProperty("dieSides");
  });

  it("round-trip через колонки", () => {
    const def = readSpellDefinition({ id: "s", dice: 2, dieSides: 10, upcastDice: 1, upcastTargets: 0, addAbilityMod: true });

    const cols = spellDefinitionColumns(def);

    expect(cols).toMatchObject({ dieSides: 10, upcastDice: 1, upcastTargets: 0, addAbilityMod: true });
    expect(readSpellDefinition({ id: "s", ...cols })).toEqual(def);
  });

  it("HOMM-рядок: колонки null", () => {
    expect(spellDefinitionColumns(readSpellDefinition({ id: "s", dice: 2 }))).toMatchObject({ dieSides: null, upcastDice: null, upcastTargets: null, addAbilityMod: null });
  });
});
