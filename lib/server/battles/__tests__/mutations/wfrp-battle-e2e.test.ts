import { describe, expect, it, vi } from "vitest";

import { context, goblin, hero } from "./fixtures";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { AttackType, CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { attackBodySchema } from "@/lib/schemas/battles";
import { type AttackBody, attackMutation, createAttackMutation } from "@/lib/server/battles/mutations/attack/attack-mutation";
import { conditionTestMutation } from "@/lib/server/battles/mutations/condition-test/condition-test-mutation";
import { initiativeRollMutation } from "@/lib/server/battles/mutations/initiative/initiative-roll-mutation";
import { createRollbackMutation } from "@/lib/server/battles/mutations/rollback/rollback-mutation";
import { makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import type { CritResume } from "@/lib/utils/battle/crit-choice/types";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { diffParticipants, splitParticipant } from "@/lib/utils/battle/store";
import { buildSnapshotState } from "@/lib/utils/battle/store/snapshot-state";
import { DEFAULT_CHARACTERISTICS, ruleSystemOf } from "@/lib/utils/rules/systems";
import { wfrpAbilitiesOf } from "@/systems/wfrp/rules/combat/participant";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Sword", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d6", damageType: "slashing" };

const fighter = (id: string, side: ParticipantSide): BattleParticipant => {
  const p = makeParticipant({ id, side, hp: 20, maxHp: 20 });

  const characteristics = { ...DEFAULT_CHARACTERISTICS, base: { ...DEFAULT_CHARACTERISTICS.base, ws: 40, bs: 40, ag: 40, s: 30, t: 30 } };

  return {
    ...p,
    basicInfo: { ...p.basicInfo, battleId: "b1", controlledBy: "dm" },
    abilities: { ...p.abilities, ...wfrpAbilitiesOf(characteristics, { ap: { head: 0, arm: 0, body: 0, leg: 0 } }) },
    battleData: { ...p.battleData, attacks: [sword] },
  };
};

const firstThen = (first: number, rest: number) => {
  let calls = 0;

  return () => (calls++ === 0 ? first : rest);
};

const hp = (c: BattleMutationContext, id: string) => c.participants.find((p) => p.basicInfo.id === id)!.combatStats.currentHp;

describe("wfrp battle end to end (engine)", () => {
  it("initiative, repeated hits, target drops to 0 Wounds and goes unconscious with a crit", async () => {
    const base = context({ participants: [fighter("a", ParticipantSide.ALLY), fighter("t", ParticipantSide.ENEMY)], isDM: true });

    let ctx: BattleMutationContext = { ...base, meta: { ...base.meta, rules: WFRP_RULES } };

    const rolled = initiativeRollMutation(ctx, {});

    expect(rolled.participants).toHaveLength(2);
    ctx = { ...ctx, participants: [...rolled.participants].sort((x, y) => (x.basicInfo.id === "a" ? -1 : y.basicInfo.id === "a" ? 1 : 0)), scene: { ...ctx.scene, turnIndex: 0 } };

    const hit = (attackerId: string, targetId: string, roll: number): AttackBody => attackBodySchema.parse({ attackerId, targetId, attackId: "sw", d20Roll: roll, damageRolls: [4], endTurn: true });

    const rolls: number[] = [];

    let lastEvents = "";

    const step = async (attackerId: string, targetId: string, attackerRoll = 30) => {
      const out = await attackMutation({ ...ctx, rng: () => 0.795 }, hit(attackerId, targetId, attackerRoll));

      rolls.push(out.events.length);
      lastEvents = JSON.stringify(out.events);
      ctx = { ...ctx, participants: out.participants, pending: out.pending ?? ctx.pending, scene: { ...ctx.scene, ...out.scene } };
    };

    await step("a", "t");
    expect(hp(ctx, "t")).toBe(11);

    await step("t", "a", 70);
    expect(hp(ctx, "a")).toBe(20);

    await step("a", "t");
    expect(hp(ctx, "t")).toBeLessThan(11);

    await step("t", "a", 70);
    await step("a", "t");

    const target = ctx.participants.find((p) => p.basicInfo.id === "t")!;

    expect(target.combatStats).toMatchObject({ currentHp: 0, status: CombatStatus.UNCONSCIOUS });
    expect((lastEvents.match(/battleWfrp\.log\.crit(?:Hit|Wound)/g) ?? []).length).toBe(1);
    expect(rolls.every((n) => n > 0)).toBe(true);
  });

  it("takes the client d100 and ignores it in server-roll mode", async () => {
    const base = context({ participants: [fighter("a", ParticipantSide.ALLY), fighter("t", ParticipantSide.ENEMY)], isDM: true });

    const ctx: BattleMutationContext = { ...base, meta: { ...base.meta, rules: WFRP_RULES }, scene: { ...base.scene, turnIndex: 0 } };

    const body = attackBodySchema.parse({ attackerId: "a", targetId: "t", attackId: "sw", d20Roll: 100, damageRolls: [4] });

    const client = await attackMutation({ ...ctx, rng: seq(0.5, 0.5) }, body);

    expect(client.events.length).toBeGreaterThan(0);

    const server = await createAttackMutation(undefined, { serverRolls: true })({ ...ctx, rng: seq(0.995, 0.01) }, attackBodySchema.parse({ ...body, d20Roll: 1 }));

    expect(server.participants.find((p) => p.basicInfo.id === "t")!.combatStats.currentHp).toBe(20);
  });

  it("serverRoll: the body needs no client roll and the server rolls the d100", async () => {
    const base = context({ participants: [fighter("a", ParticipantSide.ALLY), fighter("t", ParticipantSide.ENEMY)], isDM: true });

    const ctx: BattleMutationContext = { ...base, meta: { ...base.meta, rules: WFRP_RULES }, scene: { ...base.scene, turnIndex: 0 } };

    const body = attackBodySchema.parse({ attackerId: "a", targetId: "t", attackId: "sw", serverRoll: true, damageRolls: [4] });

    const out = await attackMutation({ ...ctx, rng: firstThen(0.295, 0.795) }, body);

    expect(out.events[0]).toBeDefined();
    expect(hp({ ...ctx, participants: out.participants }, "t")).toBeLessThan(20);
  });

  it("crit applies Bleeding, it ticks at the bearer's turn start and an Endurance test removes it", async () => {
    const base = context({ participants: [fighter("a", ParticipantSide.ALLY), fighter("t", ParticipantSide.ENEMY)], isDM: true });

    const ctx: BattleMutationContext = { ...base, meta: { ...base.meta, rules: WFRP_RULES }, scene: { ...base.scene, turnIndex: 0 } };

    const conditions = ruleSystemOf(WFRP_RULES).conditions!;

    const strike = (endTurn: boolean) => attackMutation({ ...ctx, rng: () => 0.3 }, attackBodySchema.parse({ attackerId: "a", targetId: "t", attackId: "sw", d20Roll: 22, damageRolls: [4], endTurn }));

    const out = await strike(true);

    const noTick = await strike(false);

    const target = out.participants.find((p) => p.basicInfo.id === "t")!;

    expect(conditions.list(target)).toContainEqual(expect.objectContaining({ key: "bleeding", level: 1 }));
    expect(out.scene?.turnIndex).toBe(1);
    expect(hp({ ...ctx, participants: noTick.participants }, "t") - hp({ ...ctx, participants: out.participants }, "t")).toBe(1);
    expect(hp({ ...ctx, participants: out.participants }, "t")).toBe(12);
    expect(JSON.stringify(out.events)).toContain("battleWfrp.log.tick.bleeding");

    const afterTurn: BattleMutationContext = { ...ctx, participants: out.participants, scene: { ...ctx.scene, ...out.scene } };

    const tested = conditionTestMutation(afterTurn, { participantId: "t", condition: "bleeding", roll: 10 });

    const healed = tested.participants.find((p) => p.basicInfo.id === "t")!;

    expect(conditions.list(healed)).toEqual([]);
    expect(healed.battleData.conditionTests).toEqual(["bleeding"]);
    expect(() => conditionTestMutation({ ...afterTurn, participants: tested.participants }, { participantId: "t", condition: "bleeding", roll: 10 })).toThrow(API_ERRORS.CONDITION_TEST_UNAVAILABLE);
  });

  describe("scene momentum", () => {
    const wfrpCtx = (over: Partial<BattleMutationContext["scene"]> = {}, metaOver: Partial<BattleMutationContext["meta"]> = {}): BattleMutationContext => {
      const base = context({ participants: [fighter("a", ParticipantSide.ALLY), fighter("t", ParticipantSide.ENEMY)], isDM: true });

      return { ...base, meta: { ...base.meta, rules: WFRP_RULES, ...metaOver }, scene: { ...base.scene, turnIndex: 0, ...over } };
    };

    const body = (over: Record<string, unknown> = {}) => attackBodySchema.parse({ attackerId: "a", targetId: "t", attackId: "sw", d20Roll: 30, damageRolls: [4], ...over });

    it("a won attack writes the side token to the scene, the next attack of that side spends it", async () => {
      const won = await attackMutation({ ...wfrpCtx(), rng: firstThen(0.295, 0.795) }, body());

      expect(won.scene?.momentum).toEqual({ ally: true });

      const next = await attackMutation({ ...wfrpCtx({ momentum: { ally: true } }), rng: firstThen(0.295, 0.795) }, body());

      expect(next.events.length).toBeGreaterThan(0);
      expect(next.scene?.momentum).toBeUndefined();
    });

    it("a lost attack hands the token to the defender", async () => {
      const lost = await attackMutation({ ...wfrpCtx({ momentum: { ally: true } }), rng: firstThen(0.795, 0.295) }, body({ endTurn: true, d20Roll: 80 }));

      expect(lost.scene?.momentum).toEqual({ enemy: true });
      expect(lost.scene?.turnIndex).toBeDefined();
    });

    it("player attack wins the token, the enemy attack takes it, rollback to the snapshot restores {ally:true}", async () => {
      const start = wfrpCtx();

      const won = await attackMutation({ ...start, rng: firstThen(0.295, 0.795) }, body());

      expect(won.scene?.momentum).toEqual({ ally: true });

      const afterWin = { ...start, participants: won.participants, scene: { ...start.scene, ...won.scene } };

      const enemyTurn = { ...afterWin, scene: { ...afterWin.scene, turnIndex: 1 } };

      const stolen = await attackMutation({ ...enemyTurn, rng: firstThen(0.295, 0.795) }, body({ attackerId: "t", targetId: "a" }));

      expect(stolen.scene?.momentum).toEqual({ enemy: true });

      const parts = afterWin.participants.map((p, i) => splitParticipant(p, { orderIndex: i, isPending: false }));

      const snapshot = { seq: 4, state: buildSnapshotState({ ...afterWin.scene, status: "active" }, parts, diffParticipants(parts, parts)) };

      const now = { ...enemyTurn, participants: stolen.participants, scene: { ...enemyTurn.scene, ...stolen.scene } };

      const restored = await createRollbackMutation(vi.fn(async () => [snapshot]), vi.fn(async () => true))(now, { actionIndex: 5 });

      expect(restored.scene?.momentum).toEqual({ ally: true });
    });

    const swordHero = { ...hero, battleData: { ...hero.battleData, attacks: [{ id: "sword", name: "Sword", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d8", damageType: "slashing" } as BattleAttack] } };

    const d20Body = (roll: number) => attackBodySchema.parse({ attackerId: "hero", targetId: "gob", attackId: "sword", d20Roll: roll, damageRolls: [4] });

    it("a d20 battle never emits scene.momentum", async () => {
      const out = await attackMutation(context({ participants: [swordHero, goblin], isDM: true }), d20Body(15));

      expect(out.scene?.momentum).toBeUndefined();
    });

    it("a crit-choice pause leaves scene momentum alone and the resume equals an unpaused run", async () => {
      const base = context({ participants: [swordHero, goblin], isDM: true, userId: "dm" });

      const on: BattleMutationContext = { ...base, meta: { ...base.meta, critChoiceByDm: true }, scene: { ...base.scene, momentum: { enemy: true } } };

      const paused = await attackMutation(on, d20Body(20));

      expect(paused.scene?.pendingCritChoice).toBeTruthy();
      expect(paused.scene).not.toHaveProperty("momentum");

      const { seed } = paused.scene?.pendingCritChoice as unknown as { seed: number };

      const resume: CritResume = { seed, choices: {} };

      const resumed = await attackMutation(on, d20Body(20), resume);

      const plain = await attackMutation({ ...on, meta: { ...on.meta, critChoiceByDm: false } }, d20Body(20), resume);

      expect(resumed.scene?.momentum).toEqual(plain.scene?.momentum);
      expect(resumed.participants.map((p) => p.combatStats.currentHp)).toEqual(plain.participants.map((p) => p.combatStats.currentHp));
    });
  });
});

describe("attack roll bounds", () => {
  const wfrp = (): BattleMutationContext => {
    const archer = fighter("a", ParticipantSide.ALLY);

    const multi = { ...archer, battleData: { ...archer.battleData, attacks: [{ ...sword, maxTargets: 2 }] } };

    const base = context({ participants: [multi, fighter("t", ParticipantSide.ENEMY), fighter("u", ParticipantSide.ENEMY)], isDM: true });

    return { ...base, meta: { ...base.meta, rules: WFRP_RULES }, scene: { ...base.scene, turnIndex: 0 } };
  };

  const parse = (over: Record<string, unknown>) => attackBodySchema.parse({ attackerId: "a", targetId: "t", attackId: "sw", damageRolls: [], ...over });

  it("rejects 101, 0 and fractions in the schema", () => {
    for (const d20Roll of [101, 0, 12.5]) expect(attackBodySchema.safeParse({ attackerId: "a", targetId: "t", d20Roll }).success).toBe(false);

    expect(attackBodySchema.safeParse({ attackerId: "a", targetId: "t", attackRolls: [55, 101] }).success).toBe(false);
  });

  it("wfrp takes d20Roll 100 with empty damageRolls and reports it in the percentile", async () => {
    const out = await attackMutation({ ...wfrp(), rng: () => 0.5 }, parse({ d20Roll: 100 }));

    expect(JSON.stringify(out.events)).toMatch(/"percentile":\{[^}]*"roll":100/);
    expect(out.participants.find((p) => p.basicInfo.id === "t")!.combatStats.currentHp).toBe(20);
  });

  it("wfrp takes one roll per target and ignores the advantage mode", async () => {
    const body = parse({ targetId: undefined, targetIds: ["t", "u"], attackRolls: [55, 100] });

    const normal = await attackMutation({ ...wfrp(), rng: () => 0.5 }, body);

    const advantage = await attackMutation({ ...wfrp(), rng: () => 0.5 }, { ...body, rollMode: "advantage" });

    expect(normal.participants.map((p) => p.combatStats.currentHp)).toEqual(advantage.participants.map((p) => p.combatStats.currentHp));
  });

  it("dnd5e rejects a roll above 20 in the handler and accepts 20", async () => {
    const hero5 = { ...hero, battleData: { ...hero.battleData, attacks: [{ id: "sword", name: "Sword", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d8", damageType: "slashing" } as BattleAttack] } };

    const ctx = context({ participants: [hero5, goblin], isDM: true });

    const body = (d20Roll: number) => attackBodySchema.parse({ attackerId: "hero", targetId: "gob", attackId: "sword", d20Roll, damageRolls: [4] });

    await expect(attackMutation(ctx, body(21))).rejects.toMatchObject({ message: "errors.rollOutOfRange" });
    await expect(attackMutation(ctx, body(20))).resolves.toBeDefined();
  });
});
