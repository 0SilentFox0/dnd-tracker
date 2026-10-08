import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { processAttack } from "@/lib/utils/battle/attack/process";
import type { BattleAttack } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

const raise = resolved({
  id: "raise",
  trigger: { event: "kill", role: "killer" },
  limits: { perRound: 1 },
  effects: [{ kind: "summon", unitId: "skeleton" }],
});

function strike(targetHp: number) {
  const p = makeParticipant({ id: "a", abilities: [raise] });

  const attacker = { ...p, battleData: { ...p.battleData, attacks: [sword] } };

  const target = makeParticipant({ id: "t", side: ParticipantSide.ENEMY, hp: targetHp, maxHp: targetHp });

  return processAttack({ attacker, target, attack: sword, d20Roll: 15, damageRolls: [6], allParticipants: [attacker, target], currentRound: 1, battleId: "b", rng: seq(0.5) });
}

describe("summon on kill trigger", () => {
  it("kill returns a summon request for the killer", () => {
    expect(strike(1).summons).toEqual([{ ownerId: "a", unitId: "skeleton", count: 1 }]);
  });

  it("no kill, no summon", () => {
    expect(strike(50).summons).toEqual([]);
  });
});
