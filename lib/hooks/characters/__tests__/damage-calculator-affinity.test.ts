import { describe, expect, it } from "vitest";

import { formatSkillsListResponse } from "@/app/api/campaigns/[id]/skills/format-skills-response";
import { skillDamageAffinity } from "@/lib/hooks/characters/useDamageCalculator-skills";

describe("калькулятор шкоди бере вплив скіла з умінь", () => {
  it("список скілів віддає damageAffinity з abilities", () => {
    const [skill] = formatSkillsListResponse([
      {
        id: "s1", campaignId: "c1", name: "Лють", description: null, icon: null, bonuses: {}, damage: null, armor: null, speed: null, physicalResistance: null, magicalResistance: null,
        spellId: null, spellGroupId: null, mainSkillId: null, spellEnhancementTypes: null, spellEffectIncrease: null, spellTargetChange: null, spellAdditionalModifier: null, spellNewSpellId: null,
        basicInfo: {}, combatStats: {}, mainSkillData: {}, spellData: {}, spellEnhancementData: {}, skillTriggers: [], image: null, createdAt: new Date(),
        abilities: [{ id: "a", name: "Лють", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "ranged" }, percent: 10 }] }],
      },
    ]);

    expect(skill.damageAffinity).toEqual({ affectsDamage: true, damageType: "ranged" });
  });

  it("damageAffinity має пріоритет над старим combatStats", () => {
    expect(skillDamageAffinity({ combatStats: { affectsDamage: false }, damageAffinity: { affectsDamage: true, damageType: "magic" } })).toEqual({ affectsDamage: true, damageType: "magic" });
    expect(skillDamageAffinity({ combatStats: { affectsDamage: true, damageType: "melee" } })).toEqual({ affectsDamage: true, damageType: "melee" });
  });
});
