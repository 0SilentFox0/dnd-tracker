import { describe, expect, it } from "vitest";

import { applyCriticalEffect, critFlavorFor } from "../critical";

import { type CriticalEffect, type CriticalEffectType, getCriticalEffect } from "@/lib/constants/critical-effects";
import { collectModifiers } from "@/lib/utils/abilities/engine/collect-modifiers";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";

const crit = (type: CriticalEffectType, extra: Partial<CriticalEffect["effect"]> = {}): CriticalEffect => ({
  id: 1,
  name: "Тест-ефект",
  description: "опис",
  type: "success",
  flavor: [],
  effect: { type, duration: 1, ...extra },
});

const apply = (type: CriticalEffectType, extra: Partial<CriticalEffect["effect"]> = {}) =>
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

  it("advantage for the next attack is consumable", () => {
    const p = apply("advantage_next_attack", { duration: 2 });

    expect(p.battleData.activeEffects[0]).toMatchObject({ duration: 2, consumeOn: "ownAttack", expireAtTurnEnd: true });
    expect(collectModifiers([p], "p1", { flag: "advantage" }).flags.length).toBeGreaterThan(0);
  });

  it("free attack grants an extra action", () => {
    expect(apply("free_attack").battleData.pendingExtraActions).toBe(1);
  });

  it("free attack off turn grants nothing", () => {
    const p = applyCriticalEffect(createMockParticipant(), crit("free_attack"), 3, { offTurn: true });

    expect(p.battleData.pendingExtraActions ?? 0).toBe(0);
  });

  it("combo grants an extra action with a consumable disadvantage", () => {
    const p = apply("combo_attack");

    expect(p.battleData.pendingExtraActions).toBe(1);
    expect(p.battleData.activeEffects[0]).toMatchObject({ consumeOn: "ownAttack" });
  });

  it("marks on target and self make attackers roll with advantage", () => {
    for (const type of ["advantage_on_target", "advantage_on_self"] as const) {
      expect(collectModifiers([apply(type)], "p1", { flag: "advantageForAttackers" }).flags.length).toBeGreaterThan(0);
    }
  });

  it("prone gives attackers advantage and the owner disadvantage", () => {
    const p = apply("prone", { duration: 2 });

    expect(collectModifiers([p], "p1", { flag: "advantageForAttackers" }).flags.length).toBeGreaterThan(0);
    expect(collectModifiers([p], "p1", { flag: "disadvantage" }).flags.length).toBeGreaterThan(0);
  });

  it("losing the reaction is immediate", () => {
    const p = apply("lose_reaction");

    expect(p.actionFlags.hasUsedReaction).toBe(true);
    expect(p.battleData.activeEffects).toHaveLength(0);
  });

  it("losing the action skips the next turn's action", () => {
    const p = apply("lose_action");

    expect(effectTypes(p)).toEqual(["skip_action"]);
    expect(p.battleData.activeEffects[0].effects[0].value).toBe(100);
  });

  it("weakened_next_hit is consumed by the owner's hit", () => {
    const p = apply("weakened_next_hit", { duration: 2 });

    expect(p.battleData.activeEffects[0]).toMatchObject({ consumeOn: "ownHit", effects: [{ type: "weakened_next_hit", value: 0.5 }] });
  });

  it("lose_bonus_action sets the flag without an effect", () => {
    const bonus = apply("lose_bonus_action");

    expect(bonus.actionFlags.hasUsedBonusAction).toBe(true);
    expect(bonus.battleData.activeEffects).toHaveLength(0);
  });

  it("ефекти урону й побічні (double_damage, simple_miss…) не змінюють учасника", () => {
    const base = createMockParticipant();

    for (const type of ["double_damage", "max_damage", "additional_damage", "simple_miss", "ignore_reactions", "provoke_opportunity_attack"] as const) {
      expect(applyCriticalEffect(base, crit(type), 1)).toEqual(base);
    }
  });

  it("ефект лягає на переданого одержувача", () => {
    const base = createMockParticipant();

    const recipient = createMockParticipant({ basicInfo: { ...base.basicInfo, id: "t1" } });

    const out = applyCriticalEffect(recipient, crit("ac_debuff", { value: -2 }), 1);

    expect(out.basicInfo.id).toBe("t1");
    expect(collectModifiers([out], "t1", { stat: "armor" }).flat).toBe(-2);
  });
});

describe("critFlavorFor", () => {
  const effect = getCriticalEffect(6, "success") as CriticalEffect;

  const seed = { battleId: "b1", round: 2, attackerId: "x", targetId: "y" };

  it("substitutes names and is deterministic for a seed", () => {
    const a = critFlavorFor(effect, "Семгрун", "Бес", seed);

    expect(a).toBe(critFlavorFor(effect, "Семгрун", "Бес", seed));
    expect(a).toContain("Семгрун");
    expect(a).not.toContain("{");
  });

  it("the suffix is part of the seed", () => {
    const phrases = new Set(["a", "b", "c", "d", "e", "f"].map((suffix) => critFlavorFor(effect, "A", "B", { ...seed, suffix })));

    expect(phrases.size).toBeGreaterThan(1);
  });
});
