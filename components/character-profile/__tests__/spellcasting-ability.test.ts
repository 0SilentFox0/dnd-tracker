import { describe, expect, it } from "vitest";

import { toSpellcastingAbility } from "@/components/character-profile/spellcasting-ability";

describe("toSpellcastingAbility", () => {
  it("порожнє значення селекта («Немає») знімає характеристику", () => {
    expect(toSpellcastingAbility("")).toBeUndefined();
  });

  it("відомі характеристики проходять, сміття — ні", () => {
    expect(toSpellcastingAbility("wisdom")).toBe("wisdom");
    expect(toSpellcastingAbility("luck")).toBeUndefined();
  });
});
