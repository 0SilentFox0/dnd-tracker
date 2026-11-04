import { describe, expect, it } from "vitest";

import { runAttackPhase } from "../run-attack-phase";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";
import type { BattleAttack, BattleParticipant, SceneMomentum } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Sword", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d6", maxTargets: 2, damageType: "slashing" };

const fighter = (id: string, side: ParticipantSide): BattleParticipant => {
  const p = makeParticipant({ id, side, hp: 40, maxHp: 40 });

  return {
    ...p,
    combatStats: { ...p.combatStats, maxTargets: 2 },
    abilities: { ...p.abilities, characteristics: { ...DEFAULT_CHARACTERISTICS, base: { ...DEFAULT_CHARACTERISTICS.base, ws: 40, bs: 40, ag: 40 } } },
    battleData: { ...p.battleData, attacks: [sword] },
  };
};

const byCall = (...values: number[]) => {
  let i = 0;

  return () => values[i++] ?? 0.5;
};

const HIT = 0.295;

const MISS = 0.795;

const order = () => [fighter("a", ParticipantSide.ALLY), fighter("t", ParticipantSide.ENEMY), fighter("u", ParticipantSide.ENEMY)];

const run = (targetIds: string[], rng: () => number, momentum?: SceneMomentum) =>
  runAttackPhase({ rules: WFRP_RULES, battle: { initiativeOrder: order(), currentRound: 1, currentTurnIndex: 0 }, data: { attackerId: "a", targetIds, attackRolls: targetIds.map(() => 10), damageRolls: targetIds.map(() => 4) }, battleId: "b", userId: "u", isDM: true, rng, momentum });

const used = (r: ReturnType<typeof run>) => r.allBattleActions.map((a) => a.actionDetails.percentile?.momentumUsed === true);

describe("wfrp scene momentum in the attack phase", () => {
  it("a second strike of the same action sees the Momentum won by the first", () => {
    const r = run(["t", "u"], byCall(HIT, MISS, MISS, HIT, HIT, 0.5, 0.5, MISS));

    expect(r.allBattleActions.map((a) => a.actionType)).toEqual(["attack", "retaliation", "attack"]);
    expect(used(r)).toEqual([false, false, true]);
    expect(r.momentum).toEqual({ ally: true });
  });

  it("starts from the momentum passed in and spends it on the first strike", () => {
    const r = run(["t"], byCall(HIT, MISS), { ally: true });

    expect(used(r)[0]).toBe(true);
  });

  it("a won retaliation hands Momentum to the other side and drops the earlier token", () => {
    const r = run(["t"], byCall(HIT, MISS, HIT, MISS));

    expect(r.allBattleActions.map((a) => a.actionType)).toEqual(["attack", "retaliation"]);
    expect(r.momentum).toEqual({ enemy: true });
  });

  it("a lost strike gives the defending side the Momentum when none is passed in", () => {
    expect(run(["t"], byCall(MISS, HIT, HIT, MISS)).momentum).toEqual({ enemy: true });
  });
});
