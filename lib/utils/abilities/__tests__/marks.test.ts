import { describe, expect, it } from "vitest";

import { makeParticipant, resolved } from "./fixtures";

import { collectModifiers } from "@/lib/utils/abilities/engine/collect-modifiers";
import { countMarks } from "@/lib/utils/abilities/engine/marks";
import { runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import type { Ability } from "@/lib/utils/abilities/schema";
import { AbilitySchema } from "@/lib/utils/abilities/schema";
import type { AbilityEvent } from "@/types/abilities";

const markOnHit = resolved({
  trigger: { event: "hit", role: "attacker" },
  effects: [{ kind: "mark", markId: "seq", duration: { rounds: 2 }, target: "eventTarget" }],
});

const perMark = resolved(
  { trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 2, perMark: "seq" }] },
  { id: "p" },
);

const hit = (actorId: string) => ({ type: "hit", actorId, targetId: "t", attackKind: "melee", damage: 5 }) as AbilityEvent;

describe("marks", () => {
  it("stack per source and drive perMark damage bonus", () => {
    let ps = [makeParticipant({ id: "h", abilities: [markOnHit, perMark] }), makeParticipant({ id: "h2", abilities: [markOnHit] }), makeParticipant({ id: "t" })];

    for (const actor of ["h", "h", "h2"]) ps = runAbilities(ps, hit(actor), { round: 1, rng: () => 0 }).participants;

    const t = ps.find((p) => p.basicInfo.id === "t");

    expect(countMarks(t, "seq", "h")).toBe(2);
    expect(countMarks(t, "seq", "h2")).toBe(1);
    expect(collectModifiers(ps, "h", { damage: { kind: "melee", targetId: "t" } }).percent).toBe(4);
    expect(collectModifiers(ps, "h", { damage: { kind: "melee" } }).percent).toBe(0);
  });

  it("schema accepts mark and perMark", () => {
    const ability = { id: "a", name: "x", trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "mark", markId: "m", duration: { rounds: 1 } }] } as Ability;

    expect(AbilitySchema.safeParse(ability).success).toBe(true);
  });
});
