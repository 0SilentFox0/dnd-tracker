import { describe, expect, it } from "vitest";

import { updateCharacterSchema } from "@/app/api/campaigns/[id]/characters/[characterId]/update-character-schema";
import { createCharacterSchema } from "@/app/api/campaigns/[id]/characters/create-character-schema";

describe("updateCharacterSchema", () => {
  it("приймає primaryAbility і background", () => {
    const parsed = updateCharacterSchema.parse({ primaryAbility: "dexterity", background: "Текст ==важливе==" });

    expect(parsed.primaryAbility).toBe("dexterity");
    expect(parsed.background).toBe("Текст ==важливе==");
  });

  it("цілі через PATCH не приймаються — лише через /goals з його правилами", () => {
    const parsed = updateCharacterSchema.parse({ goals: [{ id: "g1", text: "Підробка", status: "active", author: "dm" }] }) as Record<string, unknown>;

    expect(parsed.goals).toBeUndefined();
  });

  it("null знімає основну характеристику, невідомий ключ — помилка", () => {
    expect(updateCharacterSchema.parse({ primaryAbility: null }).primaryAbility).toBeNull();
    expect(() => updateCharacterSchema.parse({ primaryAbility: "luck" })).toThrow();
  });

  it("мертві поля відкидаються", () => {
    const parsed = updateCharacterSchema.parse({ ideals: "x", hitDice: "1d8", proficiencyBonus: 2, maxHp: 30, currentHp: 20, tempHp: 5, spellcastingClass: "wizard" }) as Record<string, unknown>;

    for (const key of ["ideals", "hitDice", "proficiencyBonus", "maxHp", "currentHp", "tempHp", "spellcastingClass"]) expect(parsed[key]).toBeUndefined();
  });

  it("створення теж відкидає HP і клас заклинань", () => {
    const parsed = createCharacterSchema.parse({ name: "Ліра", type: "player", controlledBy: "u", class: "Ranger", race: "Ельф", maxHp: 30, currentHp: 20, tempHp: 5, spellcastingClass: "wizard" }) as Record<string, unknown>;

    for (const key of ["maxHp", "currentHp", "tempHp", "spellcastingClass"]) expect(parsed[key]).toBeUndefined();
  });

  it("порожні nullable-колонки з БД (null) не ламають збереження", () => {
    const parsed = updateCharacterSchema.parse({ subclass: null, subrace: null, alignment: null, background: null, avatar: null });

    expect(parsed.subclass).toBeNull();
    expect(parsed.background).toBeNull();
  });
});
