import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import { ConditionSchema } from "@/lib/utils/abilities/schema/conditions";
import { attackSourceOf } from "@/lib/utils/battle/attack/source";
import type { AbilityEvent } from "@/types/abilities";

const rider = resolved(
  { id: "p-rider", name: "Flame Tongue", trigger: { event: "hit", role: "attacker" }, condition: { type: "withThisItem" }, effects: [{ kind: "dealDamage", amount: 7, damageType: "fire", target: "eventTarget" }] },
  { type: "artifact", id: "ls+ft" },
);

const scene = () => [makeParticipant({ id: "f", abilities: [rider] }), makeParticipant({ id: "t", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50 })];

const hit = (source?: string): AbilityEvent => ({ type: "hit", actorId: "f", targetId: "t", attackKind: "melee", damage: 5, ...(source && { attackSourceId: source }) });

const hpAfter = (event: AbilityEvent) => runAbilities(scene(), event, { round: 1, rng: seq(0.5) }).participants.find((p) => p.basicInfo.id === "t")?.combatStats.currentHp;

describe("withThisItem", () => {
  it("rider fires only for an attack made with its item", () => {
    expect(hpAfter(hit("ls+ft"))).toBe(43);
    expect(hpAfter(hit("dg"))).toBe(50);
    expect(hpAfter(hit())).toBe(50);
  });

  it("off-hand source strips :off; default attacks have no item", () => {
    expect(attackSourceOf({ id: "ls+ft:off" })).toEqual({ attackSourceId: "ls+ft" });
    expect(attackSourceOf({ id: "default-melee" })).toEqual({ attackSourceId: "default-melee" });
    expect(attackSourceOf({})).toEqual({});
  });

  it("schema accepts the condition", () => {
    expect(ConditionSchema.safeParse({ type: "withThisItem" }).success).toBe(true);
  });
});
