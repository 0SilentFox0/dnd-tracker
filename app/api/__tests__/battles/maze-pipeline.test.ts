import { describe, expect, it, vi } from "vitest";

import { goblin, hero } from "./fixtures";

import { mazeActionSchema, mazeMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/maze/maze-mutation";
import { moveMutation, moveSchema } from "@/app/api/campaigns/[id]/battles/[battleId]/move/move-mutation";
import { createRollbackMutation, rollbackSchema } from "@/app/api/campaigns/[id]/battles/[battleId]/rollback/rollback-mutation";
import { applyBattleDelta } from "@/lib/utils/battle/client/apply-delta";
import { allInteriorEdges } from "@/lib/utils/battle/modes/maze";
import { at, mazeMap } from "@/lib/utils/battle/modes/maze/__tests__/fixtures";
import { MAZE_TEXTS } from "@/lib/utils/battle/modes/maze/texts";
import { buildClientDelta } from "@/lib/utils/battle/pipeline/client-delta";
import type { PipelineDeps, RunBattleMutationOptions } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccess, runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { BattleMeta, BattleSceneState, SnapshotState, StoredBattleEvent, StoredParticipant } from "@/lib/utils/battle/store";
import { buildSnapshotState, eventToBattleAction, joinParticipant, prepareSave, splitParticipant } from "@/lib/utils/battle/store";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { BattleMutationResponse, BattleScene } from "@/types/api";
import type { BattleMapConfig, BattleParticipant, GridPoint, MazeConfig } from "@/types/battle";

const DM = "dm-user";

const PLAYER = "user-1";

const wire = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const mapOf = (over: Partial<MazeConfig> = {}, size = 8): BattleMapConfig => mazeMap({ exit: { x: 7, y: 7 }, ...over }, size);

const scene0: BattleSceneState = {
  id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0, version: 1,
  eventSeq: 0, pendingMoraleCheck: null, startedAt: new Date("2026-01-01T00:00:00.000Z"), completedAt: null,
};

/** Сховище в пам'яті з тими самими split/join, prepareSave і знімками, що й saveBattle, плюс карта бою */
function memoryBattle(participants: BattleParticipant[], map: BattleMapConfig) {
  let scene = { ...scene0 };

  const meta: BattleMeta = { name: "Бій", description: null, setup: [], friendlyFire: false, rules: DEFAULT_RULES, map, createdAt: new Date() };

  let rows: StoredParticipant[] = wire(participants.map((p, i) => splitParticipant(p, { orderIndex: i, isPending: false })));

  let events: Array<StoredBattleEvent & { cancelled: boolean }> = [];

  let snapshots: Array<{ seq: number; state: SnapshotState }> = [];

  let userId = PLAYER;

  const joined = () => [...rows].sort((a, b) => a.columns.orderIndex - b.columns.orderIndex).map((r) => joinParticipant(r, scene.id));

  const deps: PipelineDeps = {
    getUserId: async () => userId,
    rateLimit: vi.fn(),
    loadBattle: async () => ({ scene: { ...scene }, meta: { ...meta }, participants: joined(), pending: [], isDM: userId === DM, isMember: true }),
    async saveBattle(before, outcome) {
      const { beforeStored, diff, events: created, delta } = prepareSave(before, outcome);

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

      if (created.length > 0) {
        snapshots.push({ seq: created[0].seq, state: wire(buildSnapshotState(scene, beforeStored, diff, before.meta.map)) });
        events.push(...wire(created).map((e) => ({ ...e, cancelled: false })));
      }

      if (outcome.scene?.map !== undefined) meta.map = wire(outcome.scene.map);

      const { map: _map, ...patch } = outcome.scene ?? {};

      scene = { ...scene, ...patch, version: scene.version + 1, eventSeq: scene.eventSeq + created.length };

      return delta;
    },
    publish: vi.fn(),
    loadRecentEvents: async (_battleId, limit) => events.filter((e) => !e.cancelled).slice(-limit).map((e) => eventToBattleAction(e, scene.id, { createdAt: new Date(0), cancelledAt: null })),
  };

  const params = { id: "c1", battleId: "b1" };

  return {
    meta,
    participant: (id: string) => joined().find((p) => p.basicInfo.id === id) as BattleParticipant,
    events: () => events,
    snapshots: () => snapshots,
    rollback: createRollbackMutation(
      async (_battleId, seq) => {
        const start = [...snapshots].reverse().find((s) => s.seq <= seq);

        return start ? snapshots.filter((s) => s.seq >= start.seq) : [];
      },
      async (_battleId, seq) => events.some((e) => e.seq === seq && !e.cancelled),
    ),
    async get(): Promise<BattleScene> {
      userId = PLAYER;

      const res = await runBattleMutation(new Request("http://x/battle"), {
        params,
        access: BattleAccess.MEMBER,
        dryRun: () => true,
        includeRecentEvents: 30,
        mutate: (ctx) => ({ participants: ctx.participants, pending: ctx.pending, events: [] }),
      }, deps);

      return (await res.json()) as BattleScene;
    },
    async act<T>(as: string, options: Omit<RunBattleMutationOptions<T>, "params">, body: unknown = {}) {
      userId = as;

      const res = await runBattleMutation(new Request("http://x/api", { method: "POST", body: JSON.stringify(body) }), { ...options, params } as RunBattleMutationOptions<T>, deps);

      const json = (await res.json()) as BattleMutationResponse & { error?: string };

      if (res.status !== 200) throw new Error(`${res.status}: ${json.error}`);

      return json.delta;
    },
  };
}

const step = (b: ReturnType<typeof memoryBattle>, to: GridPoint) =>
  b.act(PLAYER, { access: BattleAccess.MEMBER, schema: moveSchema, respond: "wrapped", mutate: moveMutation }, { participantId: "hero", to });

describe("maze у конвеєрі", () => {
  it("крок героя, після якого ворог у полі зору: ворог прокинувся в дельті, подія «помітив»", async () => {
    const b = memoryBattle([at(hero, { x: 0, y: 0 }, { facing: "s" }), at(goblin, { x: 4, y: 0 }, { dormant: true })], mapOf({ moved: true }));

    const before = await b.get();

    const delta = await step(b, { x: 1, y: 0 });

    expect(delta.patched).toContainEqual({ id: "gob", battleData: { dormant: false, mazeWakeRound: 2 } });
    expect(delta.log.map((e) => e.resultText)).toEqual([`${hero.basicInfo.name} помітив Гоблін`]);

    const applied = applyBattleDelta(before, wire(delta)) as BattleScene;

    expect(applied.initiativeOrder.find((p) => p.basicInfo.id === "gob")?.battleData.dormant).toBe(false);
  });

  it("справжня перетасовка пише подію ДМ, і відкат до неї повертає стіни, позиції й неспання ворога", async () => {
    const walls = ["3:3:e"];

    const b = memoryBattle([at(hero, { x: 0, y: 0 }, { facing: "s" }), at(goblin, { x: 4, y: 0 }, { dormant: true })], mapOf({ walls, moved: true }));

    await step(b, { x: 1, y: 0 });

    const awake = b.participant("gob").battleData;

    expect(awake.dormant).toBe(false);

    await b.act(DM, { access: BattleAccess.DM, schema: mazeActionSchema, mutate: mazeMutation }, { op: "reshuffle", mode: "scatter", teleportPairs: 1, fogPatches: 1 });

    expect(b.meta.map?.maze?.walls).not.toEqual(walls);
    expect(b.participant("gob").battleData.position).not.toEqual({ x: 4, y: 0 });

    const reshuffleSeq = b.events().find((e) => e.resultText === MAZE_TEXTS.ops.reshuffle)?.seq as number;

    expect(reshuffleSeq).toBeGreaterThan(0);

    const delta = await b.act(DM, { access: BattleAccess.DM, schema: rollbackSchema, mutate: b.rollback }, { actionIndex: reshuffleSeq });

    expect(b.meta.map?.maze?.walls).toEqual(walls);
    expect(delta.scene.map?.maze?.walls).toEqual(walls);
    expect(b.participant("gob").battleData).toMatchObject({ dormant: false, position: { x: 4, y: 0 }, mazeWakeRound: awake.mazeWakeRound });
  });

  it("правка стін не пише ні події, ні знімка; відкат пізнішої дії її зберігає, ранішої — скасовує", async () => {
    const b = memoryBattle([at(hero, { x: 0, y: 0 }, { facing: "s" })], mapOf({ walls: ["3:3:e"], moved: true }));

    const maze = (body: unknown) => b.act(DM, { access: BattleAccess.DM, schema: mazeActionSchema, mutate: mazeMutation }, body);

    await maze({ op: "dark", on: true });
    await maze({ op: "walls", add: ["5:5:s"], remove: [] });
    await maze({ op: "dark", on: false });

    const seqs = b.events().map((e) => [e.resultText, e.seq] as const);

    expect(seqs.map(([t]) => t)).toEqual([MAZE_TEXTS.ops.darkOn, MAZE_TEXTS.ops.darkOff]);
    expect(b.snapshots()).toHaveLength(2);

    await b.act(DM, { access: BattleAccess.DM, schema: rollbackSchema, mutate: b.rollback }, { actionIndex: seqs[1][1] });

    expect(b.meta.map?.maze).toMatchObject({ walls: ["3:3:e", "5:5:s"], dark: true });

    await b.act(DM, { access: BattleAccess.DM, schema: rollbackSchema, mutate: b.rollback }, { actionIndex: seqs[0][1] });

    expect(b.meta.map?.maze).toMatchObject({ walls: ["3:3:e"], dark: false });
  });
});

describe("дельта лабіринту", () => {
  const big = mapOf({}, 40);

  const bigMap: BattleMapConfig = { ...big, rows: 30, maze: { ...(big.maze as MazeConfig), walls: allInteriorEdges({ cols: 40, rows: 30 }) } };

  const args = (map: BattleMapConfig) => ({
    before: { scene: scene0, meta: { name: "Бій", description: null, setup: [], friendlyFire: false, rules: DEFAULT_RULES, map: bigMap, createdAt: new Date() }, participants: [], pending: [] },
    after: { ...scene0, version: 2 },
    participants: [],
    pending: [],
    stored: [],
    fullIds: [],
    log: [],
    map,
  });

  it("мітка на карті 40×30 — лише scene.maze.marks, без карти й стін", () => {
    const marks = { "1:1": { symbol: "star" as const, color: "#ef4444", by: "hero" } };

    const marked = { ...bigMap, maze: { ...(bigMap.maze as MazeConfig), walls: [...(bigMap.maze as MazeConfig).walls], marks } };

    const d = buildClientDelta(args(marked));

    expect(d.scene.map).toBeUndefined();
    expect(d.scene.maze).toEqual({ marks });
    expect(JSON.stringify(d).length).toBeLessThan(1000);
  });

  it("перетасовка (інші стіни) — повна карта", () => {
    const reshuffled = { ...bigMap, maze: { ...(bigMap.maze as MazeConfig), walls: ["1:1:e"] } };

    const d = buildClientDelta(args(reshuffled));

    expect(d.scene.map).toEqual(reshuffled);
    expect(d.scene.maze).toBeUndefined();
  });

  it("applyBattleDelta зливає scene.maze у кешовану карту; без лабіринту в кеші — refetch", () => {
    const cached = { version: 1, map: bigMap, initiativeOrder: [], battleLog: [] } as unknown as BattleScene;

    const marks = { "2:2": { symbol: "cross" as const, color: "#22c55e", by: "hero" } };

    const delta = { battleId: "b1", version: 2, scene: { status: "active", round: 1, turnIndex: 0, pendingMoraleCheck: null, maze: { marks, dark: true } }, upserted: [], removed: [], log: [] } as BattleMutationResponse["delta"];

    const out = applyBattleDelta(cached, delta) as BattleScene;

    expect(out.map?.maze).toEqual({ ...bigMap.maze, marks, dark: true });
    expect(out.map?.maze?.walls).toBe(bigMap.maze?.walls);

    expect(applyBattleDelta({ ...cached, map: { ...bigMap, maze: null } }, delta)).toBe("refetch");
  });
});
