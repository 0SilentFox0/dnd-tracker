import { describe, expect, it } from "vitest";

import { getInitialRaceFormData } from "../RaceEditFormUtils";

describe("getInitialRaceFormData", () => {
  it("keeps passive display fields so a DM save does not drop them", () => {
    const data = getInitialRaceFormData({
      name: "Гноми",
      availableSkills: [],
      passiveAbility: { name: "Кам'яна шкіра роду", icon: "https://x/y.webp", appearanceDescription: "Гном стоїть.", description: "+1 AC", statModifiers: { constitution: { bonus: true } } },
    });

    expect(data.passiveAbility).toMatchObject({ name: "Кам'яна шкіра роду", icon: "https://x/y.webp", appearanceDescription: "Гном стоїть.", description: "+1 AC" });
  });
});
