import { describe, expect, it } from "vitest";

import { CharacterClassesSchema, createClassSchema } from "@/lib/schemas";

describe("createClassSchema", () => {
  it("fills defaults", () => {
    const c = createClassSchema.parse({ name: "Воїн" });

    expect(c).toMatchObject({
      hitDie: 8,
      savingThrows: [],
      proficiencies: { armor: [], weapons: [], tools: [] },
      skillChoices: { count: 0, from: [] },
      caster: "none",
      spellcastingAbility: null,
      features: [],
      subclassLevel: null,
      subclasses: [],
    });
  });

  it("rejects duplicate subclass ids", () => {
    const sub = { id: "a", name: "A", features: [] };

    expect(createClassSchema.safeParse({ name: "X", subclasses: [sub, sub] }).success).toBe(false);
  });
});

describe("CharacterClassesSchema", () => {
  it("rejects a repeated classId", () => {
    expect(CharacterClassesSchema.safeParse([{ classId: "a", level: 1 }, { classId: "a", level: 2 }]).success).toBe(false);
  });

  it("rejects level 21", () => {
    expect(CharacterClassesSchema.safeParse([{ classId: "a", level: 21 }]).success).toBe(false);
  });

  it("accepts a valid list", () => {
    expect(CharacterClassesSchema.safeParse([{ classId: "a", subclassId: null, level: 20 }]).success).toBe(true);
  });
});
