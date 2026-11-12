import { describe, expect, it } from "vitest";

import { runAfterAttack } from "../after-attack";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { AfterAttackCtx, AfterAttackHook } from "@/lib/utils/rules/systems/types";
import type { BattleAction } from "@/types/battle";

const action = (id: string) => ({ id }) as unknown as BattleAction;

const ctx = (): AfterAttackCtx => ({ participants: [createMockParticipant()], attackerId: "a", defenderId: "d", first: true, round: 1, rules: DEFAULT_RULES, retaliate: () => null });

describe("runAfterAttack", () => {
  it("runs the hooks in order, each seeing the previous result", () => {
    const seen: number[] = [];

    const first: AfterAttackHook = (c) => {
      seen.push(c.participants.length);

      return { participants: [...c.participants, createMockParticipant()], actions: [action("one")] };
    };

    const second: AfterAttackHook = (c) => {
      seen.push(c.participants.length);

      return { participants: c.participants, actions: [action("two")] };
    };

    const out = runAfterAttack([first, second], ctx());

    expect(seen).toEqual([1, 2]);
    expect(out?.actions.map((a) => (a as unknown as { id: string }).id)).toEqual(["one", "two"]);
    expect(out?.handled).toBeUndefined();
  });

  it("is handled once any hook says so, and null when no hook adds anything", () => {
    expect(runAfterAttack([() => null], ctx())).toBeNull();
    expect(runAfterAttack([], ctx())).toBeNull();

    const out = runAfterAttack([(c) => ({ participants: c.participants, actions: [], handled: true }), (c) => ({ participants: c.participants, actions: [] })], ctx());

    expect(out?.handled).toBe(true);
  });
});
