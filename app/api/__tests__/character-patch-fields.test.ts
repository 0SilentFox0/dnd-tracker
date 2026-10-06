import { describe, expect, it } from "vitest";

import { updateCharacterSchema } from "@/app/api/campaigns/[id]/characters/[characterId]/update-character-schema";

describe("updateCharacterSchema", () => {
  it("приймає primaryAbility, goals, background", () => {
    const parsed = updateCharacterSchema.parse({
      primaryAbility: "dexterity",
      goals: [{ id: "g1", text: "Ціль", status: "active", author: "dm" }],
      background: "Текст ==важливе==",
    });

    expect(parsed.primaryAbility).toBe("dexterity");
    expect(parsed.goals).toHaveLength(1);
  });

  it("null знімає основну характеристику, невідомий ключ — помилка", () => {
    expect(updateCharacterSchema.parse({ primaryAbility: null }).primaryAbility).toBeNull();
    expect(() => updateCharacterSchema.parse({ primaryAbility: "luck" })).toThrow();
  });

  it("мертві поля відкидаються", () => {
    const parsed = updateCharacterSchema.parse({ ideals: "x", hitDice: "1d8", proficiencyBonus: 2 }) as Record<string, unknown>;

    expect(parsed.ideals).toBeUndefined();
    expect(parsed.hitDice).toBeUndefined();
  });

  it("порожні nullable-колонки з БД (null) не ламають збереження", () => {
    const parsed = updateCharacterSchema.parse({ subclass: null, subrace: null, alignment: null, background: null, avatar: null, spellcastingClass: null });

    expect(parsed.subclass).toBeNull();
    expect(parsed.background).toBeNull();
  });
});
