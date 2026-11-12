import { describe, expect, it } from "vitest";

import { context, goblin, hero } from "@/lib/server/battles/__tests__/mutations/fixtures";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import { assertCanAct, assertCanEndTurn } from "@/lib/utils/battle/turn";
import { beforeAdvanceHooks } from "@/lib/utils/battle/turn/hooks";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import { moraleCapPart } from "@/systems/morale/rules/cap";
import { applyPendingMorale } from "@/systems/morale/rules/turn/apply-pending";

const bare: Ruleset = { ...DEFAULT_RULES, system: { key: "dnd5e" } };

const withMorale: Ruleset = { ...DEFAULT_RULES, system: { key: "dnd5e", modules: ["morale"] }, morale: { enabled: true, cap: 4 } };

const moraleHero = { ...hero, combatStats: { ...hero.combatStats, morale: 2 } };

const ctxOf = (rules: Ruleset, pendingMoraleCheck: unknown = null) => {
  const base = context({ participants: [moraleHero, goblin] });

  return { ...base, scene: { ...base.scene, pendingMoraleCheck }, meta: { ...base.meta, rules } };
};

describe("morale module on d20", () => {
  it("without the module nothing gates acting, advance has no hook and the cap is untouched", () => {
    expect(() => assertCanAct(ctxOf(bare), "hero")).not.toThrow();
    expect(() => assertCanEndTurn(ctxOf(bare), "hero")).not.toThrow();
    expect(beforeAdvanceHooks(bare)).toEqual([]);
    expect(ruleSystemOf(bare).participant?.fromUnit).not.toContain(moraleCapPart);
  });

  it("with the module an unresolved check blocks acting and ending, skipMorale waives the act gate", () => {
    expect(() => assertCanAct(ctxOf(withMorale), "hero")).toThrow(expect.objectContaining({ code: "action_rejected" }));
    expect(() => assertCanEndTurn(ctxOf(withMorale), "hero")).toThrow(expect.objectContaining({ code: "action_rejected" }));
    expect(() => assertCanAct(ctxOf(withMorale), "hero", { skipMorale: true })).not.toThrow();
  });

  it("a panic result blocks acting even with skipMorale", () => {
    const panic = { participantId: "hero", d10Roll: 1, moraleResult: { shouldSkipTurn: true, hasExtraTurn: false, moralePositive: false, message: "" } };

    expect(() => assertCanAct(ctxOf(withMorale, panic), "hero", { skipMorale: true })).toThrow(expect.objectContaining({ code: "action_used" }));
  });

  it("the module sets the cap from the rules, or 0 when morale is off", () => {
    const part = ruleSystemOf(withMorale).participant?.fromCharacter;

    expect(part).toEqual([moraleCapPart]);
    expect(moraleCapPart(hero, { row: { level: 1 }, rules: withMorale, refs: {} }).abilities.moraleCap).toBe(4);
    expect(moraleCapPart(hero, { row: { level: 1 }, rules: { ...withMorale, morale: { enabled: false, cap: 4 } }, refs: {} }).abilities.moraleCap).toBe(0);
  });

  it("homm runs the pending-morale hook first; a payload stored before Ch8 applies the same", () => {
    expect(beforeAdvanceHooks(DEFAULT_RULES)[0]).toBe(applyPendingMorale);

    const legacy = { participantId: "hero", d10Roll: 1, moraleResult: { shouldSkipTurn: true, hasExtraTurn: false, moralePositive: false, message: "" } };

    const { scene } = ctxOf(DEFAULT_RULES, legacy);

    const out = applyPendingMorale({ participants: [moraleHero, goblin], scene, round: 1, rng: Math.random, rules: DEFAULT_RULES, run: runAbilities });

    expect(out.participants[0].actionFlags.hasUsedReaction).toBe(true);
    expect(out.actions?.[0].actionType).toBe("morale_skip");
  });
});
