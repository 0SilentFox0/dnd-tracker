import { describe, expect, it } from "vitest";

import { makeParticipant } from "./fixtures";

import { upsertTimedEffect } from "@/lib/utils/abilities/engine/timed-effects";
import { AbilitySchema } from "@/lib/utils/abilities/schema";

const apply = (p: ReturnType<typeof makeParticipant>, round: number, rounds: number) =>
  upsertTimedEffect(p, { timedKey: "k", name: "Заряд", type: "buff", rounds, stackable: true, maxStacks: 2 }, round);

describe("maxStacks", () => {
  it("third application keeps 2 stacks and refreshes the oldest", () => {
    let p = makeParticipant({ id: "p" });

    p = apply(p, 1, 2);
    p = apply(p, 2, 2);
    p = apply(p, 3, 5);

    const stacks = p.battleData.activeEffects.filter((e) => e.abilityKey === "k");

    expect(stacks).toHaveLength(2);
    expect(stacks[0].duration).toBe(5);
    expect(stacks[0].appliedAt.round).toBe(3);
    expect(stacks[1].duration).toBe(2);
  });

  it("schema: maxStacks requires stackable", () => {
    const base = { id: "a", name: "x", trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "note", text: "t" }] };

    expect(AbilitySchema.safeParse({ ...base, stackable: true, maxStacks: 2 }).success).toBe(true);
    expect(AbilitySchema.safeParse({ ...base, maxStacks: 2 }).success).toBe(false);
  });

  it("refreshes the stack with the least time left", () => {
    let p = makeParticipant({ id: "p" });

    p = apply(p, 1, 5);
    p = apply(p, 2, 1);
    p = apply(p, 3, 4);

    expect(p.battleData.activeEffects.map((e) => e.duration)).toEqual([5, 4]);
  });
});
