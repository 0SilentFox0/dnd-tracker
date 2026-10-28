import { describe, expect, it } from "vitest";

import { RACES } from "@/data/library/races";
import { characterToFormData, formDataToCharacter, mergeLevelUpIntoForm } from "@/lib/utils/characters/character-form";
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

  it("spellcastingAbility з відповіді підхоплюється, а без неї — зберігається", () => {
    const prev = characterToFormData({ level: 3, spellcastingAbility: "wisdom" } as Partial<Character>);

    expect(mergeLevelUpIntoForm(prev, { level: 4, spellcastingAbility: "intelligence" } as Partial<Character>).spellcasting.spellcastingAbility).toBe("intelligence");
    expect(mergeLevelUpIntoForm(prev, { level: 4 } as Partial<Character>).spellcasting.spellcastingAbility).toBe("wisdom");
  });
});

describe("characterToFormData: слоти за прогресією раси", () => {
  it("порожня таблиця слотів добудовується з прогресії раси, а не з таблиці персонажів", () => {
    const form = characterToFormData({ level: 9, spellSlots: {} }, RACES[0].spellSlotProgression);

    expect(Object.fromEntries(Object.entries(form.spellcasting.spellSlots ?? {}).map(([k, v]) => [k, v.max]))).toEqual({ "1": 4, "2": 3, "3": 3, "4": 2, "5": 1 });
  });
});

describe("архетип у формі", () => {
  it("читається з персонажа й пишеться назад; порожній → null; множників немає", () => {
    const form = characterToFormData({ name: "Лук", archetype: "rogue" } as Partial<Character>);

    expect(form.basicInfo.archetype).toBe("rogue");

    const payload = formDataToCharacter(form) as Record<string, unknown>;

    expect(payload.archetype).toBe("rogue");
    expect(formDataToCharacter(characterToFormData({ archetype: null } as Partial<Character>)).archetype).toBeNull();

    for (const key of ["hpMultiplier", "meleeMultiplier", "rangedMultiplier"]) expect(payload[key]).toBeUndefined();
  });

  it("formDataToCharacter відкидає рядки класів з порожнім classId", () => {
    const form = characterToFormData({ classes: [{ classId: "a", level: 1 }, { classId: "", level: 1 }] } as Partial<Character>);

    expect(formDataToCharacter(form).classes).toEqual([{ classId: "a", level: 1 }]);
  });
});
