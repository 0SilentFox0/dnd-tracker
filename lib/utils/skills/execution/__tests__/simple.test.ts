/**
 * Тести для simple.ts (CODE_AUDIT 5.3) — orchestration функцій,
 * які диспетчать prості тригери (startRound, before/after attack,
 * before/after spellCast) через executeSkillsByTrigger та
 * checkSurviveLethal.
 *
 * Фокус: trigger filter (відповідний trigger type), early returns,
 * isOwnerAction → правильний triggerType, complex-trigger
 * re-evaluation на changed participant, survive_lethal flow.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMockParticipant,
  withActiveSkills,
} from "../../__tests__/skill-triggers-execution-mocks";
import {
  checkSurviveLethal,
  executeAfterAttackTriggers,
  executeAfterSpellCastTriggers,
  executeBeforeAttackTriggers,
  executeBeforeSpellCastTriggers,
  executeComplexTriggersForChangedParticipant,
  executeSkillsByTrigger,
  executeStartOfRoundTriggers,
} from "../simple";

import { ParticipantSide } from "@/lib/constants/battle";
import { SkillLevel } from "@/lib/types/skill-tree";
import type { ActiveSkill, SkillEffect } from "@/types/battle";

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeSimpleSkill(
  skillId: string,
  trigger: string,
  effects: SkillEffect[] = [],
): ActiveSkill {
  return {
    skillId,
    mainSkillId: "ms-1",
    name: skillId,
    level: SkillLevel.BASIC,
    effects,
    skillTriggers: [
      {
        type: "simple",
        // @ts-expect-error — trigger union allows строкові enum-значення
        trigger,
      },
    ],
  };
}

describe("executeSkillsByTrigger", () => {
  it("returns unchanged when no activeSkills", () => {
    const p = createMockParticipant();

    const result = executeSkillsByTrigger(p, "startRound", [p], { currentRound: 1 });

    expect(result.executedSkills).toEqual([]);
    expect(result.messages).toEqual([]);
    expect(result.participant).toEqual(p);
  });

  it("only executes skills with matching trigger type", () => {
    const p = withActiveSkills(createMockParticipant(), [
      makeSimpleSkill("s-start", "startRound", [
        { stat: "guaranteed_hit", type: "flat", value: 1, isPercentage: false },
      ]),
      makeSimpleSkill("s-end", "endRound", [
        { stat: "guaranteed_hit", type: "flat", value: 1, isPercentage: false },
      ]),
    ]);

    const result = executeSkillsByTrigger(p, "startRound", [p], { currentRound: 1 });

    expect(result.executedSkills.map((s) => s.skillId)).toEqual(["s-start"]);
  });

  it("collects messages from all matching skills", () => {
    const p = withActiveSkills(createMockParticipant(), [
      makeSimpleSkill("s1", "startRound", [
        { stat: "hp_bonus", type: "flat", value: 5, isPercentage: false },
      ]),
      makeSimpleSkill("s2", "startRound", [
        { stat: "hp_bonus", type: "flat", value: 3, isPercentage: false },
      ]),
    ]);

    const result = executeSkillsByTrigger(p, "startRound", [p], { currentRound: 1 });

    expect(result.executedSkills).toHaveLength(2);
    expect(result.messages.length).toBeGreaterThanOrEqual(2);
  });

  it("propagates updatedParticipant through cascade of effects", () => {
    const p = withActiveSkills(createMockParticipant(), [
      makeSimpleSkill("s1", "startRound", [
        { stat: "hp_bonus", type: "flat", value: 4, isPercentage: false },
      ]),
    ]);

    const result = executeSkillsByTrigger(p, "startRound", [p], { currentRound: 1 });

    // активний ефект застосовано до learnedEffects
    expect(result.participant.battleData.activeEffects).toHaveLength(1);
  });
});

describe("executeBeforeAttackTriggers / executeAfterAttackTriggers", () => {
  const target = createMockParticipant({
    basicInfo: {
      ...createMockParticipant().basicInfo,
      id: "t1",
      name: "Ціль",
      side: ParticipantSide.ENEMY,
    },
  });

  it("uses 'beforeOwnerAttack' when isOwnerAction=true", () => {
    const attacker = withActiveSkills(createMockParticipant(), [
      makeSimpleSkill("s-owner", "beforeOwnerAttack", [
        { stat: "guaranteed_hit", type: "flat", value: 1, isPercentage: false },
      ]),
      makeSimpleSkill("s-enemy", "beforeEnemyAttack", [
        { stat: "guaranteed_hit", type: "flat", value: 1, isPercentage: false },
      ]),
    ]);

    const r = executeBeforeAttackTriggers(attacker, target, [attacker, target], true);

    expect(r.messages.length).toBe(0); // guaranteed_hit не генерує message
    expect(r.updatedAttacker.basicInfo.id).toBe(attacker.basicInfo.id);
  });

  it("uses 'beforeEnemyAttack' when isOwnerAction=false", () => {
    const attacker = withActiveSkills(createMockParticipant(), [
      makeSimpleSkill("s-enemy", "beforeEnemyAttack", [
        { stat: "hp_bonus", type: "flat", value: 5, isPercentage: false },
      ]),
    ]);

    const r = executeBeforeAttackTriggers(attacker, target, [attacker, target], false);

    expect(r.messages.length).toBeGreaterThan(0);
  });

  it("after-attack uses 'afterOwnerAttack' / 'afterEnemyAttack' parallel", () => {
    const attacker = withActiveSkills(createMockParticipant(), [
      makeSimpleSkill("s-after-owner", "afterOwnerAttack", [
        { stat: "hp_bonus", type: "flat", value: 2, isPercentage: false },
      ]),
    ]);

    const r1 = executeAfterAttackTriggers(attacker, target, [attacker, target], true);

    expect(r1.messages.length).toBeGreaterThan(0);

    const r2 = executeAfterAttackTriggers(attacker, target, [attacker, target], false);

    expect(r2.messages.length).toBe(0);
  });
});

describe("executeBeforeSpellCastTriggers / executeAfterSpellCastTriggers", () => {
  it("dispatches beforeOwnerSpellCast vs beforeEnemySpellCast by isOwnerAction", () => {
    const caster = withActiveSkills(createMockParticipant(), [
      makeSimpleSkill("s-owner-cast", "beforeOwnerSpellCast", [
        { stat: "hp_bonus", type: "flat", value: 1, isPercentage: false },
      ]),
    ]);

    const r1 = executeBeforeSpellCastTriggers(caster, undefined, [caster], true);

    expect(r1.messages.length).toBe(1);

    const r2 = executeBeforeSpellCastTriggers(caster, undefined, [caster], false);

    expect(r2.messages.length).toBe(0);
  });

  it("after-spell-cast pair", () => {
    const caster = withActiveSkills(createMockParticipant(), [
      makeSimpleSkill("s-after-enemy-cast", "afterEnemySpellCast", [
        { stat: "hp_bonus", type: "flat", value: 1, isPercentage: false },
      ]),
    ]);

    const r1 = executeAfterSpellCastTriggers(caster, undefined, [caster], false);

    expect(r1.messages.length).toBe(1);

    const r2 = executeAfterSpellCastTriggers(caster, undefined, [caster], true);

    expect(r2.messages.length).toBe(0);
  });
});

describe("executeStartOfRoundTriggers — broadcast across all participants", () => {
  it("dispatches startRound trigger to each participant", () => {
    const p1 = withActiveSkills(createMockParticipant(), [
      makeSimpleSkill("s1", "startRound", [
        { stat: "hp_bonus", type: "flat", value: 1, isPercentage: false },
      ]),
    ]);

    const p2 = withActiveSkills(
      createMockParticipant({
        basicInfo: { ...createMockParticipant().basicInfo, id: "p2" },
      }),
      [
        makeSimpleSkill("s2", "startRound", [
          { stat: "hp_bonus", type: "flat", value: 2, isPercentage: false },
        ]),
      ],
    );

    const r = executeStartOfRoundTriggers([p1, p2], 3);

    expect(r.updatedParticipants).toHaveLength(2);
    expect(r.messages.length).toBe(2);
  });

  it("does not change participants without startRound triggers", () => {
    const p = createMockParticipant();

    const r = executeStartOfRoundTriggers([p], 1);

    expect(r.updatedParticipants[0]).toEqual(p);
    expect(r.messages).toEqual([]);
  });
});

describe("executeComplexTriggersForChangedParticipant", () => {
  it("returns unchanged когда changedParticipantId не існує", () => {
    const p = createMockParticipant();

    const r = executeComplexTriggersForChangedParticipant([p], "nope", 1);

    expect(r.updatedParticipants).toEqual([p]);
    expect(r.messages).toEqual([]);
  });

  it("executes complex skill when condition matches changed participant state", () => {
    const watcher = withActiveSkills(createMockParticipant(), [
      {
        skillId: "low-hp-watch",
        mainSkillId: "ms-1",
        name: "Low HP Watch",
        level: SkillLevel.BASIC,
        effects: [
          { stat: "hp_bonus", type: "flat", value: 5, isPercentage: false },
        ],
        skillTriggers: [
          {
            type: "complex",
            target: "ally",
            stat: "HP",
            operator: "<",
            valueType: "percent",
            value: 50,
          },
        ],
      },
    ]);

    const ally = createMockParticipant({
      basicInfo: { ...createMockParticipant().basicInfo, id: "ally1" },
      combatStats: {
        ...createMockParticipant().combatStats,
        currentHp: 5, // 25% < 50%
      },
    });

    const r = executeComplexTriggersForChangedParticipant(
      [watcher, ally],
      "ally1",
      1,
    );

    expect(r.messages.length).toBeGreaterThan(0);
  });

  it("skips skills with no skillTriggers", () => {
    const p = withActiveSkills(createMockParticipant(), [
      {
        skillId: "no-triggers",
        mainSkillId: "ms-1",
        name: "no triggers",
        level: SkillLevel.BASIC,
        effects: [],
        // skillTriggers undefined
      },
    ]);

    const r = executeComplexTriggersForChangedParticipant([p], p.basicInfo.id, 1);

    expect(r.messages).toEqual([]);
  });
});

describe("checkSurviveLethal", () => {
  function makeSurviveLethalSkill(
    skillId: string,
    oncePerBattle = false,
  ): ActiveSkill {
    return {
      skillId,
      mainSkillId: "ms-1",
      name: skillId,
      level: SkillLevel.BASIC,
      effects: [
        { stat: "survive_lethal", type: "flat", value: 1, isPercentage: false },
      ],
      skillTriggers: [
        {
          type: "simple",
          trigger: "onLethalDamage",
          ...(oncePerBattle && { modifiers: { oncePerBattle: true } }),
        },
      ],
    };
  }

  it("returns survived=true with message коли є survive_lethal effect", () => {
    const p = withActiveSkills(createMockParticipant(), [
      makeSurviveLethalSkill("s-survive"),
    ]);

    const r = checkSurviveLethal(p);

    expect(r.survived).toBe(true);
    expect(r.message).toContain("вижив з 1 HP");
  });

  it("returns survived=false коли нема onLethalDamage trigger", () => {
    const p = withActiveSkills(createMockParticipant(), [
      {
        skillId: "wrong-trigger",
        mainSkillId: "ms-1",
        name: "wrong",
        level: SkillLevel.BASIC,
        effects: [
          { stat: "survive_lethal", type: "flat", value: 1, isPercentage: false },
        ],
        skillTriggers: [{ type: "simple", trigger: "onHit" }],
      },
    ]);

    const r = checkSurviveLethal(p);

    expect(r.survived).toBe(false);
    expect(r.message).toBeNull();
  });

  it("returns false коли trigger є, але немає survive_lethal effect", () => {
    const p = withActiveSkills(createMockParticipant(), [
      {
        skillId: "trigger-no-effect",
        mainSkillId: "ms-1",
        name: "wrong",
        level: SkillLevel.BASIC,
        effects: [
          { stat: "guaranteed_hit", type: "flat", value: 1, isPercentage: false },
        ],
        skillTriggers: [{ type: "simple", trigger: "onLethalDamage" }],
      },
    ]);

    expect(checkSurviveLethal(p).survived).toBe(false);
  });

  it("oncePerBattle: increments counter і блокує другий виклик", () => {
    const p = withActiveSkills(createMockParticipant(), [
      makeSurviveLethalSkill("s-once", true),
    ]);

    const usage: Record<string, number> = {};

    expect(checkSurviveLethal(p, usage).survived).toBe(true);
    expect(usage["s-once"]).toBe(1);

    expect(checkSurviveLethal(p, usage).survived).toBe(false);
    expect(usage["s-once"]).toBe(1);
  });
});
