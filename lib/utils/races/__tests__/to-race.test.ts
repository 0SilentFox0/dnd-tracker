import { describe, expect, it } from "vitest";

import { toRace } from "../to-race";

const row = {
  id: "r1",
  campaignId: "c1",
  name: "Ельфи",
  icon: null,
  color: "#fff",
  availableSkills: ["s1"],
  disabledSkills: "oops",
  passiveAbility: { description: "Зір" },
  spellSlotProgression: [{ level: 1, slots: 2 }],
  createdAt: new Date(0),
  updatedAt: new Date(1),
};

describe("toRace", () => {
  it("копіює поля й нормалізує JSON-колонки", () => {
    expect(toRace(row as never)).toEqual({
      id: "r1",
      campaignId: "c1",
      name: "Ельфи",
      icon: null,
      color: "#fff",
      availableSkills: ["s1"],
      disabledSkills: [],
      passiveAbility: { description: "Зір" },
      spellSlotProgression: [{ level: 1, slots: 2 }],
      createdAt: new Date(0),
      updatedAt: new Date(1),
    });
  });

  it("не-об'єктна пасивка — null, не-масив слотів — undefined", () => {
    const race = toRace({ ...row, passiveAbility: null, spellSlotProgression: {} } as never);

    expect(race.passiveAbility).toBeNull();
    expect(race.spellSlotProgression).toBeUndefined();
  });

  it("додає прочитані вміння", () => {
    expect(toRace(row as never, { abilities: [], abilityIssues: [] })).toMatchObject({ abilities: [], abilityIssues: [] });
  });
});
