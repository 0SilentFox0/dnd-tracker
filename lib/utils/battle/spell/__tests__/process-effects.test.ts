/**
 * Тести для spell process-effects (CODE_AUDIT 5.8 part).
 *
 * Покриває чисті трансформатори:
 *  - applySpellAdditionalModifier (DOT)
 *  - applySpellDurationEffects (buff/debuff classification)
 *  - applySpellRemoveBuffsDebuffs (filter)
 *  - applySpellManaSteal (decrement slot 1)
 */

import { describe, expect, it } from "vitest";

import {
  applySpellAdditionalModifier,
  applySpellDurationEffects,
  applySpellManaSteal,
  applySpellRemoveBuffsDebuffs,
} from "../process-effects";

import type { BattleSpell } from "@/lib/utils/battle/types/spell-process";
import {
  createMockParticipant,
} from "@/lib/utils/skills/__tests__/skill-triggers-execution-mocks";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

function makeSpell(overrides: Partial<BattleSpell> = {}): BattleSpell {
  return {
    id: "spell-1",
    name: "Test Spell",
    description: "test",
    icon: "icon-x",
    level: 1,
    type: "single_target",
    damageType: "damage",
    diceCount: 1,
    diceType: "d6",
    duration: "",
    effects: [],
    healModifier: null,
    ...overrides,
  } as unknown as BattleSpell;
}

function makeEffect(over: Partial<ActiveEffect> = {}): ActiveEffect {
  return {
    id: "fx-1",
    name: "fx",
    type: "buff",
    duration: 3,
    effects: [],
    appliedAt: { round: 1, timestamp: new Date() },
    ...over,
  };
}

describe("applySpellAdditionalModifier — DOT", () => {
  const target = createMockParticipant();

  it("returns targets unchanged when modifier or duration missing", () => {
    const r = applySpellAdditionalModifier(makeSpell(), [target], {}, 1);

    expect(r).toEqual([target]);
  });

  it("returns unchanged when damage <= 0", () => {
    const r = applySpellAdditionalModifier(
      makeSpell(),
      [target],
      { modifier: "poison", duration: 3, damage: 0 },
      1,
    );

    expect(r).toEqual([target]);
  });

  it("returns unchanged when duration <= 0", () => {
    const r = applySpellAdditionalModifier(
      makeSpell(),
      [target],
      { modifier: "poison", duration: 0, damage: 5 },
      1,
    );

    expect(r).toEqual([target]);
  });

  it("adds debuff with dotDamage payload to each target", () => {
    const t1 = createMockParticipant({
      basicInfo: { ...createMockParticipant().basicInfo, id: "t1" },
    });

    const t2 = createMockParticipant({
      basicInfo: { ...createMockParticipant().basicInfo, id: "t2" },
    });

    const r = applySpellAdditionalModifier(
      makeSpell({ name: "Acid Shot" }),
      [t1, t2],
      { modifier: "acid", duration: 4, damage: 6 },
      1,
    );

    expect(r).toHaveLength(2);

    for (const target of r) {
      const fx = target.battleData.activeEffects[0];

      expect(fx.type).toBe("debuff");
      expect(fx.duration).toBe(4);
      expect(fx.dotDamage).toEqual({ damagePerRound: 6, damageType: "acid" });
      expect(fx.effects[0]).toMatchObject({ type: "acid_damage", value: 6 });
    }
  });
});

describe("applySpellDurationEffects — buff/debuff classification", () => {
  const target = createMockParticipant();

  it("noop коли немає duration і немає effects", () => {
    const r = applySpellDurationEffects(
      makeSpell({ duration: "", effectDetails: undefined }),
      [target],
      1,
    );

    expect(r).toEqual([target]);
  });

  it("classifies effects with positive value as buff", () => {
    const r = applySpellDurationEffects(
      makeSpell({
        duration: "3 раунди",
        effectDetails: { effects: [{ type: "armor_bonus", value: 5 }] },
      }),
      [target],
      1,
    );

    expect(r[0].battleData.activeEffects[0].type).toBe("buff");
  });

  it("classifies negative-value effects as debuff", () => {
    const r = applySpellDurationEffects(
      makeSpell({
        duration: "2 раунди",
        effectDetails: { effects: [{ type: "speed_penalty", value: -10 }] },
      }),
      [target],
      1,
    );

    expect(r[0].battleData.activeEffects[0].type).toBe("debuff");
  });

  it("respects explicit harmful=true → debuff", () => {
    const r = applySpellDurationEffects(
      makeSpell({
        duration: "2 раунди",
        effectDetails: {
          effects: [{ type: "weird_stat", value: 5, harmful: true }],
        },
      }),
      [target],
      1,
    );

    expect(r[0].battleData.activeEffects[0].type).toBe("debuff");
  });

  it("respects explicit harmful=false → buff навіть з negative value", () => {
    const r = applySpellDurationEffects(
      makeSpell({
        duration: "1 раунд",
        effectDetails: {
          effects: [{ type: "weird_stat", value: -10, harmful: false }],
        },
      }),
      [target],
      1,
    );

    expect(r[0].battleData.activeEffects[0].type).toBe("buff");
  });

  it("vampirism is always classified as buff and auto-injected for healModifier='vampirism'", () => {
    const r = applySpellDurationEffects(
      makeSpell({
        duration: "1 раунд",
        healModifier: "vampirism",
        effectDetails: { effects: [] },
      }),
      [target],
      1,
    );

    const fx = r[0].battleData.activeEffects[0];

    expect(fx.type).toBe("buff");
    expect(fx.effects.find((e) => e.type === "vampirism")).toMatchObject({
      type: "vampirism",
      value: 50,
      isPercentage: true,
    });
  });

  it("disable_* tags from spell.effects classify as debuff", () => {
    const r = applySpellDurationEffects(
      makeSpell({
        duration: "2 раунди",
        effectDetails: { effects: [] },
        effects: ["disable_melee_attacks"],
      }),
      [target],
      1,
    );

    const fx = r[0].battleData.activeEffects[0];

    expect(fx.type).toBe("debuff");
    expect(fx.effects.find((e) => e.type === "disable_melee_attacks")).toMatchObject({
      type: "disable_melee_attacks",
      value: 1,
    });
  });

  it("durationRounds default = 1 коли parsed = 0 але effects є", () => {
    const r = applySpellDurationEffects(
      makeSpell({
        duration: "",
        effectDetails: { effects: [{ type: "x", value: 1 }] },
      }),
      [target],
      1,
    );

    expect(r[0].battleData.activeEffects[0].duration).toBe(1);
  });
});

describe("applySpellRemoveBuffsDebuffs — selective removal", () => {
  function makeTarget(effects: ActiveEffect[]): BattleParticipant {
    const base = createMockParticipant();

    return {
      ...base,
      battleData: { ...base.battleData, activeEffects: effects },
    };
  }

  it("noop коли spell.effects не містить tag-ів", () => {
    const t = makeTarget([makeEffect({ type: "buff" })]);

    const r = applySpellRemoveBuffsDebuffs(makeSpell({ effects: [] }), [t]);

    expect(r).toEqual([t]);
  });

  it("Remove all buffs — фільтрує type='buff'", () => {
    const t = makeTarget([
      makeEffect({ id: "buff-1", type: "buff" }),
      makeEffect({ id: "debuff-1", type: "debuff" }),
    ]);

    const r = applySpellRemoveBuffsDebuffs(
      makeSpell({ effects: ["Remove all buffs"] }),
      [t],
    );

    const remaining = r[0].battleData.activeEffects;

    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe("debuff-1");
  });

  it("Remove all debuffs — фільтрує type='debuff'", () => {
    const t = makeTarget([
      makeEffect({ id: "buff-1", type: "buff" }),
      makeEffect({ id: "debuff-1", type: "debuff" }),
    ]);

    const r = applySpellRemoveBuffsDebuffs(
      makeSpell({ effects: ["Remove all debuffs"] }),
      [t],
    );

    expect(r[0].battleData.activeEffects.map((e) => e.id)).toEqual(["buff-1"]);
  });

  it("alternative debuff tag works (Remove all curses/diseases/hostile spells)", () => {
    const t = makeTarget([
      makeEffect({ id: "debuff-1", type: "debuff" }),
    ]);

    const r = applySpellRemoveBuffsDebuffs(
      makeSpell({ effects: ["Remove all curses/diseases/hostile spells"] }),
      [t],
    );

    expect(r[0].battleData.activeEffects).toEqual([]);
  });

  it("returns same target object reference коли не було змін (для == identity)", () => {
    const t = makeTarget([makeEffect({ type: "buff" })]);

    const r = applySpellRemoveBuffsDebuffs(
      makeSpell({ effects: ["Remove all debuffs"] }),
      [t],
    );

    // Жодного debuff — target повертається як є
    expect(r[0]).toBe(t);
  });
});

describe("applySpellManaSteal — slot 1 decrement", () => {
  it("noop коли spell.effects не має 'Крадіжка мани'", () => {
    const t = createMockParticipant();

    const r = applySpellManaSteal(makeSpell(), [t]);

    expect(r).toEqual([t]);
  });

  it("decrements slot 1 current by 1 when target has slot", () => {
    const t = createMockParticipant({
      spellcasting: { spellSlots: { "1": { max: 3, current: 3 } }, knownSpells: [] },
    });

    const r = applySpellManaSteal(
      makeSpell({ effects: ["Крадіжка мани"] }),
      [t],
    );

    expect(r[0].spellcasting.spellSlots["1"].current).toBe(2);
  });

  it("noop коли target не має slot 1", () => {
    const t = createMockParticipant({
      spellcasting: { spellSlots: {}, knownSpells: [] },
    });

    const r = applySpellManaSteal(makeSpell({ effects: ["Крадіжка мани"] }), [t]);

    expect(r[0]).toBe(t);
  });

  it("noop коли slot 1 current=0 (clamp ≥ 0)", () => {
    const t = createMockParticipant({
      spellcasting: { spellSlots: { "1": { max: 3, current: 0 } }, knownSpells: [] },
    });

    const r = applySpellManaSteal(makeSpell({ effects: ["Крадіжка мани"] }), [t]);

    expect(r[0]).toBe(t);
  });
});
