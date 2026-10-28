import { describe, expect, it } from "vitest";

import { createUnitSchema, importUnitSchema, updateUnitSchema } from "@/lib/schemas/units";

describe("unit 5e fields", () => {
  it("create: дефолти HOMM", () => {
    expect(createUnitSchema.parse({ name: "Гоблін" })).toMatchObject({ multiattack: 1, legendaryActions: 0, legendaryResistances: 0, saveProficiencies: [] });
    expect(createUnitSchema.parse({ name: "Гоблін" }).cr).toBeUndefined();
  });

  it("CR лише з таблиці; null дозволено", () => {
    expect(createUnitSchema.safeParse({ name: "X", cr: 0.25 }).success).toBe(true);
    expect(createUnitSchema.safeParse({ name: "X", cr: 0.3 }).success).toBe(false);
    expect(createUnitSchema.safeParse({ name: "X", cr: 31 }).success).toBe(false);
    expect(updateUnitSchema.parse({ cr: null }).cr).toBeNull();
  });

  it("межі лічильників і ключі рятівних кидків", () => {
    expect(createUnitSchema.safeParse({ name: "X", multiattack: 0 }).success).toBe(false);
    expect(createUnitSchema.safeParse({ name: "X", legendaryActions: 6 }).success).toBe(false);
    expect(createUnitSchema.safeParse({ name: "X", saveProficiencies: ["luck"] }).success).toBe(false);
    expect(updateUnitSchema.parse({})).toEqual({});
  });

  it("import приймає поля 5e", () => {
    expect(importUnitSchema.parse({ name: "Огр", cr: 2, multiattack: 2, saveProficiencies: ["strength"] })).toMatchObject({ cr: 2, multiattack: 2, saveProficiencies: ["strength"], legendaryActions: 0 });
  });

  it("приймає обмежений statblock і spellcasting з грантами", () => {
    const data = createUnitSchema.parse({ name: "Дракон", statblock: { creatureType: "dragon", size: "huge", senses: { blindsight: 60 }, movement: { fly: 80 }, languages: "Common", lairResistances: 4 }, spellcasting: { ability: "charisma", dc: 21, spells: [{ spellId: "fireball", perBattle: 1, castLevel: 3, legendaryOnly: true }] } });

    expect(data.statblock.creatureType).toBe("dragon");
    expect(data.spellcasting.spells[0].spellId).toBe("fireball");
  });

  it("відхиляє зайві й небезпечні значення статблока та грантів", () => {
    expect(createUnitSchema.safeParse({ name: "X", statblock: { creatureType: "x", unexpected: true } }).success).toBe(false);
    expect(createUnitSchema.safeParse({ name: "X", statblock: { senses: { blindsight: 1001 } } }).success).toBe(false);
    expect(createUnitSchema.safeParse({ name: "X", spellcasting: { spells: [{ spellId: "s", recharge: 3 }] } }).success).toBe(false);
  });
});

for (const [boundary, schema] of Object.entries({ create: createUnitSchema, PATCH: updateUnitSchema, import: importUnitSchema })) {
  it(`${boundary} rejects duplicate spell grants even with conflicting limits`, () => {
    const result = schema.safeParse({ name: "Dragon", spellcasting: { spells: [{ spellId: "fire" }, { spellId: "fire", perBattle: 1, dc: 19 }] } });

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0].path).toEqual(["spellcasting", "spells", 1, "spellId"]);
  });
}
