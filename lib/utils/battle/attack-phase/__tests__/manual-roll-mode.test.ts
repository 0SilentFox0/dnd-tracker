import { describe, expect, it } from "vitest";

import { type AttackPhaseInput, runAttackPhase } from "../run-attack-phase";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { predictAttack } from "@/lib/utils/battle/attack";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const bow: BattleAttack = { id: "b", name: "Лук", type: AttackType.RANGED, attackBonus: 5, damageDice: "1d6", damageType: "piercing" };

const attacker = (() => {
  const p = makeParticipant({ id: "a" });

  return { ...p, combatStats: { ...p.combatStats, maxTargets: 2 }, battleData: { ...p.battleData, attacks: [bow] } };
})();

const hindering = resolved({ name: "Туман", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "disadvantageForAttackers" }] });

const exposed = resolved({ name: "Мітка мисливця", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "advantageForAttackers" }] }, { id: "m" });

const foe = (id: string, abilities: ReturnType<typeof resolved>[] = []) => makeParticipant({ id, side: ParticipantSide.ENEMY, abilities, hp: 50, maxHp: 50 });

const run = (order: BattleParticipant[], data: Partial<AttackPhaseInput["data"]>) =>
  runAttackPhase({ battle: { initiativeOrder: order, battleLog: [], currentRound: 1, currentTurnIndex: 0 }, data: { attackerId: "a", damageRolls: [4, 4], ...data }, battleId: "b", userId: "u", isDM: true, rng: seq(0.5) });

const chosen = (r: ReturnType<typeof run>, i = 0) => r.allBattleActions.filter((e) => e.actionType === "attack")[i].actionDetails as { chosenD20?: number; secondRoll?: { mode: string; value: number; serverRolled: boolean } };

describe("manual advantage / disadvantage", () => {
  it("manual advantage without abilities takes the higher die", () => {
    const r = run([attacker, foe("t")], { targetId: "t", attackRoll: 3, advantageRoll: 17, rollMode: "advantage" });

    expect(chosen(r)).toMatchObject({ chosenD20: 17, secondRoll: { mode: "advantage", value: 17, serverRolled: false } });
  });

  it("manual disadvantage without abilities takes the lower die", () => {
    const r = run([attacker, foe("t")], { targetId: "t", attackRoll: 17, disadvantageRoll: 3, rollMode: "disadvantage" });

    expect(chosen(r)).toMatchObject({ chosenD20: 3, secondRoll: { mode: "disadvantage", value: 3 } });
  });

  it("manual mode without a second die: the server rolls it", () => {
    const r = run([attacker, foe("t")], { targetId: "t", attackRoll: 3, rollMode: "advantage" });

    expect(chosen(r)).toMatchObject({ chosenD20: 11, secondRoll: { mode: "advantage", value: 11, serverRolled: true } });
  });

  it("no rollMode keeps the old behaviour: a stray second die is ignored", () => {
    const r = run([attacker, foe("t")], { targetId: "t", attackRoll: 3, advantageRoll: 17 });

    expect(chosen(r).secondRoll).toBeUndefined();
  });

  it("an ability-driven mode wins over the manual choice", () => {
    const r = run([attacker, foe("t", [hindering])], { targetId: "t", attackRoll: 17, advantageRoll: 3, rollMode: "advantage" });

    expect(chosen(r)).toMatchObject({ chosenD20: 3, secondRoll: { mode: "disadvantage" } });
  });

  it("advantage and disadvantage from abilities cancel out, the manual choice is ignored", () => {
    const r = run([attacker, foe("t", [hindering, exposed])], { targetId: "t", attackRoll: 17, disadvantageRoll: 3, rollMode: "disadvantage" });

    expect(chosen(r).secondRoll).toBeUndefined();
  });

  it("volley: the manual mode applies per strike unless that target forces its own", () => {
    const r = run([attacker, foe("t1", [hindering]), foe("t2")], { targetIds: ["t1", "t2"], attackRolls: [17, 4], secondRolls: [3, 15], rollMode: "advantage" });

    expect(chosen(r, 0)).toMatchObject({ chosenD20: 3, secondRoll: { mode: "disadvantage" } });
    expect(chosen(r, 1)).toMatchObject({ chosenD20: 15, secondRoll: { mode: "advantage" } });
  });

  it("volley: a strike without a second die (null) uses a single d20", () => {
    const r = run([attacker, foe("t1", [hindering, exposed]), foe("t2")], { targetIds: ["t1", "t2"], attackRolls: [17, 4], secondRolls: [null, 15], rollMode: "advantage" });

    expect(chosen(r, 0).secondRoll).toBeUndefined();
    expect(chosen(r, 1).chosenD20).toBe(15);
  });
});

describe("predictAttack: forced mode and its reasons", () => {
  it("no abilities → not forced", () => {
    expect(predictAttack(attacker, foe("t"), bow, [attacker, foe("t")])).toMatchObject({ mode: "normal", forced: false });
  });

  it("an ability → forced with the ability name as the reason", () => {
    const t = foe("t", [exposed]);

    expect(predictAttack(attacker, t, bow, [attacker, t])).toMatchObject({ mode: "advantage", forced: true, reasons: { advantage: ["Мітка мисливця"], disadvantage: [] } });
  });

  it("both cancel → forced normal", () => {
    const t = foe("t", [exposed, hindering]);

    expect(predictAttack(attacker, t, bow, [attacker, t])).toMatchObject({ mode: "normal", forced: true });
  });
});
