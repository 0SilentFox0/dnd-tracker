import { describe, expect, it } from "vitest";

import { buildSkillFormPayload } from "@/lib/hooks/skills/useSkillForm-payload";

describe("buildSkillFormPayload", () => {
  it("abilities і null для знятих прив'язок", () => {
    const abilities = [{ id: "a1", name: "Лють", trigger: { event: "passive" as const }, effects: [{ kind: "note" as const, text: "x" }] }];

    const p = buildSkillFormPayload({
      name: "Лють",
      description: "",
      icon: "",
      abilities,
      spellId: "",
      spellGroupId: "",
      grantedSpellId: "",
      mainSkillId: "",
      spellEnhancementTypes: [],
      spellEffectIncrease: "",
      spellTargetChange: "",
      spellAdditionalModifier: { modifier: "", damageDice: "" },
      spellNewSpellId: "",
      spellAllowMultipleTargets: false,
      spellAoeSpellIds: [],
    });

    expect(p.abilities).toEqual(abilities);
    expect(p.spellData).toEqual({ spellId: null, spellGroupId: null, grantedSpellId: null });
    expect(p.mainSkillData).toEqual({ mainSkillId: null });
    expect(p).not.toHaveProperty("combatStats");
    expect(p).not.toHaveProperty("skillTriggers");
  });
});
