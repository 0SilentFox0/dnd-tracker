import { describe, expect, it } from "vitest";

import { AttackType, CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { processAttack } from "@/lib/utils/battle/attack/process";
import { resolveServerAttack } from "@/lib/utils/battle/attack/server-attack";
import type { ActionFlow } from "@/lib/utils/battle/common/action-flow";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";
import type { BattleAttack, BattleParticipant, SceneMomentum } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Sword", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d6", damageType: "slashing" };

const bow: BattleAttack = { ...sword, id: "bw", type: AttackType.RANGED };

const fighter = (id: string, side: ParticipantSide, over: { characteristics?: boolean; position?: { x: number; y: number } } = {}): BattleParticipant => {
  const p = makeParticipant({ id, side, hp: 20, maxHp: 20 });

  const { characteristics = true, position } = over;

  return {
    ...p,
    abilities: { ...p.abilities, ...(characteristics && { characteristics: { ...DEFAULT_CHARACTERISTICS, base: { ...DEFAULT_CHARACTERISTICS.base, ws: 40, bs: 40, ag: 40 } } }) },
    battleData: { ...p.battleData, attacks: [sword, bow], ...(position && { position }) },
  };
};

function strike(roll: number, defenderRoll: number, opts: { attack?: BattleAttack; attacker?: BattleParticipant; target?: BattleParticipant; others?: BattleParticipant[]; rules?: typeof WFRP_RULES; momentum?: SceneMomentum } = {}) {
  const attacker = opts.attacker ?? fighter("a", ParticipantSide.ALLY);

  const target = opts.target ?? fighter("t", ParticipantSide.ENEMY);

  const rng = seq((defenderRoll - 0.5) / 100);

  return processAttack({
    attacker,
    target,
    attack: opts.attack ?? sword,
    d20Roll: roll,
    damageRolls: [4],
    allParticipants: [attacker, target, ...(opts.others ?? [])],
    currentRound: 1,
    battleId: "b",
    rng,
    rules: opts.rules ?? WFRP_RULES,
    momentum: opts.momentum,
  });
}

describe("WFRP percentile attack", () => {
  it("opposed hit: attacker succeeds, defender fails", () => {
    const r = strike(30, 80);

    expect(r.success).toBe(true);
    expect(r.attackRoll.percentile).toMatchObject({ roll: 30, target: 40, sl: 1, netSl: 5, defender: { roll: 80 } });
    expect(r.battleAction.actionDetails.percentile?.location).toBe("head");
  });

  it("miss when the attacker fails", () => {
    const r = strike(70, 10);

    expect(r.success).toBe(false);
    expect(r.attackRoll.isHit).toBe(false);
  });

  it("natural 96+ fails even with a huge target", () => {
    const attacker = fighter("a", ParticipantSide.ALLY);

    const strong = { ...attacker, abilities: { ...attacker.abilities, characteristics: { ...DEFAULT_CHARACTERISTICS, base: { ...DEFAULT_CHARACTERISTICS.base, ws: 100 } } } };

    expect(strike(97, 99, { attacker: strong }).success).toBe(false);
  });

  it("tie goes to the attacker", () => {
    const r = strike(30, 30);

    expect(r.attackRoll.percentile?.netSl).toBe(0);
    expect(r.success).toBe(true);
  });

  it("higher defender SL wins", () => {
    expect(strike(38, 5).success).toBe(false);
  });

  it("ranged: simple BS test with no defender", () => {
    const r = strike(20, 99, { attack: bow });

    expect(r.success).toBe(true);
    expect(r.attackRoll.percentile?.defender).toBeUndefined();
  });

  it("doubles on a hit are critical, on a miss they only log", () => {
    const hit = strike(22, 90);

    expect(hit.attackRoll.isCritical).toBe(true);

    const miss = strike(77, 10);

    expect(miss.success).toBe(false);
    expect(miss.attackRoll.isCritical).toBe(false);
    expect(miss.attackRoll.isCriticalFail).toBe(false);
    expect(miss.criticalEffectApplied).toBeUndefined();
    expect(JSON.stringify(miss.battleAction)).toContain("battleLog.percentile.doublesMiss");
  });

  it("winner gains Momentum for the side, spending adds an SL", () => {
    expect(strike(30, 80).momentum).toEqual({ ally: true });

    const spent = strike(30, 80, { momentum: { ally: true } });

    expect(spent.attackRoll.percentile).toMatchObject({ sl: 2, momentumUsed: true });
    expect(spent.momentum).toEqual({ ally: true });

    expect(strike(70, 10, { momentum: { ally: true } }).momentum).toEqual({ enemy: true });
  });

  it("the defender's Momentum is spent when it applies and the loser side never keeps one", () => {
    const won = strike(30, 80, { momentum: { enemy: true } });

    expect(won.attackRoll.percentile?.defender?.sl).toBe((strike(30, 80).attackRoll.percentile?.defender?.sl ?? 0) + 1);
    expect(won.momentum).toEqual({ ally: true });

    expect(strike(30, 80, { momentum: { ally: true, enemy: true } }).momentum).toEqual({ ally: true });

    const defended = strike(70, 10, { momentum: { enemy: true } });

    expect(defended.momentum).toEqual({ enemy: true });
  });

  it("server attacks read and write flow.momentum", () => {
    const attacker = fighter("a", ParticipantSide.ENEMY);

    const target = fighter("t", ParticipantSide.ALLY);

    const flow = (momentum: SceneMomentum): ActionFlow => ({ ps: [attacker, target], messages: [], summons: [], ctx: { round: 1, rng: seq(0.1), rules: WFRP_RULES }, momentum });

    const input = (f: ActionFlow) => ({ flow: f, attackerId: "a", targetId: "t", attack: sword, currentRound: 1, battleId: "b", rng: f.ctx.rng, label: "retaliation" as const });

    const f1 = flow({});

    resolveServerAttack(input(f1));

    expect(f1.momentum).toEqual({ enemy: true });

    const f2 = flow({ enemy: true });

    const r = resolveServerAttack(input(f2));

    expect(r.battleAction.actionDetails.percentile?.momentumUsed).toBe(true);
    expect(f2.momentum).toEqual({ enemy: true });
  });

  it("outnumbering adds a bonus to the attacker target", () => {
    const cell = (x: number, y: number) => ({ x, y });

    const attacker = fighter("a", ParticipantSide.ALLY, { position: cell(0, 0) });

    const target = fighter("t", ParticipantSide.ENEMY, { position: cell(1, 0) });

    const friend = fighter("f", ParticipantSide.ALLY, { position: cell(1, 1) });

    expect(strike(30, 80, { attacker, target }).attackRoll.percentile?.target).toBe(40);
    expect(strike(30, 80, { attacker, target, others: [friend] }).attackRoll.percentile?.target).toBe(50);
  });

  it("an unconscious target aborts without crashing", () => {
    const target = fighter("t", ParticipantSide.ENEMY);

    const down = { ...target, combatStats: { ...target.combatStats, currentHp: 0, status: CombatStatus.UNCONSCIOUS } };

    const r = strike(30, 80, { target: down });

    expect(r.success).toBe(false);
    expect(r.attackRoll.percentile).toBeUndefined();
  });

  it("missing characteristics fall back to defaults without NaN", () => {
    const r = strike(25, 90, { attacker: fighter("a", ParticipantSide.ALLY, { characteristics: false }), target: fighter("t", ParticipantSide.ENEMY, { characteristics: false }) });

    expect(r.attackRoll.percentile?.target).toBe(30);
    expect(Number.isNaN(r.attackRoll.percentile?.netSl)).toBe(false);
  });

  it("rules without combat hooks use the d20 path", () => {
    const r = strike(15, 50, { rules: DEFAULT_RULES as typeof WFRP_RULES });

    expect(r.attackRoll.percentile).toBeUndefined();
    expect(r.attackRoll.chosenD20).toBe(15);
  });
});
