import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { processAttack } from "@/lib/utils/battle/attack/process";
import type { BattleAttack } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

const strikeWithCrit = (critRng: number) => {
  const p = makeParticipant({ id: "a" });

  const attacker = { ...p, battleData: { ...p.battleData, attacks: [sword] } };

  const target = makeParticipant({ id: "t", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50 });

  return processAttack({ attacker, target, attack: sword, d20Roll: 20, damageRolls: [4], allParticipants: [attacker, target], currentRound: 1, battleId: "b", rng: seq(critRng, 0.5) });
};

describe("effects created by a crit outlive their own attack", () => {
  it("S3 advantage stays on the attacker", () => {
    const r = strikeWithCrit(0.25);

    expect(r.attackerUpdated.battleData.activeEffects.map((e) => e.consumeOn)).toEqual(["ownAttack"]);
  });

  it("S9 mark stays on the target", () => {
    const r = strikeWithCrit(0.85);

    expect(r.targetUpdated.battleData.activeEffects.map((e) => e.consumeOn)).toEqual(["attackAgainst"]);
  });
});
