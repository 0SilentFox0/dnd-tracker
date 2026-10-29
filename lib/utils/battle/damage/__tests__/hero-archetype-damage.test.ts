import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { applyHeroDmDamageMultiplier } from "@/lib/utils/battle/damage/hero-dm-multiplier";
import { rowLines } from "@/lib/utils/battle/log/__tests__/event-text";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant/from-character";
import { computeSpellPower } from "@/lib/utils/battle/spell/power";
import type { BattleParticipant } from "@/types/battle";

function hero(abilities: Partial<BattleParticipant["abilities"]>): BattleParticipant {
  const p = createMockParticipant();

  return { ...p, basicInfo: { ...p.basicInfo, sourceType: ParticipantSourceType.CHARACTER }, abilities: { ...p.abilities, ...abilities } };
}

const warrior = { meleeMultiplier: 1.2, rangedMultiplier: 0.8, magicMultiplier: 0.6, archetypeName: "Воїн" };

describe("hero archetype damage", () => {
  it("melee and ranged use archetype percents with a labelled line", () => {
    const melee = applyHeroDmDamageMultiplier(hero(warrior), AttackType.MELEE, 10);

    expect(melee).toMatchObject({ damage: 12, multiplier: 1.2 });
    expect(melee.breakdownRow && rowLines([melee.breakdownRow])).toEqual(["Архетип: Воїн ×1.2 → 12"]);
    expect(applyHeroDmDamageMultiplier(hero(warrior), AttackType.RANGED, 10).damage).toBe(8);
  });

  it("units are not scaled", () => {
    const unit = createMockParticipant();

    expect(applyHeroDmDamageMultiplier({ ...unit, basicInfo: { ...unit.basicInfo, sourceType: ParticipantSourceType.UNIT } }, AttackType.MELEE, 10).multiplier).toBe(1);
  });

  it("old battle snapshots without archetypeName still work", () => {
    const r = applyHeroDmDamageMultiplier(hero({ meleeMultiplier: 1.5, rangedMultiplier: undefined }), AttackType.MELEE, 10);

    expect(r.damage).toBe(15);
    expect(r.breakdownRow && rowLines([r.breakdownRow])).toEqual(["Архетип ×1.5 → 15"]);
  });

  it("spell damage scales by magic multiplier, healing does not", () => {
    const caster = hero({ magicMultiplier: 1.25, archetypeName: "Маг" });

    const power = computeSpellPower({ caster, groupId: null, rolls: [4, 4], participants: [caster] });

    expect(power.damage).toBe(10);
    expect(power.heal).toBe(8);
    expect(rowLines(power.breakdown)).toContain("Архетип: Маг ×1.25 → 10");
  });

  it("battle participant takes percents from the archetype, ignoring manual DM values", async () => {
    const character = {
      id: "ch1", campaignId: "c1", name: "Герой", race: "Людина", class: "Воїн", level: 5,
      strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
      armorClass: 12, speed: 30, initiative: 0, morale: 0, controlledBy: "u1", immunities: [], knownSpells: [],
      equipment: {}, skillTreeProgress: {}, personalSkillId: null, archetype: "ranger", meleeMultiplier: 3,
    };

    const context = {
      skillTreeByRace: {}, mainSkills: [], spells: [], allSkills: [],
      racesByName: { "Людина": { id: "r", campaignId: "c1", name: "Людина", icon: null, color: null, availableSkills: [], disabledSkills: [], spellSlotProgression: [], passiveAbility: null, abilities: [] } },
      campaign: { maxLevel: 20 }, skillsById: {}, artifactsById: {}, artifactSetsById: {}, artifactSetMemberIds: {},
    } as never;

    const p = await createBattleParticipantFromCharacter(character as never, "b1", ParticipantSide.ALLY, undefined, context);

    expect(p.abilities.meleeMultiplier).toBe(0.7);
    expect(p.abilities.rangedMultiplier).toBe(1.5);
    expect(p.abilities.magicMultiplier).toBe(0.7);
    expect(p.abilities.archetypeName).toBe("Лучник");
  });
});
