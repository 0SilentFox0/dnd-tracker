/**
 * Тести для executeOnHitEffects (CODE_AUDIT 5.4) — фокус на
 * orchestration logic (фільтр trigger=onHit, modifiers gating,
 * usage-count increment, message-only ефекти).
 *
 * Складніші ефекти (DOT, melee/ranged damage, armor/speed buff) —
 * передаються в apply* хелпери. Цей файл їх не перевіряє у деталях
 * (тести для них пишуться разом з хелперами окремо), а лише
 * валідує, що orchestration не блокує їх викликом.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMockParticipant,
  createOnHitSkill,
  withActiveSkills,
} from "../../__tests__/skill-triggers-execution-mocks";
import { executeOnHitEffects } from "../on-hit";

import { SkillLevel } from "@/lib/types/skill-tree";
import type { ActiveSkill, BattleParticipant } from "@/types/battle";

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeTarget(): BattleParticipant {
  const t = createMockParticipant({
    basicInfo: { ...createMockParticipant().basicInfo, id: "t1", name: "Ціль" },
  });

  return t;
}

describe("executeOnHitEffects — early returns + filtering", () => {
  it("returns unchanged when attacker has no activeSkills", () => {
    const attacker = createMockParticipant();

    const target = makeTarget();

    const { updatedAttacker, updatedTarget, messages } = executeOnHitEffects(
      attacker,
      target,
      1,
    );

    expect(updatedAttacker).toEqual(attacker);
    expect(updatedTarget).toEqual(target);
    expect(messages).toEqual([]);
  });

  it("ignores skills without onHit trigger", () => {
    const attacker = withActiveSkills(createMockParticipant(), [
      {
        skillId: "passive-1",
        mainSkillId: "ms-1",
        name: "Passive only",
        level: SkillLevel.BASIC,
        effects: [
          { stat: "guaranteed_hit", type: "flat", value: 1, isPercentage: false },
        ],
        skillTriggers: [{ type: "simple", trigger: "passive" }],
      },
    ]);

    const { messages } = executeOnHitEffects(attacker, makeTarget(), 1);

    expect(messages).toEqual([]);
  });

  it("ignores onHit skill with no skillTriggers array", () => {
    const skill: ActiveSkill = {
      skillId: "no-triggers",
      mainSkillId: "ms-1",
      name: "no triggers",
      level: SkillLevel.BASIC,
      effects: [
        { stat: "guaranteed_hit", type: "flat", value: 1, isPercentage: false },
      ],
      // skillTriggers undefined
    };

    const attacker = withActiveSkills(createMockParticipant(), [skill]);

    const { messages } = executeOnHitEffects(attacker, makeTarget(), 1);

    expect(messages).toEqual([]);
  });
});

describe("executeOnHitEffects — modifier gating", () => {
  it("oncePerBattle blocks second use", () => {
    const skill = createOnHitSkill(
      "s-once",
      "Once per battle",
      [{ stat: "guaranteed_hit", type: "flat", value: 1, isPercentage: false }],
      { oncePerBattle: true },
    );

    const attacker = withActiveSkills(createMockParticipant(), [skill]);

    const usage: Record<string, number> = {};

    const r1 = executeOnHitEffects(attacker, makeTarget(), 1, usage);

    expect(r1.messages).toHaveLength(1);
    expect(usage["s-once"]).toBe(1);

    const r2 = executeOnHitEffects(attacker, makeTarget(), 1, usage);

    expect(r2.messages).toHaveLength(0);
    expect(usage["s-once"]).toBe(1);
  });

  it("twicePerBattle allows two uses then blocks", () => {
    const skill = createOnHitSkill(
      "s-twice",
      "Twice per battle",
      [{ stat: "guaranteed_hit", type: "flat", value: 1, isPercentage: false }],
      { twicePerBattle: true },
    );

    const attacker = withActiveSkills(createMockParticipant(), [skill]);

    const usage: Record<string, number> = {};

    expect(executeOnHitEffects(attacker, makeTarget(), 1, usage).messages).toHaveLength(1);
    expect(executeOnHitEffects(attacker, makeTarget(), 1, usage).messages).toHaveLength(1);
    expect(executeOnHitEffects(attacker, makeTarget(), 1, usage).messages).toHaveLength(0);
    expect(usage["s-twice"]).toBe(2);
  });

  it("probability gate uses Math.random() — fully blocked at probability=0", () => {
    const skill = createOnHitSkill(
      "s-prob",
      "Prob 0",
      [{ stat: "guaranteed_hit", type: "flat", value: 1, isPercentage: false }],
      { probability: 0 },
    );

    const attacker = withActiveSkills(createMockParticipant(), [skill]);

    // probability=0 ніколи не пройде (Math.random() >= 0 завжди true)
    const { messages } = executeOnHitEffects(attacker, makeTarget(), 1);

    expect(messages).toHaveLength(0);
  });

  it("probability gate fully passes at probability=1", () => {
    const skill = createOnHitSkill(
      "s-prob1",
      "Prob 1",
      [{ stat: "guaranteed_hit", type: "flat", value: 1, isPercentage: false }],
      { probability: 1 },
    );

    const attacker = withActiveSkills(createMockParticipant(), [skill]);

    // probability=1 завжди пройде (Math.random() < 1 завжди true)
    const { messages } = executeOnHitEffects(attacker, makeTarget(), 1);

    expect(messages).toHaveLength(1);
  });
});

describe("executeOnHitEffects — message-only effects", () => {
  it("guaranteed_hit emits 🎯 message", () => {
    const skill = createOnHitSkill("s-1", "Auto", [
      { stat: "guaranteed_hit", type: "flat", value: 1, isPercentage: false },
    ]);

    const attacker = withActiveSkills(createMockParticipant(), [skill]);

    const { messages } = executeOnHitEffects(attacker, makeTarget(), 1);

    expect(messages[0]).toContain("автовлучання");
  });

  it("damage type='stack' emits ×N message", () => {
    const skill = createOnHitSkill("s-2", "Stack", [
      { stat: "damage", type: "stack", value: 3, isPercentage: false },
    ]);

    const attacker = withActiveSkills(createMockParticipant(), [skill]);

    const { messages } = executeOnHitEffects(attacker, makeTarget(), 1);

    expect(messages[0]).toContain("×3");
  });

  it("damage type other than 'stack' produces no message", () => {
    const skill = createOnHitSkill("s-3", "Flat dmg", [
      { stat: "damage", type: "flat", value: 5, isPercentage: false },
    ]);

    const attacker = withActiveSkills(createMockParticipant(), [skill]);

    const { messages } = executeOnHitEffects(attacker, makeTarget(), 1);

    expect(messages).toEqual([]);
  });

  it("damage_resistance type='ignore' emits message; інший type — мовчить", () => {
    const ignoreSkill = createOnHitSkill("s-4", "Ignore resist", [
      { stat: "damage_resistance", type: "ignore", value: 1, isPercentage: false },
    ]);

    const flatSkill = createOnHitSkill("s-5", "Flat resist", [
      { stat: "damage_resistance", type: "flat", value: 5, isPercentage: false },
    ]);

    const a1 = withActiveSkills(createMockParticipant(), [ignoreSkill]);

    const a2 = withActiveSkills(createMockParticipant(), [flatSkill]);

    expect(executeOnHitEffects(a1, makeTarget(), 1).messages[0]).toContain(
      "ігнорує резист",
    );
    expect(executeOnHitEffects(a2, makeTarget(), 1).messages).toEqual([]);
  });

  it("area_damage emits 💨 with value (з %)", () => {
    const skill = createOnHitSkill("s-6", "Area %", [
      { stat: "area_damage", type: "percent", value: 25, isPercentage: true },
    ]);

    const attacker = withActiveSkills(createMockParticipant(), [skill]);

    const { messages } = executeOnHitEffects(attacker, makeTarget(), 1);

    expect(messages[0]).toContain("area 25%");
  });

  it("area_cells emits зона message", () => {
    const skill = createOnHitSkill("s-7", "Area zone", [
      { stat: "area_cells", type: "flat", value: 3, isPercentage: false },
    ]);

    const attacker = withActiveSkills(createMockParticipant(), [skill]);

    const { messages } = executeOnHitEffects(attacker, makeTarget(), 1);

    expect(messages[0]).toContain("3 клітинок");
  });

  it("default (unknown stat) is no-op", () => {
    const skill = createOnHitSkill("s-8", "Unknown", [
      { stat: "totally_made_up", type: "flat", value: 1, isPercentage: false },
    ]);

    const attacker = withActiveSkills(createMockParticipant(), [skill]);

    const { messages } = executeOnHitEffects(attacker, makeTarget(), 1);

    expect(messages).toEqual([]);
  });
});

describe("executeOnHitEffects — attackId filter", () => {
  it("skips skill when modifier.attackId не співпадає ні з id ні з name", () => {
    const skill: ActiveSkill = {
      skillId: "s-attack-id",
      mainSkillId: "ms-1",
      name: "Bound to weapon",
      level: SkillLevel.BASIC,
      effects: [
        { stat: "guaranteed_hit", type: "flat", value: 1, isPercentage: false },
      ],
      skillTriggers: [
        {
          type: "simple",
          trigger: "onHit",
          modifiers: { attackId: "specific-bow-id" },
        },
      ],
    };

    const attacker = withActiveSkills(createMockParticipant(), [skill]);

    const r1 = executeOnHitEffects(
      attacker,
      makeTarget(),
      1,
      undefined,
      undefined,
      undefined,
      "different-attack-id",
      "Sword Strike",
    );

    expect(r1.messages).toEqual([]);
  });

  it("dispatches when modifier.attackId matches currentAttackId", () => {
    const skill: ActiveSkill = {
      skillId: "s-bound",
      mainSkillId: "ms-1",
      name: "Bound",
      level: SkillLevel.BASIC,
      effects: [
        { stat: "guaranteed_hit", type: "flat", value: 1, isPercentage: false },
      ],
      skillTriggers: [
        {
          type: "simple",
          trigger: "onHit",
          modifiers: { attackId: "bow-1" },
        },
      ],
    };

    const attacker = withActiveSkills(createMockParticipant(), [skill]);

    const r = executeOnHitEffects(
      attacker,
      makeTarget(),
      1,
      undefined,
      undefined,
      undefined,
      "bow-1",
      "Bow",
    );

    expect(r.messages).toHaveLength(1);
  });

  it("dispatches when modifier.attackId matches currentAttackName (legacy)", () => {
    const skill: ActiveSkill = {
      skillId: "s-bound2",
      mainSkillId: "ms-1",
      name: "Bound",
      level: SkillLevel.BASIC,
      effects: [
        { stat: "guaranteed_hit", type: "flat", value: 1, isPercentage: false },
      ],
      skillTriggers: [
        {
          type: "simple",
          trigger: "onHit",
          modifiers: { attackId: "Crossbow" },
        },
      ],
    };

    const attacker = withActiveSkills(createMockParticipant(), [skill]);

    const r = executeOnHitEffects(
      attacker,
      makeTarget(),
      1,
      undefined,
      undefined,
      undefined,
      "x",
      "Crossbow",
    );

    expect(r.messages).toHaveLength(1);
  });
});

describe("executeOnHitEffects — multiple skills + multiple effects", () => {
  it("processes all matching onHit skills in sequence", () => {
    const a = createOnHitSkill("a", "A", [
      { stat: "guaranteed_hit", type: "flat", value: 1, isPercentage: false },
    ]);

    const b = createOnHitSkill("b", "B", [
      { stat: "area_cells", type: "flat", value: 2, isPercentage: false },
    ]);

    const attacker = withActiveSkills(createMockParticipant(), [a, b]);

    const { messages } = executeOnHitEffects(attacker, makeTarget(), 1);

    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain("автовлучання");
    expect(messages[1]).toContain("клітинок");
  });

  it("returns updatedParticipants when allParticipants passed", () => {
    const attacker = createMockParticipant();

    const target = makeTarget();

    const bystander = createMockParticipant({
      basicInfo: { ...createMockParticipant().basicInfo, id: "by", name: "Bystander" },
    });

    const r = executeOnHitEffects(
      attacker,
      target,
      1,
      undefined,
      undefined,
      [attacker, target, bystander],
    );

    expect(r.updatedParticipants).toBeDefined();
    expect(r.updatedParticipants?.map((p) => p.basicInfo.id).sort()).toEqual([
      "by",
      "p1",
      "t1",
    ]);
  });
});
