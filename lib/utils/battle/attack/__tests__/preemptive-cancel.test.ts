import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { processAttack } from "@/lib/utils/battle/attack/process";
import type { BattleAttack } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

describe("attack before cancels when the attacker falls", () => {
  it("target's pre-emptive kill aborts the attack", () => {
    const riposte = resolved(
      { name: "Випад", trigger: { event: "attack", phase: "before", role: "target", attackKind: "melee" }, limits: { perRound: 1 }, effects: [{ kind: "dealDamage", amount: 1000, target: "eventActor" }] },
    );

    const attacker = { ...makeParticipant({ id: "a" }), battleData: { ...makeParticipant({ id: "a" }).battleData, attacks: [sword] } };

    const target = makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50, abilities: [riposte] });

    const r = processAttack({ attacker, target, attack: sword, d20Roll: 15, damageRolls: [4], allParticipants: [attacker, target], currentRound: 1, battleId: "b1", rng: seq(0) });

    expect(r.success).toBe(false);
    expect(r.targetUpdated.combatStats.currentHp).toBe(50);
    expect(r.attackerUpdated.combatStats.status).not.toBe("active");
    expect(r.battleAction.resultText).toContain("Випад");
  });
});
