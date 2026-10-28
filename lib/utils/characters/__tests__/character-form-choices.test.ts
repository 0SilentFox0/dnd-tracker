import { describe, expect, it } from "vitest";

import { characterToFormData, formDataToCharacter } from "@/lib/utils/characters/character-form";
import type { Character } from "@/types/characters";

const hero = { name: "Lia", type: "player", controlledBy: "p", level: 1, class: "", race: "Elf", strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 } as unknown as Character;

describe("character form and choices", () => {
  it("choices appear only when the hero has any", () => {
    expect(characterToFormData(hero)).not.toHaveProperty("choices");

    const form = characterToFormData({ ...hero, raceChoices: { l: [{ id: "drow" }] }, feats: [] });

    expect(form.choices).toEqual({ raceChoices: { l: [{ id: "drow" }] }, feats: [] });
    expect(formDataToCharacter(form)).toMatchObject({ raceChoices: { l: [{ id: "drow" }] }, feats: [] });
    expect(formDataToCharacter(characterToFormData(hero))).not.toHaveProperty("raceChoices");
  });
});
