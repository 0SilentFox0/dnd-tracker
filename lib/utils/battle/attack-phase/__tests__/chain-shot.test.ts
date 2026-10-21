import { describe, expect, it } from "vitest";

import { runAttackPhase } from "../run-attack-phase";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const bow: BattleAttack = { id: "b", name: "Ланцюговий постріл", type: AttackType.RANGED, attackBonus: 30, damageDice: "1d6", damageType: "necrotic" };

const chain = resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "chainShot", jumps: 2, percent: 50 }] });

const demoness = placed("d", { side: ParticipantSide.ALLY, at: { x: 0, y: 0 }, attacks: [bow], abilities: [chain] });

const foes = [placed("t", { at: { x: 5, y: 5 }, hp: 100 }), placed("n1", { at: { x: 6, y: 6 }, hp: 100 }), placed("n2", { at: { x: 8, y: 6 }, hp: 100 }), placed("n3", { at: { x: 9, y: 9 }, hp: 100 })];

const run = (order: BattleParticipant[], d20: number, rng = seq(0.9)) =>
  runAttackPhase({ battle: { initiativeOrder: order, currentRound: 1, currentTurnIndex: 0 }, data: { attackerId: "d", targetIds: ["t"], attackRoll: d20, damageRolls: [6] }, battleId: "b", userId: "u", isDM: true, rng, map: testMap(20) });

const strikes = (r: ReturnType<typeof run>) => r.allBattleActions.filter((e) => e.actionType === "attack");

describe("chain shot", () => {
  it("влучання — два стрибки на найближчих, chainFromId — попередня ціль", () => {
    const s = strikes(run([demoness, ...foes], 15));

    expect(s.map((e) => e.targets[0].participantId)).toEqual(["t", "n1", "n2"]);
    expect(s.map((e) => e.actionDetails.chainFromId)).toEqual([undefined, "t", "n1"]);
  });

  it("шкода падає 100 → 50 → 25 %", () => {
    const s = strikes(run([demoness, ...foes], 15, seq(0.99)));

    const dmg = s.map((e) => e.hpChanges.find((h) => h.participantId === e.targets[0].participantId)?.change ?? 0);

    expect(dmg[1]).toBeLessThanOrEqual(Math.ceil(dmg[0] / 2));
    expect(dmg[2]).toBeLessThanOrEqual(Math.ceil(dmg[1] / 2));
  });

  it("промах першого пострілу — без стрибків", () => {
    expect(strikes(run([demoness, ...foes], 1))).toHaveLength(1);
  });

  it("гравець не може обрати дві цілі", () => {
    expect(() =>
      runAttackPhase({ battle: { initiativeOrder: [demoness, ...foes], currentRound: 1, currentTurnIndex: 0 }, data: { attackerId: "d", targetIds: ["t", "n1"], attackRolls: [15, 15], damageRolls: [6, 6] }, battleId: "b", userId: "u", isDM: true, rng: seq(0.9), map: testMap(20) }),
    ).toThrow("Забагато цілей. Максимум: 1");
  });

  it("стрибки не отримують штраф перешкоди", () => {
    const blocker = placed("wall", { side: ParticipantSide.ALLY, at: { x: 7, y: 6 } });

    const s = strikes(run([demoness, ...foes, blocker], 15));

    expect(s.slice(1).some((e) => e.resultText.includes("перешкода"))).toBe(false);
  });
});
