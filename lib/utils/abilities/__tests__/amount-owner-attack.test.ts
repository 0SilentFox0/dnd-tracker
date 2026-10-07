import { describe, expect, it } from "vitest";

import { makeParticipant, resolved, seq } from "./fixtures";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { resolveAmount } from "@/lib/utils/abilities/engine/amount";
import { runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import { averageAttackDamage } from "@/lib/utils/battle/damage/average";
import type { AbilityEvent } from "@/types/abilities";
import type { BattleAttack } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "2d6", damageType: "slashing" };

const withAttack = (id: string, abilities = [] as ReturnType<typeof resolved>[]) => {
  const p = makeParticipant({ id, abilities });

  return { ...p, battleData: { ...p.battleData, attacks: [sword] } };
};

describe("percentOf ownerAttack", () => {
  const amount = { percentOf: "ownerAttack" as const, value: 50 };

  it("is a share of the average primary attack", () => {
    const owner = withAttack("h");

    const total = averageAttackDamage(owner, sword, [owner]).total;

    expect(total).toBeGreaterThan(0);
    expect(resolveAmount(amount, { owner, rng: seq(0) })).toBe(Math.floor(total / 2));
  });

  it("is 0 without attacks", () => {
    expect(resolveAmount(amount, { owner: { ...withAttack("h"), battleData: { ...withAttack("h").battleData, attacks: [] } }, rng: seq(0) })).toBe(0);
  });

  it("dot stores the resolved per-round damage", () => {
    const dot = resolved({ trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "dot", damagePerRound: amount, damageType: "bleed", duration: { rounds: 2 }, target: "eventTarget" }] });

    const owner = withAttack("h", [dot]);

    const expected = Math.floor(averageAttackDamage(owner, sword, [owner]).total / 2);

    const ps = [owner, makeParticipant({ id: "e", side: ParticipantSide.ENEMY })];

    const event = { type: "hit", actorId: "h", targetId: "e", attackKind: "melee", damage: 5 } as AbilityEvent;

    const r = runAbilities(ps, event, { round: 1, rng: seq(0) });

    expect(r.participants[1].battleData.activeEffects[0].dotDamage?.damagePerRound).toBe(expected);
  });
});
