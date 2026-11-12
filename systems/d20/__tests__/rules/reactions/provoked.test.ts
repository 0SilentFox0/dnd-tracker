import { describe, expect, it, vi } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { AfterAttackCtx } from "@/lib/utils/rules/systems/types";
import { D20_MODULE } from "@/systems/d20";
import { d20ProvokedOpportunity } from "@/systems/d20/rules/reactions/provoked";

const base = (over: Partial<AfterAttackCtx> = {}): AfterAttackCtx => ({ participants: [createMockParticipant()], attackerId: "a", defenderId: "d", first: true, round: 1, rules: DEFAULT_RULES, retaliate: () => null, ...over });

describe("d20 provoked opportunity as an afterAttack hook", () => {
  it("is registered on the d20 combat", () => {
    expect(D20_MODULE.combat.afterAttack).toContain(d20ProvokedOpportunity);
  });

  it("does nothing without the provoking critical effect", () => {
    const retaliate = vi.fn();

    expect(d20ProvokedOpportunity(base({ retaliate }))).toBeNull();
    expect(retaliate).not.toHaveBeenCalled();
  });

  it("answers with the provoked strike and claims the strike", () => {
    const retaliate = vi.fn(() => ({ participants: [createMockParticipant()], actions: [], sceneState: undefined }));

    const criticalEffect = { effect: { type: "provoke_opportunity_attack" } } as AfterAttackCtx["criticalEffect"];

    const out = d20ProvokedOpportunity(base({ retaliate, criticalEffect }));

    expect(retaliate).toHaveBeenCalledWith(true);
    expect(out?.handled).toBe(true);
  });

  it("still claims the strike when nobody can answer", () => {
    const criticalEffect = { effect: { type: "provoke_opportunity_attack" } } as AfterAttackCtx["criticalEffect"];

    expect(d20ProvokedOpportunity(base({ criticalEffect }))).toMatchObject({ actions: [], handled: true });
  });
});
