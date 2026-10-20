import { describe, expect, it } from "vitest";

import { runAttackPhase } from "../run-attack-phase";

import { AttackType, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const attackOf = (damageDice: string, type: AttackType = AttackType.MELEE): BattleAttack => ({ id: "w", name: "Зброя", type, attackBonus: 5, damageDice, damageType: "slashing" });

const attackerWith = (attack: BattleAttack, maxTargets = 1) => {
  const p = makeParticipant({ id: "a" });

  return { ...p, basicInfo: { ...p.basicInfo, sourceType: ParticipantSourceType.UNIT }, combatStats: { ...p.combatStats, maxTargets }, battleData: { ...p.battleData, attacks: [attack] } };
};

const foe = (id: string) => makeParticipant({ id, side: ParticipantSide.ENEMY, hp: 80, maxHp: 80 });

const run = (order: BattleParticipant[], data: Record<string, unknown>) => runAttackPhase({ battle: { initiativeOrder: order, currentRound: 1, currentTurnIndex: 0 }, data: { attackerId: "a", ...data } as never, battleId: "b", userId: "u", isDM: true, rng: seq(0.5) });

const damageGroup = (action: { actionDetails: { diceRolls?: Array<{ kind: string; dice: unknown[] }> } }) => action.actionDetails.diceRolls?.find((g) => g.kind === "damage");

describe("attack dice record", () => {
  it("залп на 2 цілі: кубики шкоди другої цілі докинув сервер — server, першої — ні", () => {
    const r = run([attackerWith(attackOf("1d6", AttackType.RANGED), 2), foe("t1"), foe("t2")], { targetIds: ["t1", "t2"], attackRolls: [18, 18], damageRolls: [4] });

    const [a, b] = r.allBattleActions.filter((e) => e.actionType === "attack");

    expect(damageGroup(a)?.dice).toEqual([{ sides: 6, value: 4 }]);
    expect(damageGroup(b)?.dice).toEqual([{ sides: 6, value: expect.any(Number), server: true }]);
  });

  it("юніт «1d8+1d6», кубики докинув сервер: кожне значення в межах свого кубика", () => {
    const r = run([attackerWith(attackOf("1d8+1d6", AttackType.RANGED), 2), foe("t1"), foe("t2")], { targetIds: ["t1", "t2"], attackRolls: [18, 18], damageRolls: [] });

    for (const a of r.allBattleActions.filter((e) => e.actionType === "attack")) {
      const dice = (damageGroup(a)?.dice ?? []) as Array<{ sides: number; value: number }>;

      expect(dice.map((d) => d.sides)).toEqual([6, 8]);
      dice.forEach((d) => expect(d.value >= 1 && d.value <= d.sides).toBe(true));
    }
  });

  it("вільний текст «2d6 + STR» — група шкоди з d6", () => {
    const r = run([attackerWith(attackOf("2d6 + STR")), foe("t1")], { targetId: "t1", attackRoll: 18, damageRolls: [3, 5] });

    expect(damageGroup(r.allBattleActions[0])?.dice).toEqual([{ sides: 6, value: 3 }, { sides: 6, value: 5 }]);
  });
});
