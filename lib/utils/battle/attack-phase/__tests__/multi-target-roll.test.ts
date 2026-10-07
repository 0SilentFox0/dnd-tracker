import { describe, expect, it } from "vitest";

import { runAttackPhase } from "../run-attack-phase";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Меч", type: AttackType.RANGED, attackBonus: 5, damageDice: "1d6", damageType: "piercing" };

const attacker = (() => {
  const p = makeParticipant({ id: "a" });

  return { ...p, combatStats: { ...p.combatStats, maxTargets: 2 }, battleData: { ...p.battleData, attacks: [sword] } };
})();

const hindering = resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "disadvantageForAttackers" }] });

const foe = (id: string, abilities: ReturnType<typeof resolved>[] = []) => makeParticipant({ id, side: ParticipantSide.ENEMY, abilities, hp: 50, maxHp: 50 });

const run = (order: BattleParticipant[], data: Record<string, unknown>) =>
  runAttackPhase({ battle: { initiativeOrder: order, battleLog: [], currentRound: 1, currentTurnIndex: 0 }, data: { attackerId: "a", damageRolls: [4, 4], ...data } as never, battleId: "b", userId: "u", isDM: true, rng: seq(0.5) });

const hits = (r: ReturnType<typeof run>) => r.allBattleActions.filter((e) => e.actionType === "attack").map((e) => e.actionDetails.isHit);

describe("multi-target advantage resolution", () => {
  it("disadvantage on one target applies exactly once, the other target is untouched", () => {
    const r = run([attacker, foe("t1", [hindering]), foe("t2")], { targetIds: ["t1", "t2"], attackRolls: [17, 17], secondRolls: [2, 2] });

    expect(hits(r)).toEqual([false, true]);
  });

  it("without client second rolls the server rolls once per affected target", () => {
    const r = run([attacker, foe("t1", [hindering]), foe("t2")], { targetIds: ["t1", "t2"], attackRolls: [17, 17] });

    expect(r.allBattleActions[0].resultText).toContain("недолік: другий d20 = 11");
    expect(r.allBattleActions[1].resultText).not.toContain("другий d20");
  });

  it("single target: an explicit client second roll is respected", () => {
    const r = run([attacker, foe("t1", [hindering])], { targetId: "t1", attackRoll: 17, disadvantageRoll: 2 });

    expect(hits(r)).toEqual([false]);
    expect(r.allBattleActions[0].resultText).not.toContain("другий d20");
  });

  it("advantage and disadvantage cancel out", () => {
    const marked = resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "advantageForAttackers" }] }, { id: "m" });

    const r = run([attacker, foe("t1", [hindering, marked])], { targetId: "t1", attackRoll: 17, disadvantageRoll: 2, advantageRoll: 20 });

    expect(hits(r)).toEqual([true]);
  });
});
