/**
 * Тести для passive.ts (CODE_AUDIT 5.7).
 *
 * Покриває:
 *  - applyOnePassiveStatEffect: всі стати з 30+case switch (hp_bonus,
 *    resistances, morale, crit_threshold, spell_levels, spell_slots,
 *    advantage*, control_units, morale_per_kill/ally_death тощо).
 *  - applyPassiveSkillEffects: фільтрація за trigger=passive,
 *    "highest level on a line wins" для резистів.
 *  - applyArtifactPassiveEffects: пропускання `all_allies/all_enemies`
 *    audience (там окрема логіка через ефект-сети), застосування
 *    решти.
 */

import { describe, expect, it } from "vitest";

import {
  createMockParticipant,
} from "../../../skills/__tests__/skill-triggers-execution-mocks";
import { getParticipantExtras, getParticipantResistances } from "../extras";
import {
  applyArtifactPassiveEffects,
  applyOnePassiveStatEffect,
  applyPassiveSkillEffects,
  type PassiveResistanceContext,
} from "../passive";

import {
  ARTIFACT_EFFECT_ALL_ALLIES,
  ARTIFACT_EFFECT_ALL_ENEMIES,
} from "@/lib/constants/artifact-effect-scope";
import { SkillLevel } from "@/lib/types/skill-tree";
import type { ActiveSkill, EquippedArtifact, SkillEffect } from "@/types/battle";

const ARTIFACT_CTX: PassiveResistanceContext = { source: "artifact" };

function skillCtx(skillId: string, winners: string[] = [skillId]): PassiveResistanceContext {
  return {
    source: "skill",
    skillId,
    resistanceWinners: new Set(winners),
  };
}

describe("applyOnePassiveStatEffect — basic stats", () => {
  it("hp_bonus increases both maxHp and currentHp", () => {
    const p = createMockParticipant();

    const before = { max: p.combatStats.maxHp, cur: p.combatStats.currentHp };

    applyOnePassiveStatEffect(
      p,
      { stat: "hp_bonus", type: "flat", value: 5, isPercentage: false },
      ARTIFACT_CTX,
    );

    expect(p.combatStats.maxHp).toBe(before.max + 5);
    expect(p.combatStats.currentHp).toBe(before.cur + 5);
  });

  it("hp_bonus formula evaluates against participant context", () => {
    const p = createMockParticipant({
      abilities: { ...createMockParticipant().abilities, level: 5 },
    });

    applyOnePassiveStatEffect(
      p,
      { stat: "hp_bonus", type: "formula", value: "hero_level * 2", isPercentage: false },
      ARTIFACT_CTX,
    );

    // floor(5 * 2) = 10
    expect(p.combatStats.maxHp).toBe(20 + 10);
  });

  it("morale flat adds to current morale", () => {
    const p = createMockParticipant();

    applyOnePassiveStatEffect(
      p,
      { stat: "morale", type: "flat", value: 3, isPercentage: false },
      ARTIFACT_CTX,
    );

    expect(p.combatStats.morale).toBe(3);
  });

  it("morale type='min' raises current morale up to floor + tracks minMorale", () => {
    const p = createMockParticipant();

    applyOnePassiveStatEffect(
      p,
      { stat: "morale", type: "min", value: 5, isPercentage: false },
      ARTIFACT_CTX,
    );

    expect(p.combatStats.morale).toBe(5);
    expect(getParticipantExtras(p).minMorale).toBe(5);
  });

  it("morale type='min' does not lower morale already above floor", () => {
    const p = createMockParticipant({
      combatStats: { ...createMockParticipant().combatStats, morale: 10 },
    });

    applyOnePassiveStatEffect(
      p,
      { stat: "morale", type: "min", value: 5, isPercentage: false },
      ARTIFACT_CTX,
    );

    expect(p.combatStats.morale).toBe(10);
    expect(getParticipantExtras(p).minMorale).toBe(5);
  });
});

describe("applyOnePassiveStatEffect — resistances + skill ctx gating", () => {
  it("artifact source applies resistance unconditionally", () => {
    const p = createMockParticipant();

    applyOnePassiveStatEffect(
      p,
      { stat: "physical_resistance", type: "flat", value: 30, isPercentage: false },
      ARTIFACT_CTX,
    );

    expect(getParticipantResistances(p).physical).toBe(30);
  });

  it("skill source skips resistance when skillId not in winners", () => {
    const p = createMockParticipant();

    applyOnePassiveStatEffect(
      p,
      { stat: "spell_resistance", type: "flat", value: 25, isPercentage: false },
      skillCtx("looser-skill", ["winner-skill"]),
    );

    expect(getParticipantResistances(p).spell ?? 0).toBe(0);
  });

  it("skill source applies when skillId is in winners", () => {
    const p = createMockParticipant();

    applyOnePassiveStatEffect(
      p,
      { stat: "spell_resistance", type: "flat", value: 25, isPercentage: false },
      skillCtx("winner-skill"),
    );

    expect(getParticipantResistances(p).spell).toBe(25);
  });

  it("all_resistance fills both physical and spell", () => {
    const p = createMockParticipant();

    applyOnePassiveStatEffect(
      p,
      { stat: "all_resistance", type: "flat", value: 15, isPercentage: false },
      ARTIFACT_CTX,
    );

    const r = getParticipantResistances(p);

    expect(r.physical).toBe(15);
    expect(r.spell).toBe(15);
  });

  it("resistance is capped at 100", () => {
    const p = createMockParticipant();

    applyOnePassiveStatEffect(
      p,
      { stat: "physical_resistance", type: "flat", value: 80, isPercentage: false },
      ARTIFACT_CTX,
    );
    applyOnePassiveStatEffect(
      p,
      { stat: "physical_resistance", type: "flat", value: 80, isPercentage: false },
      ARTIFACT_CTX,
    );

    expect(getParticipantResistances(p).physical).toBe(100);
  });
});

describe("applyOnePassiveStatEffect — extras flags", () => {
  it("crit_threshold takes minimum (lower = easier crit)", () => {
    const p = createMockParticipant();

    applyOnePassiveStatEffect(
      p,
      { stat: "crit_threshold", type: "flat", value: 18, isPercentage: false },
      ARTIFACT_CTX,
    );
    applyOnePassiveStatEffect(
      p,
      { stat: "crit_threshold", type: "flat", value: 19, isPercentage: false },
      ARTIFACT_CTX,
    );

    expect(getParticipantExtras(p).critThreshold).toBe(18);
  });

  it("spell_levels takes maximum", () => {
    const p = createMockParticipant();

    applyOnePassiveStatEffect(
      p,
      { stat: "spell_levels", type: "flat", value: 3, isPercentage: false },
      ARTIFACT_CTX,
    );
    applyOnePassiveStatEffect(
      p,
      { stat: "spell_levels", type: "flat", value: 5, isPercentage: false },
      ARTIFACT_CTX,
    );
    applyOnePassiveStatEffect(
      p,
      { stat: "spell_levels", type: "flat", value: 4, isPercentage: false },
      ARTIFACT_CTX,
    );

    expect(getParticipantExtras(p).maxSpellLevel).toBe(5);
  });

  it("advantage / advantage_ranged / enemy_attack_disadvantage set boolean flags", () => {
    const p = createMockParticipant();

    for (const stat of [
      "advantage",
      "advantage_ranged",
      "enemy_attack_disadvantage",
      "light_spells_target_all_allies",
    ] as const) {
      applyOnePassiveStatEffect(
        p,
        { stat, type: "flag", value: "", isPercentage: false },
        ARTIFACT_CTX,
      );
    }

    const ext = getParticipantExtras(p);

    expect(ext.advantageOnAllRolls).toBe(true);
    expect(ext.advantageOnRangedAttacks).toBe(true);
    expect(ext.enemyAttackDisadvantage).toBe(true);
    expect(ext.lightSpellsTargetAllAllies).toBe(true);
  });

  it("control_units accumulates", () => {
    const p = createMockParticipant();

    applyOnePassiveStatEffect(
      p,
      { stat: "control_units", type: "flat", value: 2, isPercentage: false },
      ARTIFACT_CTX,
    );
    applyOnePassiveStatEffect(
      p,
      { stat: "control_units", type: "flat", value: 3, isPercentage: false },
      ARTIFACT_CTX,
    );

    expect(getParticipantExtras(p).controlUnits).toBe(5);
  });

  it("morale_per_kill / morale_per_ally_death accumulate independently", () => {
    const p = createMockParticipant();

    applyOnePassiveStatEffect(
      p,
      { stat: "morale_per_kill", type: "flat", value: 1, isPercentage: false },
      ARTIFACT_CTX,
    );
    applyOnePassiveStatEffect(
      p,
      { stat: "morale_per_kill", type: "flat", value: 2, isPercentage: false },
      ARTIFACT_CTX,
    );
    applyOnePassiveStatEffect(
      p,
      { stat: "morale_per_ally_death", type: "flat", value: -1, isPercentage: false },
      ARTIFACT_CTX,
    );

    const ext = getParticipantExtras(p);

    expect(ext.moralePerKill).toBe(3);
    expect(ext.moralePerAllyDeath).toBe(-1);
  });
});

describe("applyOnePassiveStatEffect — spell slots", () => {
  it("spell_slots_lvl4_5 creates and increments slot levels 4 і 5", () => {
    const p = createMockParticipant();

    applyOnePassiveStatEffect(
      p,
      { stat: "spell_slots_lvl4_5", type: "flat", value: 2, isPercentage: false },
      ARTIFACT_CTX,
    );

    expect(p.spellcasting.spellSlots["4"]).toEqual({ max: 2, current: 2 });
    expect(p.spellcasting.spellSlots["5"]).toEqual({ max: 2, current: 2 });

    // Повторне застосування інкрементує існуючі.
    applyOnePassiveStatEffect(
      p,
      { stat: "spell_slots_lvl4_5", type: "flat", value: 1, isPercentage: false },
      ARTIFACT_CTX,
    );

    expect(p.spellcasting.spellSlots["4"]).toEqual({ max: 3, current: 3 });
  });

  it("spell_targets_lvl4_5 inits to 1 and accumulates", () => {
    const p = createMockParticipant();

    applyOnePassiveStatEffect(
      p,
      { stat: "spell_targets_lvl4_5", type: "flat", value: 2, isPercentage: false },
      ARTIFACT_CTX,
    );

    expect(getParticipantExtras(p).spellTargetsLvl45).toBe(3);
  });
});

describe("applyOnePassiveStatEffect — damage stats and unknowns are no-ops", () => {
  it("damage stats do not mutate participant (handled elsewhere)", () => {
    const p = createMockParticipant();

    const snapshot = JSON.stringify(p);

    for (const stat of [
      "melee_damage",
      "ranged_damage",
      "spell_damage",
      "chaos_spell_damage",
      "physical_damage",
    ]) {
      applyOnePassiveStatEffect(
        p,
        { stat, type: "percent", value: 25, isPercentage: true },
        ARTIFACT_CTX,
      );
    }

    expect(JSON.stringify(p)).toBe(snapshot);
  });

  it("unknown stat falls into default (no mutation)", () => {
    const p = createMockParticipant();

    const snapshot = JSON.stringify(p);

    applyOnePassiveStatEffect(
      p,
      { stat: "totally_unknown", type: "flat", value: 99, isPercentage: false },
      ARTIFACT_CTX,
    );

    expect(JSON.stringify(p)).toBe(snapshot);
  });
});

function makePassiveSkill(
  skillId: string,
  effects: SkillEffect[],
  level: SkillLevel = SkillLevel.BASIC,
  mainSkillId = "ms-1",
): ActiveSkill {
  return {
    skillId,
    mainSkillId,
    name: skillId,
    level,
    effects,
    skillTriggers: [{ type: "simple", trigger: "passive" }],
  };
}

describe("applyPassiveSkillEffects — passive trigger filter + highest-rank resistance gating", () => {
  it("skips skills without trigger='passive'", () => {
    const p = createMockParticipant();

    p.battleData.activeSkills = [
      {
        skillId: "s-active",
        mainSkillId: "ms-1",
        name: "active only",
        level: SkillLevel.BASIC,
        effects: [{ stat: "hp_bonus", type: "flat", value: 99, isPercentage: false }],
        skillTriggers: [{ type: "simple", trigger: "onHit" }],
      },
    ];

    applyPassiveSkillEffects(p);

    expect(p.combatStats.maxHp).toBe(20);
  });

  it("applies hp_bonus from passive skill", () => {
    const p = createMockParticipant();

    p.battleData.activeSkills = [
      makePassiveSkill("s-1", [
        { stat: "hp_bonus", type: "flat", value: 7, isPercentage: false },
      ]),
    ];

    applyPassiveSkillEffects(p);

    expect(p.combatStats.maxHp).toBe(27);
  });

  it("only highest-level skill on a line contributes resistance", () => {
    const p = createMockParticipant();

    p.battleData.activeSkills = [
      makePassiveSkill(
        "s-basic",
        [{ stat: "physical_resistance", type: "flat", value: 10, isPercentage: false }],
        SkillLevel.BASIC,
        "ms-armor",
      ),
      makePassiveSkill(
        "s-expert",
        [{ stat: "physical_resistance", type: "flat", value: 30, isPercentage: false }],
        SkillLevel.EXPERT,
        "ms-armor",
      ),
    ];

    applyPassiveSkillEffects(p);

    // Лише expert (30) застосувався; basic (10) пропущено.
    expect(getParticipantResistances(p).physical).toBe(30);
  });

  it("different lines accumulate independently", () => {
    const p = createMockParticipant();

    p.battleData.activeSkills = [
      makePassiveSkill(
        "s-armor",
        [{ stat: "physical_resistance", type: "flat", value: 20, isPercentage: false }],
        SkillLevel.EXPERT,
        "ms-armor",
      ),
      makePassiveSkill(
        "s-magic",
        [{ stat: "spell_resistance", type: "flat", value: 25, isPercentage: false }],
        SkillLevel.EXPERT,
        "ms-magic",
      ),
    ];

    applyPassiveSkillEffects(p);

    const r = getParticipantResistances(p);

    expect(r.physical).toBe(20);
    expect(r.spell).toBe(25);
  });
});

describe("applyArtifactPassiveEffects — audience filter", () => {
  function makeArtifact(
    id: string,
    audience: string,
    effects: SkillEffect[],
  ): EquippedArtifact {
    return {
      id,
      slot: "ring",
      name: id,
      icon: null,
      effectAudience: audience,
      passiveAbility: { effects },
    } as unknown as EquippedArtifact;
  }

  it("skips artifacts with audience=all_allies", () => {
    const p = createMockParticipant();

    p.battleData.equippedArtifacts = [
      makeArtifact("art-allies", ARTIFACT_EFFECT_ALL_ALLIES, [
        { stat: "hp_bonus", type: "flat", value: 100, isPercentage: false },
      ]),
    ];

    applyArtifactPassiveEffects(p);

    expect(p.combatStats.maxHp).toBe(20);
  });

  it("skips artifacts with audience=all_enemies", () => {
    const p = createMockParticipant();

    p.battleData.equippedArtifacts = [
      makeArtifact("art-enemies", ARTIFACT_EFFECT_ALL_ENEMIES, [
        { stat: "spell_resistance", type: "flat", value: 50, isPercentage: false },
      ]),
    ];

    applyArtifactPassiveEffects(p);

    expect(getParticipantResistances(p).spell ?? 0).toBe(0);
  });

  it("applies effects from artifact with default (self) audience", () => {
    const p = createMockParticipant();

    p.battleData.equippedArtifacts = [
      makeArtifact("art-self", "", [
        { stat: "hp_bonus", type: "flat", value: 8, isPercentage: false },
      ]),
    ];

    applyArtifactPassiveEffects(p);

    expect(p.combatStats.maxHp).toBe(28);
  });

  it("ignores artifact with no passiveAbility.effects array", () => {
    const p = createMockParticipant();

    p.battleData.equippedArtifacts = [
      {
        id: "no-effects",
        slot: "ring",
        name: "blank",
        icon: null,
        effectAudience: "",
        passiveAbility: null,
      } as unknown as EquippedArtifact,
    ];

    applyArtifactPassiveEffects(p);

    expect(p.combatStats.maxHp).toBe(20);
  });
});
