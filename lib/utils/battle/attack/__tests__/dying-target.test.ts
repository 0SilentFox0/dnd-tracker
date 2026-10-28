import { describe, expect, it } from "vitest";

import { AttackType, CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { processAttack } from "@/lib/utils/battle/attack/process";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

const rules = { ...DEFAULT_RULES, deathSaves: { ...DEFAULT_RULES.deathSaves, enabled: true } };

function strike(target: BattleParticipant) {
  const p = makeParticipant({ id: "a", side: ParticipantSide.ENEMY });

  const attacker = { ...p, battleData: { ...p.battleData, attacks: [sword] } };

  return processAttack({ attacker, target, attack: sword, d20Roll: 15, damageRolls: [4], allParticipants: [attacker, target], currentRound: 1, battleId: "b", rng: seq(0.5, 0.5), rules });
}

const downed = (deathSaves?: { successes: number; failures: number; stable: boolean }): BattleParticipant => {
  const t = makeParticipant({ id: "t", hp: 0, maxHp: 20 });

  return { ...t, combatStats: { ...t.combatStats, currentHp: 0, status: CombatStatus.UNCONSCIOUS }, battleData: { ...t.battleData, deathSaves } };
};

describe("атака по герою, що вмирає", () => {
  it("влучання — провал кидка смерті", () => {
    const r = strike(downed({ successes: 0, failures: 0, stable: false }));

    expect(r.success).toBe(true);
    expect(r.targetUpdated.battleData.deathSaves?.failures).toBe(1);
  });

  it("без кидків смерті (HOMM) атака скасовується", () => {
    expect(strike(downed()).success).toBe(false);
  });
});
