import { describe, expect, it } from "vitest";

import { createClassSchema, createRaceSchema, createSpellSchema, updateClassSchema, updateSpellSchema } from "@/lib/schemas";

const column = (key: string) => ({ key, label: key, values: Array.from({ length: 20 }, () => "2") });

const skill = (id: string, extra: object = {}) => ({ id, label: id, kind: "skill", ...extra });

describe("owners carry choices", () => {
  it("race: choices with lineage", () => {
    expect(createRaceSchema.parse({ name: "Elf", choices: [skill("keen-senses"), { id: "l", label: "L", kind: "option", lineage: true, options: [{ id: "a", name: "A", spells: [{ level: 1, spellId: "Druidcraft" }] }] }] }).choices).toHaveLength(2);
    expect(createRaceSchema.safeParse({ name: "Elf", choices: [skill("k", { count: { scale: "x" } })] }).success).toBe(false);
  });

  it("class: feature choices; scale must name a column; ids unique across features and the subclass", () => {
    const features = [{ level: 2, abilities: [], choices: [skill("metamagic", { count: { scale: "metamagic" } })] }];

    expect(createClassSchema.safeParse({ name: "S", columns: [column("metamagic")], features }).success).toBe(true);
    expect(createClassSchema.safeParse({ name: "S", columns: [], features }).success).toBe(false);
    expect(createClassSchema.safeParse({ name: "S", features: [{ level: 1, abilities: [], choices: [skill("a")] }, { level: 2, abilities: [], choices: [skill("a")] }] }).success).toBe(false);
    expect(
      createClassSchema.safeParse({ name: "S", features: [{ level: 1, abilities: [], choices: [skill("a")] }], subclasses: [{ id: "sub", name: "Sub", features: [{ level: 3, abilities: [], choices: [skill("a")] }] }], subclassLevel: 3 }).success,
    ).toBe(false);
    expect(createClassSchema.parse({ name: "S", spellList: "Wizard" }).spellList).toBe("Wizard");
    expect(updateClassSchema.safeParse({ spellList: null }).success).toBe(true);
  });

  it("spell lists: ≤ 20 tags of ≤ 40 chars", () => {
    expect(createSpellSchema.parse({ name: "Fire Bolt", lists: ["Wizard", "Sorcerer"] }).lists).toEqual(["Wizard", "Sorcerer"]);
    expect(createSpellSchema.parse({ name: "Fire Bolt" }).lists).toBeUndefined();
    expect(updateSpellSchema.safeParse({ lists: Array.from({ length: 21 }, (_, i) => `L${i}`) }).success).toBe(false);
    expect(updateSpellSchema.safeParse({ lists: ["x".repeat(41)] }).success).toBe(false);
  });
});
