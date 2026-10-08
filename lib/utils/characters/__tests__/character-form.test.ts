import { describe, expect, it } from "vitest";

import { RACES } from "@/data/library/races";
import { characterToFormData, mergeLevelUpIntoForm } from "@/lib/utils/characters/character-form";
import type { Character } from "@/types/characters";

describe("mergeLevelUpIntoForm", () => {
  it("оновлює рівень, характеристики й слоти; незбережені правки форми лишаються", () => {
    const prev = characterToFormData({ name: "Старе", level: 3, strength: 10, spellSlots: { "1": { max: 2, current: 1 } } } as Partial<Character>);

    const edited = { ...prev, basicInfo: { ...prev.basicInfo, name: "Нове ім'я" }, combatStats: { ...prev.combatStats, armorClass: 18 } };

    const merged = mergeLevelUpIntoForm(edited, { name: "Старе", level: 4, strength: 11, armorClass: 10, spellSlots: { "1": { max: 3, current: 3 } } } as Partial<Character>);

    expect(merged.basicInfo).toMatchObject({ name: "Нове ім'я", level: 4 });
    expect(merged.abilityScores.strength).toBe(11);
    expect(merged.spellcasting.spellSlots).toEqual({ "1": { max: 3, current: 3 } });
    expect(merged.combatStats.armorClass).toBe(18);
  });
});

describe("characterToFormData: слоти за прогресією раси", () => {
  it("порожня таблиця слотів добудовується з прогресії раси, а не з таблиці персонажів", () => {
    const form = characterToFormData({ level: 9, spellSlots: {} }, RACES[0].spellSlotProgression);

    expect(Object.fromEntries(Object.entries(form.spellcasting.spellSlots).map(([k, v]) => [k, v.max]))).toEqual({ "1": 4, "2": 3, "3": 3, "4": 2, "5": 1 });
  });
});
