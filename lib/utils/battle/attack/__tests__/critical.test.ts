import { describe, expect, it } from "vitest";

import { applyCriticalEffect } from "../critical";

import type { CriticalEffect } from "@/lib/constants/critical-effects";
import { collectModifiers } from "@/lib/utils/abilities/engine/collect-modifiers";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";

const crit = (type: string, extra: Partial<CriticalEffect["effect"]> = {}): CriticalEffect => ({
  id: 1,
  name: "Тест-ефект",
  description: "опис",
  type: "success",
  flavor: [],
  effect: { type, duration: 1, ...extra },
});

const apply = (type: string, extra: Partial<CriticalEffect["effect"]> = {}) =>
  applyCriticalEffect(createMockParticipant(), crit(type, extra), 3);

const effectTypes = (p: ReturnType<typeof apply>) => p.battleData.activeEffects.flatMap((e) => e.effects.map((d) => d.type));

describe("applyCriticalEffect", () => {
  it("ac_debuff: -2 до броні для collectModifiers, значення за замовчуванням і задане", () => {
    const p = apply("ac_debuff");

    expect(collectModifiers([p], p.basicInfo.id, { stat: "armor" }).flat).toBe(-2);
    expect(collectModifiers([apply("ac_debuff", { value: -5 })], "p1", { stat: "armor" }).flat).toBe(-5);
    expect(p.battleData.activeEffects[0]).toMatchObject({ name: "Тест-ефект", type: "debuff", duration: 1, appliedAt: { round: 3 } });
  });

  it("advantage_next_attack: прапор advantage на всі атаки, бафф", () => {
    const p = apply("advantage_next_attack");

    const flags = collectModifiers([p], "p1", { flag: "advantage" }).flags;

    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ kind: "flag", flag: "advantage", attackKind: "all" });
    expect(p.battleData.activeEffects[0].type).toBe("buff");
  });

  it("disadvantage_next_attack: прапор disadvantage", () => {
    const p = apply("disadvantage_next_attack");

    expect(collectModifiers([p], "p1", { flag: "disadvantage" }).flags).toHaveLength(1);
    expect(collectModifiers([p], "p1", { flag: "advantage" }).flags).toHaveLength(0);
  });

  it.each([
    ["stun", "stun", "debuff"],
    ["free_attack", "extra_attack", "buff"],
    ["block_bonus_action", "no_bonus_action", "debuff"],
    ["advantage_on_target", "advantage_against_me", "debuff"],
    ["advantage_on_self", "advantage_against_me", "debuff"],
    ["combo_attack", "combo_attack_disadvantage", "buff"],
    ["prone", "prone", "condition"],
    ["lose_reaction", "no_reaction", "debuff"],
  ])("%s додає активний ефект з обмеженням %s (читають battle-turn і disabled-attacks)", (type, marker, kind) => {
    const p = apply(type);

    expect(effectTypes(p)).toEqual([marker]);
    expect(p.battleData.activeEffects[0].type).toBe(kind);
  });

  it("lose_bonus_action / lose_action ставлять прапорці без ефекту", () => {
    const bonus = apply("lose_bonus_action");

    const action = apply("lose_action");

    expect(bonus.actionFlags.hasUsedBonusAction).toBe(true);
    expect(bonus.battleData.activeEffects).toHaveLength(0);
    expect(action.actionFlags.hasUsedAction).toBe(true);
  });

  it("ефекти урону й побічні (double_damage, simple_miss…) не змінюють учасника", () => {
    const base = createMockParticipant();

    for (const type of ["double_damage", "max_damage", "extra_damage", "simple_miss", "half_damage", "disarm"]) {
      expect(applyCriticalEffect(base, crit(type), 1)).toEqual(base);
    }
  });

  it("target: ефект лягає на ціль, а не на того, хто б'є", () => {
    const attacker = createMockParticipant();

    const target = createMockParticipant({ basicInfo: { ...attacker.basicInfo, id: "t1" } });

    const out = applyCriticalEffect(attacker, crit("ac_debuff", { value: -2 }), 1, target);

    expect(out.basicInfo.id).toBe("t1");
    expect(collectModifiers([out], "t1", { stat: "armor" }).flat).toBe(-2);
  });
});
