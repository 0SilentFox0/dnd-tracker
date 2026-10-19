import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { processAttack } from "@/lib/utils/battle/attack/process";
import { runAttackPhase } from "@/lib/utils/battle/attack-phase/run-attack-phase";
import { applyObstacle } from "@/lib/utils/battle/damage/obstacle";
import type { BattleAttack } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d8", damageType: "slashing" };

const attacker = () => {
  const p = makeParticipant({ id: "a" });

  return { ...p, battleData: { ...p.battleData, attacks: [sword] } };
};

const enemy = (id = "e") => makeParticipant({ id, side: ParticipantSide.ENEMY, hp: 200, maxHp: 200 });

const cursed = resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "disadvantage" }] });

const strike = (opts: { d20: number; rolls: number[]; obstacle?: boolean; disadvantageRoll?: number }) => {
  const target = enemy();

  const a = attacker();

  return processAttack({
    attacker: opts.disadvantageRoll ? { ...a, battleData: { ...a.battleData, resolvedAbilities: [cursed] } } : a,
    target,
    attack: sword,
    d20Roll: opts.d20,
    disadvantageRoll: opts.disadvantageRoll,
    damageRolls: opts.rolls,
    allParticipants: [attacker(), target],
    currentRound: 1,
    battleId: "b",
    obstacle: opts.obstacle,
    rng: seq(0.5),
  });
};

describe("applyObstacle", () => {
  it("половина вниз, мінімум 1 при шкоді ≥ 1, нуль лишається нулем", () => {
    expect(applyObstacle(9)).toBe(4);
    expect(applyObstacle(8)).toBe(4);
    expect(applyObstacle(1)).toBe(1);
    expect(applyObstacle(0)).toBe(0);
  });
});

describe("Перешкода в атаці", () => {
  it("влучання — підсумкова шкода ×0.5, видимий крок і запис у журналі", () => {
    const full = strike({ d20: 15, rolls: [7] });

    const half = strike({ d20: 15, rolls: [7], obstacle: true });

    expect(full.success && half.success).toBe(true);
    expect(half.damage?.finalDamage).toBe(applyObstacle(full.damage?.finalDamage ?? 0));
    expect(half.damage?.finalDamage).toBeLessThan(full.damage?.finalDamage ?? 0);

    const steps = half.battleAction.actionDetails.damageSteps?.e ?? [];

    expect(steps.at(-1)).toMatchObject({ label: "Перешкода", kind: "multiplier", value: 0.5, after: half.damage?.finalDamage });
    expect(half.battleAction.resultText).toContain("перешкода: шкода ×0.5");
    expect(half.battleAction.hpChanges[0].change).toBe(half.damage?.finalDamage);
  });

  it("критичне влучання теж ділиться навпіл", () => {
    const full = strike({ d20: 20, rolls: [8] });

    const half = strike({ d20: 20, rolls: [8], obstacle: true });

    expect(half.attackRoll.isCritical).toBe(true);
    expect(half.damage?.finalDamage).toBe(applyObstacle(full.damage?.finalDamage ?? 0));
  });

  it("мінімум 1, коли без перешкоди шкода ≥ 1", () => {
    const hit = (obstacle: boolean) =>
      processAttack({
        attacker: attacker(),
        target: enemy(),
        attack: sword,
        d20Roll: 19,
        damageRolls: [1],
        allParticipants: [attacker(), enemy()],
        currentRound: 1,
        battleId: "b",
        damageMultiplier: 0.25,
        obstacle,
        rng: seq(0.5),
      });

    expect(hit(false).damage?.finalDamage).toBe(1);
    expect(hit(true).damage?.finalDamage).toBe(1);
  });

  it("промах — перешкода нічого не змінює", () => {
    const r = strike({ d20: 2, rolls: [7], obstacle: true });

    expect(r.success).toBe(false);
    expect(r.battleAction.resultText).not.toContain("перешкода");
  });

  it("недолік і перешкода разом: d20 — менший, шкода — половина", () => {
    const full = strike({ d20: 18, disadvantageRoll: 15, rolls: [6] });

    const both = strike({ d20: 18, disadvantageRoll: 15, rolls: [6], obstacle: true });

    expect(both.attackRoll.chosenD20).toBe(15);
    expect(both.success).toBe(true);
    expect(both.damage?.finalDamage).toBe(applyObstacle(full.damage?.finalDamage ?? 0));

    const miss = strike({ d20: 18, disadvantageRoll: 2, rolls: [6], obstacle: true });

    expect(miss.success).toBe(false);
  });

  it("мультицільова атака: кожне влучання ×0.5", () => {
    const bow: BattleAttack = { id: "bow", name: "Лук", type: AttackType.RANGED, attackBonus: 5, damageDice: "1d8", damageType: "piercing" };

    const archer = (() => {
      const p = attacker();

      return { ...p, battleData: { ...p.battleData, attacks: [bow] }, combatStats: { ...p.combatStats, maxTargets: 2 } };
    })();

    const run = (obstacle: boolean) =>
      runAttackPhase({
        battle: { initiativeOrder: [archer, enemy("e1"), enemy("e2")], battleLog: [], currentRound: 1, currentTurnIndex: 0 },
        data: { attackerId: "a", targetIds: ["e1", "e2"], attackId: "bow", attackRolls: [15, 16], damageRolls: [6, 7], obstacle },
        battleId: "b",
        userId: "u",
        isDM: true,
        rng: seq(0.5),
      });

    const damageOf = (r: ReturnType<typeof run>) => r.allBattleActions.filter((a) => a.actionType === "attack").map((a) => a.hpChanges[0]?.change ?? 0);

    const full = damageOf(run(false));

    expect(damageOf(run(true))).toEqual(full.map(applyObstacle));
  });
});
