/**
 * Тести для battle-start.ts (CODE_AUDIT 5.2):
 *  - executeOnBattleStartEffects: per-participant, target=self/all_allies/all
 *  - executeOnBattleStartEffectsForAll: broadcast по initiativeOrder з
 *    auto-default target='all_allies' для buff stats
 *  - applyOnBattleStartEffectsToNewAllies: при додаванні нових учасників
 *    застосувати existing all_allies onBattleStart-ефекти від союзників
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMockParticipant,
  withActiveSkills,
} from "../../__tests__/skill-triggers-execution-mocks";
import {
  applyOnBattleStartEffectsToNewAllies,
  executeOnBattleStartEffects,
  executeOnBattleStartEffectsForAll,
} from "../battle-start";

import { ParticipantSide } from "@/lib/constants/battle";
import { SkillLevel } from "@/lib/types/skill-tree";
import type { ActiveSkill, SkillEffect } from "@/types/battle";

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeOnBattleStartSkill(
  skillId: string,
  effects: SkillEffect[],
): ActiveSkill {
  return {
    skillId,
    mainSkillId: "ms-1",
    name: skillId,
    level: SkillLevel.BASIC,
    effects,
    skillTriggers: [{ type: "simple", trigger: "onBattleStart" }],
  };
}

function makeAlly(id: string): ReturnType<typeof createMockParticipant> {
  return createMockParticipant({
    basicInfo: {
      ...createMockParticipant().basicInfo,
      id,
      name: id,
      side: ParticipantSide.ALLY,
    },
  });
}

function makeEnemy(id: string): ReturnType<typeof createMockParticipant> {
  return createMockParticipant({
    basicInfo: {
      ...createMockParticipant().basicInfo,
      id,
      name: id,
      side: ParticipantSide.ENEMY,
    },
  });
}

describe("executeOnBattleStartEffects — per participant", () => {
  it("returns unchanged когда нема onBattleStart skills", () => {
    const p = withActiveSkills(makeAlly("p1"), [
      {
        skillId: "passive",
        mainSkillId: "ms-1",
        name: "passive",
        level: SkillLevel.BASIC,
        effects: [
          { stat: "initiative", type: "flat", value: 5, isPercentage: false },
        ],
        skillTriggers: [{ type: "simple", trigger: "passive" }],
      },
    ]);

    const r = executeOnBattleStartEffects(p, 1);

    expect(r.messages).toEqual([]);
    expect(r.updatedParticipant.battleData.activeEffects).toEqual([]);
  });

  it("applies initiative buff для target='self' (default)", () => {
    const p = withActiveSkills(makeAlly("p1"), [
      makeOnBattleStartSkill("init-self", [
        { stat: "initiative", type: "flat", value: 3, isPercentage: false },
      ]),
    ]);

    const r = executeOnBattleStartEffects(p, 1);

    expect(r.updatedParticipant.battleData.activeEffects).toHaveLength(1);
    expect(r.updatedParticipant.battleData.activeEffects[0]).toMatchObject({
      type: "buff",
      duration: 999,
      effects: [{ type: "initiative_bonus", value: 3 }],
    });
    expect(r.messages[0]).toContain("ініціатива");
  });

  it("applies damage bonus для target='all_allies'", () => {
    const ally1 = withActiveSkills(makeAlly("a1"), [
      makeOnBattleStartSkill("dmg-allies", [
        {
          stat: "damage",
          type: "flat",
          value: 5,
          isPercentage: false,
          target: "all_allies",
        },
      ]),
    ]);

    const ally2 = makeAlly("a2");

    const enemy = makeEnemy("e1");

    const r = executeOnBattleStartEffects(ally1, 1, [ally1, ally2, enemy]);

    expect(r.messages[0]).toContain("a1, a2"); // обидва союзники у списку
    expect(r.messages[0]).toContain("+5 урону");
  });

  it("advantage додає effect з duration=1", () => {
    const p = withActiveSkills(makeAlly("p1"), [
      makeOnBattleStartSkill("adv", [
        { stat: "advantage", type: "flat", value: 1, isPercentage: false },
      ]),
    ]);

    const r = executeOnBattleStartEffects(p, 1);

    expect(r.updatedParticipant.battleData.activeEffects[0]).toMatchObject({
      duration: 1,
      effects: [{ type: "advantage_attack", value: 1 }],
    });
  });

  it("default branch — unknown stat не виконує нічого", () => {
    const p = withActiveSkills(makeAlly("p1"), [
      makeOnBattleStartSkill("unknown", [
        { stat: "totally_made_up", type: "flat", value: 5, isPercentage: false },
      ]),
    ]);

    const r = executeOnBattleStartEffects(p, 1);

    expect(r.messages).toEqual([]);
    expect(r.updatedParticipant.battleData.activeEffects).toEqual([]);
  });
});

describe("executeOnBattleStartEffectsForAll — broadcast з auto-default target", () => {
  it("auto-defaults target='all_allies' для buff stats коли target undefined", () => {
    const ally1 = withActiveSkills(makeAlly("a1"), [
      makeOnBattleStartSkill("dmg-no-target", [
        { stat: "damage", type: "flat", value: 3, isPercentage: false },
      ]),
    ]);

    const ally2 = makeAlly("a2");

    const r = executeOnBattleStartEffectsForAll([ally1, ally2], 1);

    // ally1 і ally2 обидва отримали damage buff (target auto-defaulted на all_allies)
    expect(
      r.updatedParticipants.find((p) => p.basicInfo.id === "a1")?.battleData
        .activeEffects,
    ).toHaveLength(1);
    expect(
      r.updatedParticipants.find((p) => p.basicInfo.id === "a2")?.battleData
        .activeEffects,
    ).toHaveLength(1);
  });

  it("melee_damage використовує custom duration зі ефекту", () => {
    const ally = withActiveSkills(makeAlly("a1"), [
      makeOnBattleStartSkill("melee-3r", [
        {
          stat: "melee_damage",
          type: "flat",
          value: 4,
          isPercentage: false,
          duration: 3,
          target: "self",
        },
      ]),
    ]);

    const r = executeOnBattleStartEffectsForAll([ally], 1);

    expect(
      r.updatedParticipants[0].battleData.activeEffects[0].duration,
    ).toBe(3);
  });

  it("melee_damage default duration = 2 коли effect.duration unset", () => {
    const ally = withActiveSkills(makeAlly("a1"), [
      makeOnBattleStartSkill("melee", [
        {
          stat: "melee_damage",
          type: "flat",
          value: 3,
          isPercentage: false,
          target: "self",
        },
      ]),
    ]);

    const r = executeOnBattleStartEffectsForAll([ally], 1);

    expect(
      r.updatedParticipants[0].battleData.activeEffects[0].duration,
    ).toBe(2);
  });

  it("all_damage стає effect type='all_damage'", () => {
    const ally = withActiveSkills(makeAlly("a1"), [
      makeOnBattleStartSkill("all-dmg", [
        {
          stat: "all_damage",
          type: "flat",
          value: 5,
          isPercentage: false,
          target: "self",
        },
      ]),
    ]);

    const r = executeOnBattleStartEffectsForAll([ally], 1);

    expect(
      r.updatedParticipants[0].battleData.activeEffects[0].effects[0],
    ).toMatchObject({ type: "all_damage", value: 5 });
  });

  it("formula evaluates per target (hero_level + const)", () => {
    const a = withActiveSkills(
      createMockParticipant({
        basicInfo: { ...makeAlly("a1").basicInfo },
        abilities: { ...makeAlly("a1").abilities, level: 5 },
      }),
      [
        makeOnBattleStartSkill("dmg-formula", [
          {
            stat: "melee_damage",
            type: "formula",
            value: "hero_level + 2",
            isPercentage: false,
            target: "self",
          },
        ]),
      ],
    );

    const r = executeOnBattleStartEffectsForAll([a], 1);

    // formula: hero_level (5) + 2 = 7
    expect(
      r.updatedParticipants[0].battleData.activeEffects[0].effects[0].value,
    ).toBe(7);
  });
});

describe("applyOnBattleStartEffectsToNewAllies", () => {
  it("noop коли newParticipantIds пустий", () => {
    const a1 = makeAlly("a1");

    const result = applyOnBattleStartEffectsToNewAllies([a1], new Set(), 1);

    expect(result).toEqual([a1]);
  });

  it("застосовує all_allies onBattleStart від ally до нового учасника", () => {
    const existingAlly = withActiveSkills(makeAlly("a1"), [
      makeOnBattleStartSkill("buff", [
        {
          stat: "damage",
          type: "flat",
          value: 5,
          isPercentage: false,
          target: "all_allies",
        },
      ]),
    ]);

    const newAlly = makeAlly("new1");

    const r = applyOnBattleStartEffectsToNewAllies(
      [existingAlly, newAlly],
      new Set(["new1"]),
      1,
    );

    const newAllyAfter = r.find((p) => p.basicInfo.id === "new1");

    expect(newAllyAfter).toBeDefined();
    expect(newAllyAfter?.battleData.activeEffects).toHaveLength(1);
    expect(newAllyAfter?.battleData.activeEffects[0].effects[0]).toMatchObject({
      type: "damage_bonus",
      value: 5,
    });
  });

  it("не застосовує ефекти від ворогів (різний side)", () => {
    const enemyWithBuff = withActiveSkills(makeEnemy("e1"), [
      makeOnBattleStartSkill("enemy-buff", [
        {
          stat: "damage",
          type: "flat",
          value: 5,
          isPercentage: false,
          target: "all_allies",
        },
      ]),
    ]);

    const newAlly = makeAlly("new1");

    const r = applyOnBattleStartEffectsToNewAllies(
      [enemyWithBuff, newAlly],
      new Set(["new1"]),
      1,
    );

    expect(
      r.find((p) => p.basicInfo.id === "new1")?.battleData.activeEffects,
    ).toEqual([]);
  });

  it("пропускає ефекти з target ≠ 'all_allies'", () => {
    const existingAlly = withActiveSkills(makeAlly("a1"), [
      makeOnBattleStartSkill("self-only", [
        {
          stat: "initiative",
          type: "flat",
          value: 3,
          isPercentage: false,
          target: "self",
        },
      ]),
    ]);

    const newAlly = makeAlly("new1");

    const r = applyOnBattleStartEffectsToNewAllies(
      [existingAlly, newAlly],
      new Set(["new1"]),
      1,
    );

    expect(
      r.find((p) => p.basicInfo.id === "new1")?.battleData.activeEffects,
    ).toEqual([]);
  });

  it("підтримує initiative / damage / advantage; default — no-op", () => {
    const ally = withActiveSkills(makeAlly("a1"), [
      makeOnBattleStartSkill("buffs", [
        { stat: "initiative", type: "flat", value: 2, isPercentage: false, target: "all_allies" },
        { stat: "damage", type: "flat", value: 3, isPercentage: false, target: "all_allies" },
        { stat: "advantage", type: "flat", value: 1, isPercentage: false, target: "all_allies" },
        { stat: "unknown_stat", type: "flat", value: 99, isPercentage: false, target: "all_allies" },
      ]),
    ]);

    const newAlly = makeAlly("new1");

    const r = applyOnBattleStartEffectsToNewAllies(
      [ally, newAlly],
      new Set(["new1"]),
      1,
    );

    const after = r.find((p) => p.basicInfo.id === "new1");

    // 3 known stats застосовано, unknown пропущено
    expect(after?.battleData.activeEffects).toHaveLength(3);
  });
});
