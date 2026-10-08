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

    expect(r.allBattleActions[0].resultText).toContain("недолік: другий d20 = 11 (сервер), обрано 11");
    expect(r.allBattleActions[0].actionDetails).toMatchObject({ chosenD20: 11, secondRoll: { serverRolled: true } });
    expect(r.allBattleActions[1].resultText).not.toContain("другий d20");
  });

  it("single target: an explicit client second roll is respected", () => {
    const r = run([attacker, foe("t1", [hindering])], { targetId: "t1", attackRoll: 17, disadvantageRoll: 2 });

    expect(hits(r)).toEqual([false]);
    expect(r.allBattleActions[0].resultText).toContain("другий d20 = 2, обрано 2");
    expect(r.allBattleActions[0].resultText).not.toContain("(сервер)");
    expect(r.allBattleActions[0].actionDetails).toMatchObject({ chosenD20: 2, secondRoll: { mode: "disadvantage", value: 2, serverRolled: false } });
  });

  it("advantage and disadvantage cancel out", () => {
    const marked = resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "advantageForAttackers" }] }, { id: "m" });

    const r = run([attacker, foe("t1", [hindering, marked])], { targetId: "t1", attackRoll: 17, disadvantageRoll: 2, advantageRoll: 20 });

    expect(hits(r)).toEqual([true]);
  });

  describe("attackHitsAllEnemies", () => {
    const melee: BattleAttack = { id: "m", name: "Клинок", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

    const sweeper = (flag: boolean) => {
      const p = makeParticipant({ id: "a", abilities: flag ? [resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "attackHitsAllEnemies" }] })] : [] });

      return { ...p, battleData: { ...p.battleData, attacks: [melee] } };
    };

    const enemies = () => [foe("t1"), foe("t2"), foe("t3")];

    const lost = (r: ReturnType<typeof run>, id: string) => 50 - (r.finalInitiativeOrder.find((p) => p.basicInfo.id === id)?.combatStats.currentHp ?? 0);

    it("a melee attacker with the flag hits every living enemy for full damage", () => {
      const r = run([sweeper(true), ...enemies()], { targetIds: ["t1", "t2", "t3"], attackRolls: [17, 17, 17], damageRolls: Array(12).fill(4) });

      expect(["t1", "t2", "t3"].map((id) => lost(r, id))).toEqual([lost(r, "t1"), lost(r, "t1"), lost(r, "t1")]);
      expect(lost(r, "t1")).toBeGreaterThanOrEqual(4);
    });

    it("the server expands a partial selection to all enemies", () => {
      const r = run([sweeper(true), ...enemies()], { targetIds: ["t1"], attackRolls: [17], damageRolls: Array(12).fill(4) });

      expect(["t2", "t3"].every((id) => lost(r, id) > 0)).toBe(true);
    });

    it("missing damage dice are rolled by the server, never reduced damage", () => {
      const r = run([sweeper(true), ...enemies()], { targetIds: ["t1"], attackRolls: [17], damageRolls: [4, 4] });

      const losses = ["t1", "t2", "t3"].map((id) => lost(r, id));

      expect(losses.every((l) => l > 0)).toBe(true);
      expect(losses[1]).toBe(losses[2]);
      expect(r.allBattleActions.filter((e) => e.actionType === "attack").slice(1).every((e) => e.resultText.includes("кубики шкоди кинув сервер"))).toBe(true);
    });

    it("without the flag melee is still one target", () => {
      expect(() => run([sweeper(false), ...enemies()], { targetIds: ["t1", "t2", "t3"], attackRolls: [17, 17, 17], damageRolls: [4, 4, 4] })).toThrow(/Забагато цілей/);

      const r = run([sweeper(false), ...enemies()], { targetId: "t1", attackRoll: 17, damageRolls: [4] });

      expect(["t2", "t3"].every((id) => lost(r, id) === 0)).toBe(true);
    });
  });

  it("a consumable advantage effect applies to the first target only and is spent", () => {
    const buffed = {
      ...attacker,
      battleData: {
        ...attacker.battleData,
        activeEffects: [
          { id: "adv", name: "adv", type: "buff", duration: 2, appliedAt: { round: 1, timestamp: new Date(0) }, effects: [], abilityEffects: [{ kind: "flag", flag: "advantage", attackKind: "all" }], consumeOn: "ownAttack" },
        ],
      },
    } as BattleParticipant;

    const r = run([buffed, foe("t1"), foe("t2")], { targetIds: ["t1", "t2"], attackRolls: [17, 17] });

    expect(r.allBattleActions[0].actionDetails.secondRoll).toMatchObject({ mode: "advantage" });
    expect(r.allBattleActions[1].actionDetails.secondRoll).toBeUndefined();
    expect(r.finalInitiativeOrder.find((p) => p.basicInfo.id === "a")?.battleData.activeEffects).toEqual([]);
  });
});

describe("free attack crit on a multi-target attack", () => {
  it("critical effect 6 on the first target leaves the attacker an action", () => {
    const r = runAttackPhase({
      battle: { initiativeOrder: [attacker, foe("t1"), foe("t2")], battleLog: [], currentRound: 1, currentTurnIndex: 0 },
      data: { attackerId: "a", damageRolls: [4, 4], targetIds: ["t1", "t2"], attackRolls: [20, 5] } as never,
      battleId: "b",
      userId: "u",
      isDM: true,
      rng: seq(0.55),
    });

    expect(r.finalInitiativeOrder.find((p) => p.basicInfo.id === "a")?.actionFlags.hasUsedAction).toBe(false);
  });
});

describe("crit effects on the attacker are for the next attack", () => {
  const effectsOf = (r: ReturnType<typeof run>) => r.finalInitiativeOrder.find((p) => p.basicInfo.id === "a")?.battleData.activeEffects ?? [];

  const volley = (critRng: number) =>
    runAttackPhase({
      battle: { initiativeOrder: [attacker, foe("t1"), foe("t2")], battleLog: [], currentRound: 1, currentTurnIndex: 0 },
      data: { attackerId: "a", damageRolls: [4, 4], targetIds: ["t1", "t2"], attackRolls: [20, 15] } as never,
      battleId: "b",
      userId: "u",
      isDM: true,
      rng: seq(critRng, 0.5),
    });

  it("S3 advantage from the crit on target 1 is not used by target 2 and survives the action", () => {
    const r = volley(0.25);

    expect(r.allBattleActions[0].resultText).toContain("Advantage на наступну");
    expect(r.allBattleActions[1].actionDetails.secondRoll).toBeUndefined();
    expect(effectsOf(r).map((e) => e.consumeOn)).toEqual(["ownAttack"]);
  });

  it("S10 combo disadvantage is not applied to target 2 and the extra action stays", () => {
    const r = volley(0.95);

    expect(r.allBattleActions[1].actionDetails.secondRoll).toBeUndefined();
    expect(effectsOf(r).map((e) => e.consumeOn)).toEqual(["ownAttack"]);
    expect(r.finalInitiativeOrder.find((p) => p.basicInfo.id === "a")?.actionFlags.hasUsedAction).toBe(false);
  });
});
