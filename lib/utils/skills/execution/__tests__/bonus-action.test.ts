/**
 * Тести для executeBonusActionSkill (CODE_AUDIT 5.1).
 *
 * 462-рядкова функція з 14 case-effects та modifier gating.
 * Покриваємо:
 *  - early return: skill без bonusAction trigger
 *  - modifier gating: oncePerBattle / twicePerBattle / probability
 *  - skill usage counter increment
 *  - hasUsedBonusAction action flag mutation
 *  - кожен effect.stat case (15+) з акцентом на унікальні side-effects:
 *    - extra_casts: скидає hasUsedAction
 *    - morale: clamp ≤3
 *    - morale_restore: clamp ≥-3
 *    - revive_hp: тільки коли target.status === "dead"
 *    - clear_negative_effects: filter type === "debuff"
 *    - field_damage: DOT debuff на всіх ворогів зі status='active'
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMockParticipant } from "../../__tests__/skill-triggers-execution-mocks";
import { executeBonusActionSkill } from "../bonus-action";

import { ParticipantSide } from "@/lib/constants/battle";
import { SkillLevel } from "@/lib/types/skill-tree";
import type {
  ActiveSkill,
  BattleParticipant,
  SkillEffect,
} from "@/types/battle";

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeBonusActionSkill(
  skillId: string,
  effects: SkillEffect[],
  modifiers?: {
    oncePerBattle?: boolean;
    twicePerBattle?: boolean;
    probability?: number;
  },
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
        trigger: "bonusAction",
        ...(modifiers && { modifiers }),
      },
    ],
  };
}

function makeAlly(id: string): BattleParticipant {
  return createMockParticipant({
    basicInfo: {
      ...createMockParticipant().basicInfo,
      id,
      name: id,
      side: ParticipantSide.ALLY,
    },
  });
}

function makeEnemy(id: string): BattleParticipant {
  return createMockParticipant({
    basicInfo: {
      ...createMockParticipant().basicInfo,
      id,
      name: id,
      side: ParticipantSide.ENEMY,
    },
  });
}

describe("executeBonusActionSkill — early returns", () => {
  it("skips when skill has no bonusAction trigger", () => {
    const p = makeAlly("p1");

    const skill: ActiveSkill = {
      skillId: "no-trigger",
      mainSkillId: "ms-1",
      name: "no",
      level: SkillLevel.BASIC,
      effects: [{ stat: "morale", type: "flat", value: 1, isPercentage: false }],
      skillTriggers: [{ type: "simple", trigger: "passive" }],
    };

    const r = executeBonusActionSkill(p, skill, [p], 1);

    expect(r.messages).toEqual([]);
    expect(r.updatedParticipant).toEqual(p);
  });
});

describe("executeBonusActionSkill — modifier gating", () => {
  it("oncePerBattle: блокує і додає warning message", () => {
    const skill = makeBonusActionSkill(
      "s-once",
      [{ stat: "morale", type: "flat", value: 1, isPercentage: false }],
      { oncePerBattle: true },
    );

    const p = makeAlly("p1");

    const usage: Record<string, number> = { "s-once": 1 };

    const r = executeBonusActionSkill(p, skill, [p], 1, undefined, usage);

    expect(r.messages[0]).toContain("вже використано");
    // hasUsedBonusAction НЕ виставляється бо early return
    expect(r.updatedParticipant.actionFlags.hasUsedBonusAction).toBe(false);
  });

  it("twicePerBattle: блокує на 3-му виклику", () => {
    const skill = makeBonusActionSkill(
      "s-twice",
      [{ stat: "morale", type: "flat", value: 1, isPercentage: false }],
      { twicePerBattle: true },
    );

    const p = makeAlly("p1");

    const usage: Record<string, number> = { "s-twice": 2 };

    const r = executeBonusActionSkill(p, skill, [p], 1, undefined, usage);

    expect(r.messages[0]).toContain("вже використано двічі");
  });

  it("probability=0 — завжди fail з message", () => {
    const skill = makeBonusActionSkill(
      "s-prob",
      [{ stat: "morale", type: "flat", value: 1, isPercentage: false }],
      { probability: 0 },
    );

    const p = makeAlly("p1");

    const r = executeBonusActionSkill(p, skill, [p], 1);

    expect(r.messages[0]).toContain("не спрацювало");
    expect(r.messages[0]).toContain("0%");
  });

  it("probability=1 — завжди пропускає", () => {
    const skill = makeBonusActionSkill(
      "s-prob1",
      [{ stat: "morale", type: "flat", value: 1, isPercentage: false }],
      { probability: 1 },
    );

    const p = makeAlly("p1");

    const r = executeBonusActionSkill(p, skill, [p], 1);

    // не має 'не спрацювало', має фактичний effect message
    expect(r.messages.find((m) => m.includes("не спрацювало"))).toBeUndefined();
  });

  it("успішний виклик: increments usage counter і ставить hasUsedBonusAction", () => {
    const skill = makeBonusActionSkill("s", [
      { stat: "morale", type: "flat", value: 1, isPercentage: false },
    ]);

    const p = makeAlly("p1");

    const usage: Record<string, number> = {};

    const r = executeBonusActionSkill(p, skill, [p], 1, undefined, usage);

    expect(usage["s"]).toBe(1);
    expect(r.updatedParticipant.actionFlags.hasUsedBonusAction).toBe(true);
  });
});

describe("executeBonusActionSkill — message-only effects", () => {
  it("redirect_physical_damage emits message only коли є targetParticipantId", () => {
    const skill = makeBonusActionSkill("redir", [
      { stat: "redirect_physical_damage", type: "flat", value: 50, isPercentage: false },
    ]);

    const p = makeAlly("p1");

    const ally = makeAlly("p2");

    const r1 = executeBonusActionSkill(p, skill, [p, ally], 1, "p2");

    expect(r1.messages[0]).toContain("перенаправляє 50%");

    const r2 = executeBonusActionSkill(p, skill, [p, ally], 1);

    expect(r2.messages.find((m) => m.includes("перенаправляє"))).toBeUndefined();
  });

  it("summon_tier emits message", () => {
    const skill = makeBonusActionSkill("summon", [
      { stat: "summon_tier", type: "flat", value: 3, isPercentage: false },
    ]);

    const r = executeBonusActionSkill(makeAlly("p1"), skill, [makeAlly("p1")], 1);

    expect(r.messages[0]).toContain("tier 3");
  });

  it("marked_targets emits message", () => {
    const skill = makeBonusActionSkill("mark", [
      { stat: "marked_targets", type: "flat", value: 2, isPercentage: false },
    ]);

    const r = executeBonusActionSkill(makeAlly("p1"), skill, [makeAlly("p1")], 1);

    expect(r.messages[0]).toContain("позначає 2");
  });
});

describe("executeBonusActionSkill — extra_casts resets hasUsedAction", () => {
  it("clears hasUsedAction flag on caster", () => {
    const skill = makeBonusActionSkill("extra", [
      { stat: "extra_casts", type: "flat", value: 1, isPercentage: false },
    ]);

    const p = createMockParticipant({
      basicInfo: { ...makeAlly("p1").basicInfo },
      actionFlags: {
        hasUsedAction: true,
        hasUsedBonusAction: false,
        hasUsedReaction: false,
        hasExtraTurn: false,
      },
    });

    const r = executeBonusActionSkill(p, skill, [p], 1);

    expect(r.updatedParticipant.actionFlags.hasUsedAction).toBe(false);
    // bonus action consumed
    expect(r.updatedParticipant.actionFlags.hasUsedBonusAction).toBe(true);
  });
});

describe("executeBonusActionSkill — morale buff/debuff с clamp", () => {
  it("morale buff clamps до ≤3", () => {
    const skill = makeBonusActionSkill("morale-buff", [
      {
        stat: "morale",
        type: "flat",
        value: 5,
        isPercentage: false,
        target: "all_allies",
      },
    ]);

    const a1 = makeAlly("a1");

    const a2 = createMockParticipant({
      basicInfo: { ...makeAlly("a2").basicInfo },
      combatStats: { ...makeAlly("a2").combatStats, morale: 1 },
    });

    const r = executeBonusActionSkill(a1, skill, [a1, a2], 1);

    const updatedA2 = r.updatedParticipants.find((p) => p.basicInfo.id === "a2");

    expect(updatedA2?.combatStats.morale).toBe(3); // clamped, not 6
  });
});

describe("executeBonusActionSkill — buff effects (initiative/armor/advantage)", () => {
  it("initiative додає buff з default duration=999", () => {
    const skill = makeBonusActionSkill("init", [
      { stat: "initiative", type: "flat", value: 5, isPercentage: false },
    ]);

    const p = makeAlly("p1");

    const r = executeBonusActionSkill(p, skill, [p], 1);

    const buff = r.updatedParticipant.battleData.activeEffects[0];

    expect(buff).toMatchObject({
      type: "buff",
      duration: 999,
      effects: [{ type: "initiative_bonus", value: 5 }],
    });
  });

  it("armor додає buff з duration=999", () => {
    const skill = makeBonusActionSkill("ac", [
      { stat: "armor", type: "flat", value: 2, isPercentage: false },
    ]);

    const p = makeAlly("p1");

    const r = executeBonusActionSkill(p, skill, [p], 1);

    expect(
      r.updatedParticipant.battleData.activeEffects[0].effects[0],
    ).toMatchObject({ type: "armor_bonus", value: 2 });
  });

  it("advantage додає buff з duration=1", () => {
    const skill = makeBonusActionSkill("adv", [
      { stat: "advantage", type: "flat", value: 1, isPercentage: false },
    ]);

    const p = makeAlly("p1");

    const r = executeBonusActionSkill(p, skill, [p], 1);

    expect(r.updatedParticipant.battleData.activeEffects[0]).toMatchObject({
      duration: 1,
      effects: [{ type: "advantage_attack", value: 1 }],
    });
  });
});

describe("executeBonusActionSkill — damage variants", () => {
  it("damage default → effectType='all_damage'", () => {
    const skill = makeBonusActionSkill("dmg", [
      { stat: "damage", type: "flat", value: 5, isPercentage: false },
    ]);

    const p = makeAlly("p1");

    const r = executeBonusActionSkill(p, skill, [p], 1);

    expect(
      r.updatedParticipant.battleData.activeEffects[0].effects[0],
    ).toMatchObject({ type: "all_damage", value: 5 });
  });

  it("melee_damage / ranged_damage / all_damage preserve stat as effectType", () => {
    for (const stat of ["melee_damage", "ranged_damage", "all_damage"] as const) {
      const skill = makeBonusActionSkill(`s-${stat}`, [
        { stat, type: "flat", value: 4, isPercentage: false },
      ]);

      const p = makeAlly("p1");

      const r = executeBonusActionSkill(p, skill, [p], 1);

      expect(
        r.updatedParticipant.battleData.activeEffects[0].effects[0].type,
      ).toBe(stat);
    }
  });

  it("damage custom duration з effect.duration", () => {
    const skill = makeBonusActionSkill("dmg-3r", [
      {
        stat: "all_damage",
        type: "flat",
        value: 3,
        isPercentage: false,
        duration: 3,
      },
    ]);

    const p = makeAlly("p1");

    const r = executeBonusActionSkill(p, skill, [p], 1);

    expect(r.updatedParticipant.battleData.activeEffects[0].duration).toBe(3);
  });

  it("damage formula evaluates (hero_level * 2)", () => {
    const skill = makeBonusActionSkill("dmg-formula", [
      {
        stat: "melee_damage",
        type: "formula",
        value: "hero_level * 2",
        isPercentage: false,
      },
    ]);

    const p = createMockParticipant({
      basicInfo: { ...makeAlly("p1").basicInfo },
      abilities: { ...makeAlly("p1").abilities, level: 4 },
    });

    const r = executeBonusActionSkill(p, skill, [p], 1);

    expect(
      r.updatedParticipant.battleData.activeEffects[0].effects[0].value,
    ).toBe(8);
  });
});

describe("executeBonusActionSkill — restore_spell_slot", () => {
  it("відновлює перший не-повний слот, до max", () => {
    const skill = makeBonusActionSkill("rest", [
      { stat: "restore_spell_slot", type: "flat", value: 1, isPercentage: false },
    ]);

    const p = createMockParticipant({
      basicInfo: { ...makeAlly("p1").basicInfo },
      spellcasting: {
        spellSlots: {
          "1": { max: 2, current: 2 }, // повний — пропуск
          "2": { max: 3, current: 1 }, // not full → restore тут
          "3": { max: 1, current: 0 }, // також not full, але не дійде
        },
        knownSpells: [],
      },
    });

    const r = executeBonusActionSkill(p, skill, [p], 1);

    expect(r.updatedParticipant.spellcasting.spellSlots["1"].current).toBe(2);
    expect(r.updatedParticipant.spellcasting.spellSlots["2"].current).toBe(2);
    // "3" не торкнуто бо вже знайшли "2"
    expect(r.updatedParticipant.spellcasting.spellSlots["3"].current).toBe(0);
    expect(r.messages[0]).toContain("рівня 2");
  });
});

describe("executeBonusActionSkill — field_damage (DOT на active enemies)", () => {
  it("додає DOT debuff на всіх живих ворогів", () => {
    const skill = makeBonusActionSkill("field", [
      { stat: "field_damage", type: "flat", value: 10, isPercentage: false },
    ]);

    const caster = makeAlly("a1");

    const enemy1 = makeEnemy("e1");

    const enemyDead = createMockParticipant({
      basicInfo: { ...makeEnemy("e2").basicInfo },
      combatStats: { ...makeEnemy("e2").combatStats, status: "dead" },
    });

    const ally2 = makeAlly("a2");

    const r = executeBonusActionSkill(
      caster,
      skill,
      [caster, enemy1, enemyDead, ally2],
      1,
    );

    const e1After = r.updatedParticipants.find((p) => p.basicInfo.id === "e1");

    const e2After = r.updatedParticipants.find((p) => p.basicInfo.id === "e2");

    const a2After = r.updatedParticipants.find((p) => p.basicInfo.id === "a2");

    // active enemy отримав DOT
    expect(e1After?.battleData.activeEffects).toHaveLength(1);
    expect(e1After?.battleData.activeEffects[0].dotDamage).toMatchObject({
      damagePerRound: 10,
      damageType: "fire",
    });

    // мертвий enemy — без DOT
    expect(e2After?.battleData.activeEffects).toEqual([]);

    // ally — без DOT
    expect(a2After?.battleData.activeEffects).toEqual([]);
  });
});

describe("executeBonusActionSkill — revive_hp", () => {
  it("воскрешає мертвого target з flat HP", () => {
    const skill = makeBonusActionSkill("revive", [
      { stat: "revive_hp", type: "flat", value: 10, isPercentage: false },
    ]);

    const caster = makeAlly("a1");

    const dead = createMockParticipant({
      basicInfo: { ...makeAlly("a2").basicInfo },
      combatStats: { ...makeAlly("a2").combatStats, currentHp: 0, status: "dead" },
    });

    const r = executeBonusActionSkill(caster, skill, [caster, dead], 1, "a2");

    const a2After = r.updatedParticipants.find((p) => p.basicInfo.id === "a2");

    expect(a2After?.combatStats.status).toBe("active");
    expect(a2After?.combatStats.currentHp).toBe(10);
  });

  it("revive percent: maxHp * value/100", () => {
    const skill = makeBonusActionSkill("revive50", [
      { stat: "revive_hp", type: "flat", value: 50, isPercentage: true },
    ]);

    const caster = makeAlly("a1");

    const dead = createMockParticipant({
      basicInfo: { ...makeAlly("a2").basicInfo },
      combatStats: {
        ...makeAlly("a2").combatStats,
        maxHp: 30,
        currentHp: 0,
        status: "dead",
      },
    });

    const r = executeBonusActionSkill(caster, skill, [caster, dead], 1, "a2");

    const a2After = r.updatedParticipants.find((p) => p.basicInfo.id === "a2");

    expect(a2After?.combatStats.currentHp).toBe(15);
  });

  it("не воскрешає живого", () => {
    const skill = makeBonusActionSkill("revive", [
      { stat: "revive_hp", type: "flat", value: 10, isPercentage: false },
    ]);

    const caster = makeAlly("a1");

    const alive = makeAlly("a2");

    const r = executeBonusActionSkill(caster, skill, [caster, alive], 1, "a2");

    const a2After = r.updatedParticipants.find((p) => p.basicInfo.id === "a2");

    expect(a2After?.combatStats.currentHp).toBe(20); // unchanged max HP
  });
});

describe("executeBonusActionSkill — morale_restore (debuff на ворогів)", () => {
  it("знижує мораль активних ворогів, clamp ≥ -3", () => {
    const skill = makeBonusActionSkill("intimidate", [
      { stat: "morale_restore", type: "flat", value: -5, isPercentage: false },
    ]);

    const caster = makeAlly("a1");

    const enemy1 = createMockParticipant({
      basicInfo: { ...makeEnemy("e1").basicInfo },
      combatStats: { ...makeEnemy("e1").combatStats, morale: 0 },
    });

    const enemyDead = createMockParticipant({
      basicInfo: { ...makeEnemy("e2").basicInfo },
      combatStats: { ...makeEnemy("e2").combatStats, status: "dead" },
    });

    const r = executeBonusActionSkill(
      caster,
      skill,
      [caster, enemy1, enemyDead],
      1,
    );

    const e1After = r.updatedParticipants.find((p) => p.basicInfo.id === "e1");

    expect(e1After?.combatStats.morale).toBe(-3); // clamped from 0+(-5)=-5

    // dead enemy не торкнутий
    const e2After = r.updatedParticipants.find((p) => p.basicInfo.id === "e2");

    expect(e2After?.combatStats.morale).toBe(0);
  });
});

describe("executeBonusActionSkill — clear_negative_effects", () => {
  it("видаляє debuff effects з target, лишає buff", () => {
    const skill = makeBonusActionSkill("cleanse", [
      { stat: "clear_negative_effects", type: "flat", value: 1, isPercentage: false },
    ]);

    const caster = makeAlly("a1");

    const target = createMockParticipant({
      basicInfo: { ...makeAlly("a2").basicInfo },
      battleData: {
        ...makeAlly("a2").battleData,
        activeEffects: [
          {
            id: "buff-1",
            name: "buff",
            type: "buff",
            duration: 5,
            effects: [],
            appliedAt: { round: 1, timestamp: new Date() },
          },
          {
            id: "debuff-1",
            name: "debuff",
            type: "debuff",
            duration: 3,
            effects: [],
            appliedAt: { round: 1, timestamp: new Date() },
          },
        ],
      },
    });

    const r = executeBonusActionSkill(caster, skill, [caster, target], 1, "a2");

    const a2After = r.updatedParticipants.find((p) => p.basicInfo.id === "a2");

    expect(a2After?.battleData.activeEffects).toHaveLength(1);
    expect(a2After?.battleData.activeEffects[0].id).toBe("buff-1");
  });

  it("noop коли немає targetParticipantId", () => {
    const skill = makeBonusActionSkill("cleanse-no-tgt", [
      { stat: "clear_negative_effects", type: "flat", value: 1, isPercentage: false },
    ]);

    const r = executeBonusActionSkill(makeAlly("p1"), skill, [makeAlly("p1")], 1);

    expect(r.messages.find((m) => m.includes("дебафи"))).toBeUndefined();
  });
});

describe("executeBonusActionSkill — default branch", () => {
  it("unknown stat генерує generic message", () => {
    const skill = makeBonusActionSkill("unknown-effect", [
      { stat: "totally_made_up", type: "flat", value: 7, isPercentage: false },
    ]);

    const r = executeBonusActionSkill(makeAlly("p1"), skill, [makeAlly("p1")], 1);

    expect(r.messages[0]).toContain("totally_made_up");
    expect(r.messages[0]).toContain("7");
  });
});
