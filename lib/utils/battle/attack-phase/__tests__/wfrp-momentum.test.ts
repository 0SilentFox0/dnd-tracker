import { describe, expect, it } from "vitest";

import { runAttackPhase } from "../run-attack-phase";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { momentumOf, sceneOf, slotOf } from "@/systems/wfrp/rules/__tests__/slot-fixtures";
import { attackOf } from "@/systems/wfrp/rules/__tests__/slot-fixtures";
import { DEFAULT_CHARACTERISTICS } from "@/systems/wfrp/rules/characteristics/keys";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";
import type { SceneMomentum } from "@/systems/wfrp/rules/slots";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Sword", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d6", maxTargets: 2, damageType: "slashing" };

const fighter = (id: string, side: ParticipantSide): BattleParticipant => {
  const p = makeParticipant({ id, side, hp: 40, maxHp: 40 });

  return {
    ...p,
    combatStats: { ...p.combatStats, maxTargets: 2 },
    abilities: { ...p.abilities, system: slotOf({ ...DEFAULT_CHARACTERISTICS, base: { ...DEFAULT_CHARACTERISTICS.base, ws: 40, bs: 40, ag: 40 } }) },
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

const run = (targetIds: string[], strikes: number[], rng: () => number, momentum?: SceneMomentum, damageRolls = targetIds.map(() => 4)) =>
  runAttackPhase({ rules: WFRP_RULES, battle: { initiativeOrder: order(), currentRound: 1, currentTurnIndex: 0 }, data: { attackerId: "a", targetIds, attackRolls: strikes, damageRolls }, battleId: "b", userId: "u", isDM: true, rng, sceneState: momentum && sceneOf(momentum) });

const used = (r: ReturnType<typeof run>) => r.allBattleActions.map((a) => attackOf(a.actionDetails)?.momentumUsed === true);

describe("wfrp server-rolled d100", () => {
  it("rolls the strike on the server when serverRoll is set, ignoring any client value", () => {
    const rng = byCall(0.295, MISS, HIT);

    const r = runAttackPhase({ rules: WFRP_RULES, battle: { initiativeOrder: order(), currentRound: 1, currentTurnIndex: 0 }, data: { attackerId: "a", targetId: "t", serverRoll: true, attackRoll: 99, damageRolls: [4] }, battleId: "b", userId: "u", isDM: true, rng });

    expect(attackOf(r.allBattleActions[0].actionDetails)?.roll).toBe(30);
  });
});

describe("wfrp multi-target damage pool", () => {
  const lost = (r: ReturnType<typeof run>) => ["t", "u"].map((id) => 40 - (r.finalInitiativeOrder.find((p) => p.basicInfo.id === id)?.combatStats.currentHp ?? 0));

  const hits = (r: ReturnType<typeof run>) => r.allBattleActions.filter((a) => a.actionDetails.isHit).length;

  const rng = () => byCall(MISS, MISS, HIT, HIT, 0.5, 0.5, MISS);

  it("a partial hit shares only the hit dice, like d20: one block over two targets", () => {
    const full = run(["t", "u"], [30, 80], rng());

    const asD20 = run(["t", "u"], [30, 80], rng(), undefined, [4]);

    expect(hits(full)).toBe(1);
    expect(lost(full)).toEqual(lost(asD20));
  });

  it("every target hit keeps the whole pool", () => {
    const full = run(["t", "u"], [30, 30], rng());

    expect(hits(full)).toBe(2);
    expect(lost(full)).toEqual(lost(run(["t", "u"], [30, 30], rng(), undefined, [4, 4])));
  });
});

describe("wfrp scene momentum in the attack phase", () => {
  it("a second strike of the same action sees the Momentum won by the first", () => {
    const r = run(["t", "u"], [30, 30], byCall(MISS, MISS, HIT, HIT, 0.5, 0.5, MISS));

    expect(r.allBattleActions.map((a) => a.actionType)).toEqual(["attack", "retaliation", "attack"]);
    expect(used(r)).toEqual([false, false, true]);
    expect(momentumOf(r.sceneState)).toEqual({ ally: true });
  });

  it("starts from the momentum passed in and spends it on the first strike", () => {
    const r = run(["t"], [30], byCall(MISS), { ally: true });

    expect(used(r)[0]).toBe(true);
  });

  it("a won retaliation hands Momentum to the other side and drops the earlier token", () => {
    const r = run(["t"], [30], byCall(MISS, HIT, MISS));

    expect(r.allBattleActions.map((a) => a.actionType)).toEqual(["attack", "retaliation"]);
    expect(momentumOf(r.sceneState)).toEqual({ enemy: true });
  });

  it("a lost strike gives the defending side the Momentum when none is passed in", () => {
    expect(momentumOf(run(["t"], [80], byCall(HIT, HIT, MISS)).sceneState)).toEqual({ enemy: true });
  });
});
