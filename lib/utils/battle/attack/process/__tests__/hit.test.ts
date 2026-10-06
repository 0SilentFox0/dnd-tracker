import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { processAttack } from "@/lib/utils/battle/attack/process";
import { computeHitDamage } from "@/lib/utils/battle/attack/process/compute";
import type { BattleAttack } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

describe("крок влучання", () => {
  it("processAttack сам не відповідає ударом: ціль із мечем і counterAttack не б'є атакувальника", () => {
    const counter = resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "counterAttack", attackKinds: ["melee"], bonusPercent: 0 }] });

    const attacker = { ...makeParticipant({ id: "a" }), battleData: { ...makeParticipant({ id: "a" }).battleData, attacks: [sword] } };

    const base = makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50, abilities: [counter] });

    const target = { ...base, battleData: { ...base.battleData, attacks: [sword] } };

    const r = processAttack({ attacker, target, attack: sword, d20Roll: 15, damageRolls: [4], allParticipants: [attacker, target], currentRound: 1, battleId: "b1", rng: seq(0) });

    expect(r.attackerUpdated.combatStats.currentHp).toBe(20);
    expect(r.targetUpdated.actionFlags.hasUsedReaction).toBe(false);
  });

  it("bonusPercent множить фізичну шкоду і додає крок «Контратака»", () => {
    const a = makeParticipant({ id: "a" });

    const t = makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50 });

    const input = { attacker: a, target: t, attack: sword, damageRolls: [4], allParticipants: [a, t], attackRoll: { isCritical: false }, currentRound: 1 };

    const plain = computeHitDamage(input);

    const boosted = computeHitDamage({ ...input, bonusPercent: 50 });

    expect(boosted.physicalDamage).toBe(Math.floor(plain.physicalDamage * 1.5));
    expect(boosted.damageSteps).toContainEqual(expect.objectContaining({ label: "Контратака", kind: "multiplier", value: 1.5 }));
  });
});
