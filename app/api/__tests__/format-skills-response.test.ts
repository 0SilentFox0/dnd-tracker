import { describe, expect, it } from "vitest";

import { formatSkillsListResponse } from "@/app/api/campaigns/[id]/skills/format-skills-response";

const row = (mainSkillData: unknown) =>
  ({
    id: "s1", campaignId: "c", name: "Скіл", description: null, icon: null, bonuses: {}, damage: null, armor: null, speed: null,
    physicalResistance: null, magicalResistance: null, spellId: null, spellGroupId: null, mainSkillId: "attack", spellEnhancementTypes: [],
    spellEffectIncrease: null, spellTargetChange: null, spellAdditionalModifier: null, spellNewSpellId: null, basicInfo: {}, combatStats: {},
    mainSkillData, spellData: {}, spellEnhancementData: {}, skillTriggers: [], image: null, createdAt: new Date(),
  }) as never;

describe("formatSkillsListResponse", () => {
  it("mainSkillData несе mainSkillId колонки навіть коли JSON порожній", () => {
    expect(formatSkillsListResponse([row({})])[0].mainSkillData).toMatchObject({ mainSkillId: "attack" });
    expect(formatSkillsListResponse([row(null)])[0].mainSkillData).toMatchObject({ mainSkillId: "attack" });
  });
});
