/**
 * Тести для executeSkillEffects (CODE_AUDIT 5.5).
 *
 * Покриває гілки 62-case switch — від damage stat (просто формат
 * рядка) до hp_bonus/armor (додають ActiveEffect через addActiveEffect)
 * до DOT-ефектів (parseDiceAverage + dotDamage).
 */

import { describe, expect, it } from "vitest";

import {
  createMockParticipant,
} from "../../__tests__/skill-triggers-execution-mocks";
import { executeSkillEffects } from "../effects";

import { SkillLevel } from "@/lib/types/skill-tree";
import type { ActiveSkill, SkillEffect } from "@/types/battle";

function makeSkill(effects: SkillEffect[]): ActiveSkill {
  return {
    skillId: "s-test",
    mainSkillId: "ms-1",
    name: "Test Skill",
    level: SkillLevel.BASIC,
    icon: "icon-x",
    effects,
  };
}

describe("executeSkillEffects — damage stat formatting", () => {
  it("formats melee_damage with percentage", () => {
    const skill = makeSkill([
      { stat: "melee_damage", type: "percent", value: 25, isPercentage: true },
    ]);

    const { effects } = executeSkillEffects(
      skill,
      createMockParticipant(),
      [],
      1,
    );

    expect(effects).toEqual(["melee_damage: +25%"]);
  });

  it("formats spell_damage as flat", () => {
    const skill = makeSkill([
      { stat: "spell_damage", type: "flat", value: 5, isPercentage: false },
    ]);

    const { effects } = executeSkillEffects(
      skill,
      createMockParticipant(),
      [],
      1,
    );

    expect(effects).toEqual(["spell_damage: +5"]);
  });

  it("formats chaos_spell_damage with percent flag", () => {
    const skill = makeSkill([
      {
        stat: "chaos_spell_damage",
        type: "percent",
        value: 30,
        isPercentage: true,
      },
    ]);

    const { effects } = executeSkillEffects(
      skill,
      createMockParticipant(),
      [],
      1,
    );

    expect(effects).toEqual(["chaos_spell_damage: +30%"]);
  });

  it("formats resistance always with %", () => {
    const skill = makeSkill([
      { stat: "physical_resistance", type: "percent", value: 50, isPercentage: true },
      { stat: "all_resistance", type: "percent", value: 10, isPercentage: true },
    ]);

    const { effects } = executeSkillEffects(
      skill,
      createMockParticipant(),
      [],
      1,
    );

    expect(effects).toEqual([
      "physical_resistance: 50%",
      "all_resistance: 10%",
    ]);
  });
});

describe("executeSkillEffects — buff/debuff stats add ActiveEffect", () => {
  it("hp_bonus positive value creates buff with effect entry", () => {
    const skill = makeSkill([
      { stat: "hp_bonus", type: "flat", value: 5, isPercentage: false, duration: 3 },
    ]);

    const { updatedParticipant, effects, messages } = executeSkillEffects(
      skill,
      createMockParticipant(),
      [],
      2,
    );

    const active = updatedParticipant.battleData.activeEffects;

    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({
      name: "Test Skill — hp_bonus",
      type: "buff",
      duration: 3,
      effects: [{ type: "hp_bonus", value: 5, isPercentage: false }],
    });
    expect(active[0].appliedAt.round).toBe(2);
    expect(effects).toEqual(["hp_bonus: +5"]);
    expect(messages[0]).toContain("hp_bonus +5");
  });

  it("armor negative value creates debuff", () => {
    const skill = makeSkill([
      { stat: "armor", type: "flat", value: -3, isPercentage: false },
    ]);

    const { updatedParticipant } = executeSkillEffects(
      skill,
      createMockParticipant(),
      [],
      1,
    );

    expect(updatedParticipant.battleData.activeEffects[0]).toMatchObject({
      type: "debuff",
      effects: [{ type: "armor", value: -3 }],
    });
  });

  it("speed/initiative/morale all use addActiveEffect path", () => {
    const skill = makeSkill([
      { stat: "speed", type: "flat", value: 10, isPercentage: false },
      { stat: "initiative", type: "flat", value: 2, isPercentage: false },
      { stat: "morale", type: "flat", value: 1, isPercentage: false },
    ]);

    const { updatedParticipant } = executeSkillEffects(
      skill,
      createMockParticipant(),
      [],
      1,
    );

    expect(updatedParticipant.battleData.activeEffects).toHaveLength(3);
    expect(
      updatedParticipant.battleData.activeEffects.map((e) => e.effects[0].type),
    ).toEqual(["speed", "initiative", "morale"]);
  });

  it("uses default duration=1 when effect.duration not set", () => {
    const skill = makeSkill([
      { stat: "hp_bonus", type: "flat", value: 1, isPercentage: false },
    ]);

    const { updatedParticipant } = executeSkillEffects(
      skill,
      createMockParticipant(),
      [],
      1,
    );

    expect(updatedParticipant.battleData.activeEffects[0].duration).toBe(1);
  });
});

describe("executeSkillEffects — DOT effects (bleed/poison/burn/fire)", () => {
  it("parses dice string into damagePerRound", () => {
    const skill = makeSkill([
      {
        stat: "bleed_damage",
        type: "flat",
        value: "2d6",
        isPercentage: false,
        duration: 2,
      },
    ]);

    const { updatedParticipant, effects, messages } = executeSkillEffects(
      skill,
      createMockParticipant(),
      [],
      1,
    );

    const active = updatedParticipant.battleData.activeEffects[0];

    expect(active.dotDamage).toBeDefined();
    expect(active.dotDamage?.damageType).toBe("bleed");
    // 2d6 average = 7
    expect(active.dotDamage?.damagePerRound).toBe(7);
    expect(active.duration).toBe(2);
    expect(effects[0]).toContain("bleed DOT: 2d6");
    expect(messages[0]).toContain("2d6 на 2 раундів");
  });

  it("uses numeric value directly when value is number", () => {
    const skill = makeSkill([
      { stat: "poison_damage", type: "flat", value: 8, isPercentage: false },
    ]);

    const { updatedParticipant } = executeSkillEffects(
      skill,
      createMockParticipant(),
      [],
      1,
    );

    expect(
      updatedParticipant.battleData.activeEffects[0].dotDamage,
    ).toMatchObject({
      damagePerRound: 8,
      damageType: "poison",
    });
  });

  it("strips _damage suffix when building damageType", () => {
    const skill = makeSkill([
      { stat: "burn_damage", type: "flat", value: 4, isPercentage: false },
      { stat: "fire_damage", type: "flat", value: 4, isPercentage: false },
    ]);

    const { updatedParticipant } = executeSkillEffects(
      skill,
      createMockParticipant(),
      [],
      1,
    );

    expect(
      updatedParticipant.battleData.activeEffects.map(
        (e) => e.dotDamage?.damageType,
      ),
    ).toEqual(["burn", "fire"]);
  });
});

describe("executeSkillEffects — generic stats (large case-list + default)", () => {
  it("guaranteed_hit / advantage / spell_targets formatting", () => {
    const skill = makeSkill([
      { stat: "guaranteed_hit", type: "flat", value: 1, isPercentage: false },
      { stat: "advantage", type: "flat", value: 1, isPercentage: false },
      { stat: "max_targets", type: "flat", value: 3, isPercentage: false },
    ]);

    const { effects } = executeSkillEffects(
      skill,
      createMockParticipant(),
      [],
      1,
    );

    expect(effects).toEqual([
      "guaranteed_hit: 1",
      "advantage: 1",
      "max_targets: 3",
    ]);
  });

  it("unknown stat falls through default branch (still formatted)", () => {
    const skill = makeSkill([
      { stat: "totally_unknown_stat", type: "flat", value: 42, isPercentage: false },
    ]);

    const { effects } = executeSkillEffects(
      skill,
      createMockParticipant(),
      [],
      1,
    );

    expect(effects).toEqual(["totally_unknown_stat: 42"]);
  });

  it("returns immutable participant when only damage-format effects", () => {
    const skill = makeSkill([
      { stat: "melee_damage", type: "percent", value: 10, isPercentage: true },
    ]);

    const original = createMockParticipant();

    const { updatedParticipant } = executeSkillEffects(skill, original, [], 1);

    // активних ефектів не додано — список залишається пустий
    expect(updatedParticipant.battleData.activeEffects).toEqual([]);
  });
});

describe("executeSkillEffects — multi-effect skill", () => {
  it("processes multiple effects in single call (mixing types)", () => {
    const skill = makeSkill([
      { stat: "melee_damage", type: "percent", value: 15, isPercentage: true },
      { stat: "hp_bonus", type: "flat", value: 5, isPercentage: false, duration: 2 },
      { stat: "guaranteed_hit", type: "flat", value: 1, isPercentage: false },
    ]);

    const { updatedParticipant, effects, messages } = executeSkillEffects(
      skill,
      createMockParticipant(),
      [],
      1,
    );

    expect(effects).toEqual([
      "melee_damage: +15%",
      "hp_bonus: +5",
      "guaranteed_hit: 1",
    ]);
    expect(updatedParticipant.battleData.activeEffects).toHaveLength(1);
    // лише hp_bonus генерує message
    expect(messages).toHaveLength(1);
  });

  it("returns empty effects list for skill with no effects", () => {
    const skill = makeSkill([]);

    const { effects, messages, updatedParticipant } = executeSkillEffects(
      skill,
      createMockParticipant(),
      [],
      1,
    );

    expect(effects).toEqual([]);
    expect(messages).toEqual([]);
    expect(updatedParticipant.battleData.activeEffects).toEqual([]);
  });
});
