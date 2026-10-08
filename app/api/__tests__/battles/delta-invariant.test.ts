import type { Spell } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { goblin, hero, participant } from "./fixtures";

import { attackBodySchema, attackMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation";
import { nextTurnMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/next-turn/next-turn-mutation";
import { createRollbackMutation, rollbackSchema } from "@/app/api/campaigns/[id]/battles/[battleId]/rollback/rollback-mutation";
import { spellSchema } from "@/app/api/campaigns/[id]/battles/[battleId]/spell/cast-spell-schema";
import { createSpellMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/spell/spell-mutation";
import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { applyBattleDelta } from "@/lib/utils/battle/client/apply-delta";
import type { MutationResult, PipelineDeps, RunBattleMutationOptions } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccess, runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { BattleMeta, BattleSceneState, SnapshotState, StoredBattleEvent, StoredParticipant } from "@/lib/utils/battle/store";
import { buildSnapshotState, eventToBattleAction, joinParticipant, prepareSave, splitParticipant } from "@/lib/utils/battle/store";
import { KNOWLEDGE_EVENT_TYPES, summarizeKnowledge } from "@/lib/utils/battle/view/knowledge";
import type { BattleMutationResponse, BattleScene } from "@/types/api";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

const DM = "dm-user";

const PLAYER = "user-1";

const CREATED_AT = new Date("2026-01-01T00:00:00.000Z");

const wire = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Сховище в пам'яті з тими самими split/join і prepareSave, що й saveBattle: дельта йде зі збереженої форми */
function memoryBattle(init: { participants: BattleParticipant[]; pending?: BattleParticipant[]; scene?: Partial<BattleSceneState> }) {
  let scene: BattleSceneState = {
    id: "b1",
    campaignId: "c1",
    status: "active",
    round: 1,
    turnIndex: 0,
    version: 1,
    eventSeq: 0,
    pendingMoraleCheck: null,
    startedAt: new Date("2026-01-01T00:00:00.000Z"),
    completedAt: null,
    ...init.scene,
  };

  const meta: BattleMeta = { name: "Бій", description: null, setup: [], friendlyFire: false, createdAt: CREATED_AT };

  let rows: StoredParticipant[] = wire([
    ...init.participants.map((p, i) => splitParticipant(p, { orderIndex: i, isPending: false })),
    ...(init.pending ?? []).map((p, i) => splitParticipant(p, { orderIndex: i, isPending: true })),
  ]);

  let events: Array<StoredBattleEvent & { cancelled: boolean }> = [];

  let snapshots: Array<{ seq: number; state: SnapshotState }> = [];

  let userId = PLAYER;

  const joined = (pending: boolean) =>
    rows
      .filter((r) => r.columns.isPending === pending)
      .sort((a, b) => a.columns.orderIndex - b.columns.orderIndex)
      .map((r) => joinParticipant(r, scene.id));

  const active = () => events.filter((e) => !e.cancelled);

  const deps: PipelineDeps = {
    getUserId: async () => userId,
    rateLimit: vi.fn(),
    loadBattle: async () => ({
      scene: { ...scene },
      meta,
      participants: joined(false),
      pending: joined(true),
      isDM: userId === DM,
      isMember: true,
    }),
    async saveBattle(before, outcome) {
      const { beforeStored, diff, events: created, clearHistory, delta } = prepareSave(before, outcome);

      if (before.scene.version !== scene.version) throw new Error("version conflict");

      const removed = new Set(diff.removed.map((r) => r.columns.id));

      const updated = new Map(diff.updated.map((u) => [u.next.columns.id, u]));

      rows = [
        ...rows.filter((r) => !removed.has(r.columns.id)).map((r) => {
          const u = updated.get(r.columns.id);

          return u ? wire({ ...u.next, snapshot: u.snapshotChanged ? u.next.snapshot : r.snapshot }) : r;
        }),
        ...wire(diff.created),
      ];

      const history = outcome.history;

      if (history && "cancelFromSeq" in history) {
        events = events.map((e) => (e.seq >= history.cancelFromSeq ? { ...e, cancelled: true } : e));
        snapshots = snapshots.filter((s) => s.seq < history.cancelFromSeq);
      }

      if (clearHistory) {
        events = [];
        snapshots = [];
      }

      if (created.length > 0) {
        snapshots.push({ seq: created[0].seq, state: wire(buildSnapshotState(scene, beforeStored, diff)) });
        events.push(...wire(created).map((e) => ({ ...e, cancelled: false })));
      }

      scene = {
        ...scene,
        ...outcome.scene,
        version: scene.version + 1,
        eventSeq: clearHistory ? created.length : scene.eventSeq + created.length,
      };

      return delta;
    },
    publish: vi.fn(),
    loadRecentEvents: async (_battleId, limit) =>
      active().slice(-limit).map((e) => eventToBattleAction(e, scene.id, { createdAt: CREATED_AT, cancelledAt: null })),
    loadKnowledge: async () =>
      summarizeKnowledge(
        active()
          .filter((e) => KNOWLEDGE_EVENT_TYPES.includes(e.type as (typeof KNOWLEDGE_EVENT_TYPES)[number]))
          .map((e) => eventToBattleAction(e, scene.id)),
      ),
  };

  const params = { id: "c1", battleId: "b1" };

  return {
    rollback: createRollbackMutation(
      async (_battleId, seq) => {
        const start = [...snapshots].reverse().find((s) => s.seq <= seq);

        return start ? snapshots.filter((s) => s.seq >= start.seq) : [];
      },
      async (_battleId, seq) => active().some((e) => e.seq === seq),
    ),
    lastSeq: () => scene.eventSeq,
    async get(as = PLAYER): Promise<BattleScene> {
      userId = as;

      const res = await runBattleMutation(new Request("http://x/battle"), {
        params,
        access: BattleAccess.MEMBER,
        dryRun: () => true,
        includeRecentEvents: 30,
        includeKnowledge: true,
        mutate: (ctx) => ({ participants: ctx.participants, pending: ctx.pending, events: [] }),
      }, deps);

      return (await res.json()) as BattleScene;
    },
    async act<T>(as: string, options: Omit<RunBattleMutationOptions<T>, "params">, body: unknown = {}) {
      userId = as;

      const res = await runBattleMutation(
        new Request("http://x/api", { method: "POST", body: JSON.stringify(body) }),
        { ...options, params } as RunBattleMutationOptions<T>,
        deps,
      );

      const json = (await res.json()) as BattleMutationResponse & { error?: string };

      if (res.status !== 200) throw new Error(`${res.status}: ${json.error}`);

      return json.delta;
    },
  };
}

type Memory = ReturnType<typeof memoryBattle>;

// поля, які GET і дельта мають право відрізняти: режим журналу, час події, знання (клієнт зливає його з журналом)
function visible(scene: BattleScene, { withKnowledge = false } = {}) {
  const { battleLogMode: _m, battleLogCancelledFrom: _c, knowledge, ...rest } = wire(scene);

  return {
    ...rest,
    battleLog: rest.battleLog.map((e) => ({ ...e, timestamp: null })),
    ...(withKnowledge && { knowledge }),
  };
}

async function expectDeltaMatchesGet(battle: Memory, action: (b: Memory) => Promise<BattleMutationResponse["delta"]>, opts?: { withKnowledge?: boolean }) {
  const before = await battle.get();

  const delta = wire(await action(battle));

  const applied = applyBattleDelta(before, delta);

  expect(applied).not.toBe("refetch");

  const after = await battle.get();

  expect(visible(applied as BattleScene, opts)).toEqual(visible(after, opts));

  return { before, delta, after, applied: applied as BattleScene };
}

const sword = { id: "sword", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d8", damageType: "slashing" };

const armedHero: BattleParticipant = { ...hero, battleData: { ...hero.battleData, attacks: [sword] } };

const sturdyGoblin: BattleParticipant = {
  ...goblin,
  combatStats: { ...goblin.combatStats, maxHp: 40, currentHp: 40 },
};

const orc = participant("orc", { side: ParticipantSide.ENEMY, controlledBy: "dm", name: "Орк" });

const attack = (b: Memory, damage = 6) =>
  b.act(PLAYER, { access: BattleAccess.MEMBER, schema: attackBodySchema, mutate: attackMutation }, {
    attackerId: "hero", targetId: "gob", attackId: "sword", d20Roll: 15, damageRolls: [damage],
  });

const nextTurn = (b: Memory) => b.act(DM, { access: BattleAccess.CURRENT_CONTROLLER, mutate: nextTurnMutation });

describe("інваріант: GET(до) + дельта = GET(після)", () => {
  it("атака", async () => {
    const { delta } = await expectDeltaMatchesGet(memoryBattle({ participants: [armedHero, sturdyGoblin, orc] }), (b) => attack(b));

    expect(delta.patched?.length).toBeGreaterThan(0);
  });

  it("заклинання", async () => {
    const spell = {
      id: "s1", campaignId: "c1", name: "Вогняна стріла", level: 1, groupId: null, icon: null, dice: 1, cost: "action",
      targeting: { kind: "enemy" }, resolution: { kind: "auto" }, spellEffects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" }], raceModifiers: [],
    } as unknown as Spell;

    const caster: BattleParticipant = { ...armedHero, spellcasting: { spellSlots: { "1": { max: 2, current: 2 } }, knownSpells: ["s1"] } };

    const mutate = createSpellMutation({ loadSpell: vi.fn(async () => spell), loadPool: async () => ({ units: [], races: [] }) });

    await expectDeltaMatchesGet(memoryBattle({ participants: [caster, sturdyGoblin, orc] }), (b) =>
      b.act(PLAYER, { access: BattleAccess.MEMBER, schema: spellSchema, mutate }, { casterId: "hero", spellId: "s1", targetIds: ["gob"], diceRolls: [5] }),
    );
  });

  it("наступний хід: тікають ефекти й DoT", async () => {
    const burning: ActiveEffect = {
      id: "burn", name: "Горіння", type: "debuff", duration: 2, appliedAt: { round: 1, timestamp: new Date("2026-01-01") },
      effects: [], dotDamage: { damagePerRound: 3, damageType: "fire" },
    };

    const blessed: ActiveEffect = { ...burning, id: "bless", name: "Благословення", type: "buff", duration: 1, dotDamage: undefined, effects: [{ type: "attack_bonus", value: 1 }] };

    const burningGoblin = { ...sturdyGoblin, battleData: { ...sturdyGoblin.battleData, activeEffects: [burning, blessed] } };

    const { applied } = await expectDeltaMatchesGet(memoryBattle({ participants: [armedHero, burningGoblin, orc] }), nextTurn);

    const gob = applied.initiativeOrder[1];

    expect(applied.currentTurnIndex).toBe(1);
    expect(gob.combatStats.currentHp).toBe(37);
    expect(gob.battleData.activeEffects.map((e) => [e.id, e.duration])).toEqual([["burn", 1]]);
  });

  it("відкат атаки повертає HP і приносить перераховане знання", async () => {
    const battle = memoryBattle({ participants: [armedHero, sturdyGoblin, orc] });

    await attack(battle);

    const first = battle.lastSeq();

    await attack(battle, 4).catch(() => undefined);

    const { delta, after } = await expectDeltaMatchesGet(
      battle,
      (b) => b.act(DM, { access: BattleAccess.DM, schema: rollbackSchema, mutate: b.rollback }, { actionIndex: first }),
      { withKnowledge: true },
    );

    expect(delta.cancelledFrom).toBe(first);
    expect(after.initiativeOrder.find((p) => p.basicInfo.id === "gob")?.combatStats.currentHp).toBe(40);
  });

  it("саммон із pending стає в бій на новому раунді", async () => {
    const summon = participant("wolf", { name: "Вовк", sourceType: "unit", controlledBy: PLAYER });

    const { delta, applied } = await expectDeltaMatchesGet(
      memoryBattle({ participants: [armedHero, sturdyGoblin], pending: [summon], scene: { turnIndex: 1 } }),
      nextTurn,
    );

    expect(applied.pendingSummons).toEqual([]);
    expect(applied.initiativeOrder.map((p) => p.basicInfo.id)).toContain("wolf");
    expect(delta.order).toBeDefined();
  });

  it("перемога: останній ворог падає — бій завершено", async () => {
    const weakGoblin = { ...goblin, combatStats: { ...goblin.combatStats, maxHp: 3, currentHp: 3 } };

    const { applied } = await expectDeltaMatchesGet(memoryBattle({ participants: [armedHero, weakGoblin] }), (b) => attack(b, 8));

    expect(applied.status).toBe("completed");
    expect(applied.completedAt).toBeDefined();
  });

  it("дробові HP із рушія приходять клієнту округленими, як із БД", async () => {
    const battle = memoryBattle({ participants: [armedHero, sturdyGoblin] });

    const grow = (ctx: { participants: BattleParticipant[]; pending: BattleParticipant[] }): MutationResult => ({
      participants: ctx.participants.map((p) =>
        p.basicInfo.id === "gob" ? { ...p, combatStats: { ...p.combatStats, maxHp: 37.5, currentHp: 37.5 } } : p,
      ),
      pending: ctx.pending,
      events: [],
    });

    const { applied } = await expectDeltaMatchesGet(battle, (b) => b.act(DM, { access: BattleAccess.DM, mutate: grow }));

    expect(applied.initiativeOrder[1].combatStats.maxHp).toBe(38);
  });
});
