import { describe, expect, it, vi } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import type { AfterAttackCtx } from "@/lib/utils/rules/systems/types";
import { d20ProvokedOpportunity } from "@/systems/d20/rules/reactions/provoked";

const base = (over: Partial<AfterAttackCtx> = {}): AfterAttackCtx => ({ participants: [createMockParticipant()], attackerId: "a", defenderId: "d", first: true, round: 1, rules: DEFAULT_RULES, counterStrike: () => null, ...over });

describe("d20 provoked opportunity as an afterAttack hook", () => {
  it("is registered on the d20 combat", () => {
    expect(ruleSystemOf(DEFAULT_RULES).combat.afterAttack).toContain(d20ProvokedOpportunity);
  });

  it("does nothing without the provoking critical effect", () => {
    const counterStrike = vi.fn();

    expect(d20ProvokedOpportunity(base({ counterStrike }))).toBeNull();
    expect(counterStrike).not.toHaveBeenCalled();
  });

  it("answers with the provoked strike and claims the strike", () => {
    const counterStrike = vi.fn(() => ({ participants: [createMockParticipant()], actions: [], sceneState: undefined }));

    const criticalEffect = { effect: { type: "provoke_opportunity_attack" } } as AfterAttackCtx["criticalEffect"];

    const out = d20ProvokedOpportunity(base({ counterStrike, criticalEffect }));

    expect(counterStrike).toHaveBeenCalledWith(true);
    expect(out?.handled).toBe(true);
  });

  it("still claims the strike when nobody can answer", () => {
    const criticalEffect = { effect: { type: "provoke_opportunity_attack" } } as AfterAttackCtx["criticalEffect"];

    expect(d20ProvokedOpportunity(base({ criticalEffect }))).toMatchObject({ actions: [], handled: true });
  });
});
