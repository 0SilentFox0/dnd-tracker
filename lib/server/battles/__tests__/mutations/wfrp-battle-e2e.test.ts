import { describe, expect, it, vi } from "vitest";

import { context, goblin, hero } from "./fixtures";

import { AttackType, CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { attackBodySchema } from "@/lib/schemas/battles";
import { type AttackBody, attackMutation } from "@/lib/server/battles/mutations/attack/attack-mutation";
import { initiativeRollMutation } from "@/lib/server/battles/mutations/initiative/initiative-roll-mutation";
import { createRollbackMutation } from "@/lib/server/battles/mutations/rollback/rollback-mutation";
import { makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import type { CritResume } from "@/lib/utils/battle/crit-choice/types";
import type { BattleMutationContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { diffParticipants, splitParticipant } from "@/lib/utils/battle/store";
import { buildSnapshotState } from "@/lib/utils/battle/store/snapshot-state";
import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";
import { wfrpAbilitiesOf } from "@/lib/utils/rules/systems/wfrp/combat/participant";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Sword", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d6", damageType: "slashing" };

const fighter = (id: string, side: ParticipantSide): BattleParticipant => {
  const p = makeParticipant({ id, side, hp: 20, maxHp: 20 });

  const characteristics = { ...DEFAULT_CHARACTERISTICS, base: { ...DEFAULT_CHARACTERISTICS.base, ws: 40, bs: 40, ag: 40, s: 30, t: 30 } };

  return {
    ...p,
    basicInfo: { ...p.basicInfo, battleId: "b1", controlledBy: "dm" },
    abilities: { ...p.abilities, ...wfrpAbilitiesOf(characteristics, { head: 0, arm: 0, body: 0, leg: 0 }) },
    battleData: { ...p.battleData, attacks: [sword] },
  };
};

const firstThen = (first: number, rest: number) => {
  let calls = 0;

  return () => (calls++ === 0 ? first : rest);
};

const crits = (p: BattleParticipant) => p.battleData.activeEffects.filter((e) => e.name.startsWith("crit.wfrp."));

const hp = (c: BattleMutationContext, id: string) => c.participants.find((p) => p.basicInfo.id === id)!.combatStats.currentHp;

describe("wfrp battle end to end (engine)", () => {
  it("initiative, repeated hits, target drops to 0 Wounds and goes unconscious with a crit", async () => {
    const base = context({ participants: [fighter("a", ParticipantSide.ALLY), fighter("t", ParticipantSide.ENEMY)], isDM: true });

    let ctx: BattleMutationContext = { ...base, meta: { ...base.meta, rules: WFRP_RULES } };

    const rolled = initiativeRollMutation(ctx, {});

    expect(rolled.participants).toHaveLength(2);
    ctx = { ...ctx, participants: [...rolled.participants].sort((x, y) => (x.basicInfo.id === "a" ? -1 : y.basicInfo.id === "a" ? 1 : 0)), scene: { ...ctx.scene, turnIndex: 0 } };

    const hit = (attackerId: string, targetId: string): AttackBody => attackBodySchema.parse({ attackerId, targetId, attackId: "sw", d20Roll: 10, damageRolls: [4], endTurn: true });

    const rolls: number[] = [];

    const step = async (attackerId: string, targetId: string, attackerRoll = 30) => {
      const out = await attackMutation({ ...ctx, rng: firstThen((attackerRoll - 0.5) / 100, 0.795) }, hit(attackerId, targetId));

      rolls.push(out.events.length);
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
    expect(crits(target)).toHaveLength(1);
    expect(rolls.every((n) => n > 0)).toBe(true);
  });

  it("ignores client d20 rolls: the server rolls the d100 attack", async () => {
    const base = context({ participants: [fighter("a", ParticipantSide.ALLY), fighter("t", ParticipantSide.ENEMY)], isDM: true });

    const ctx: BattleMutationContext = { ...base, meta: { ...base.meta, rules: WFRP_RULES }, scene: { ...base.scene, turnIndex: 0 } };

    const body = attackBodySchema.parse({ attackerId: "a", targetId: "t", attackId: "sw", d20Roll: 1, damageRolls: [4] });

    const out = await attackMutation({ ...ctx, rng: seq(0.995, 0.01) }, body);

    expect(out.participants.find((p) => p.basicInfo.id === "t")!.combatStats.currentHp).toBe(20);
  });

  describe("scene momentum", () => {
    const wfrpCtx = (over: Partial<BattleMutationContext["scene"]> = {}, metaOver: Partial<BattleMutationContext["meta"]> = {}): BattleMutationContext => {
      const base = context({ participants: [fighter("a", ParticipantSide.ALLY), fighter("t", ParticipantSide.ENEMY)], isDM: true });

      return { ...base, meta: { ...base.meta, rules: WFRP_RULES, ...metaOver }, scene: { ...base.scene, turnIndex: 0, ...over } };
    };

    const body = (over: Record<string, unknown> = {}) => attackBodySchema.parse({ attackerId: "a", targetId: "t", attackId: "sw", d20Roll: 10, damageRolls: [4], ...over });

    it("a won attack writes the side token to the scene, the next attack of that side spends it", async () => {
      const won = await attackMutation({ ...wfrpCtx(), rng: firstThen(0.295, 0.795) }, body());

      expect(won.scene?.momentum).toEqual({ ally: true });

      const next = await attackMutation({ ...wfrpCtx({ momentum: { ally: true } }), rng: firstThen(0.295, 0.795) }, body());

      expect(next.events.length).toBeGreaterThan(0);
      expect(next.scene?.momentum).toBeUndefined();
    });

    it("a lost attack hands the token to the defender", async () => {
      const lost = await attackMutation({ ...wfrpCtx({ momentum: { ally: true } }), rng: firstThen(0.795, 0.295) }, body({ endTurn: true }));

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
