import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { buildClientDelta } from "@/lib/utils/battle/pipeline/client-delta";
import { PUSHER_DELTA_LIMIT_BYTES } from "@/lib/utils/battle/pipeline/limits";
import type { BattleSceneState } from "@/lib/utils/battle/store";
import type { BattleParticipant } from "@/types/battle";

const p = (id: string, hp = 10, side = ParticipantSide.ALLY): BattleParticipant => {
  const base = createMockParticipant();

  return { ...base, basicInfo: { ...base.basicInfo, id, side }, combatStats: { ...base.combatStats, currentHp: hp } };
};

const scene: BattleSceneState = {
  id: "b1", campaignId: "c1", status: "active", round: 2, turnIndex: 1, version: 7,
  eventSeq: 10, pendingMoraleCheck: null, startedAt: new Date("2026-01-01"), completedAt: null,
};

const meta = { name: "Бій", description: null, setup: [], friendlyFire: false, map: null, createdAt: new Date() };

describe("buildClientDelta", () => {
  it("зміна HP наявного учасника — лише патч поля, без order, коли порядок той самий", () => {
    const a = p("a"), b = p("b"), b2 = p("b", 4);

    const d = buildClientDelta({
      before: { scene, meta, participants: [a, b], pending: [] },
      after: { ...scene, version: 8, turnIndex: 0 },
      participants: [a, b2],
      pending: [],
      stored: [b2],
      fullIds: [],
      log: [],
    });

    expect(d.version).toBe(8);
    expect(d.upserted).toEqual([]);
    expect(d.patched).toEqual([{ id: "b", combatStats: { currentHp: 4 } }]);
    expect(d.removed).toEqual([]);
    expect(d.order).toBeUndefined();
    expect(d.pending).toBeUndefined();
    expect(d.scene).toMatchObject({ status: "active", round: 2, turnIndex: 0, startedAt: "2026-01-01T00:00:00.000Z" });
  });

  it("карта чи зміни місцевості в scene лише тоді, коли вона змінилась", () => {
    const a = p("a");

    const map = { cols: 8, rows: 8, background: null, opacity: 0.3 };

    const withTerrain = { ...map, terrain: { "1:1": { kind: "wall" as const } } };

    const args = {
      before: { scene, meta: { ...meta, map }, participants: [a], pending: [] },
      after: { ...scene, version: 8 },
      participants: [a],
      pending: [],
      stored: [],
      fullIds: [],
      log: [],
    };

    expect(buildClientDelta(args).scene).not.toHaveProperty("map");
    expect(buildClientDelta({ ...args, map: { ...map } }).scene).not.toHaveProperty("map");
    expect(buildClientDelta({ ...args, map: withTerrain }).scene).not.toHaveProperty("map");
    expect(buildClientDelta({ ...args, map: withTerrain }).scene.terrain).toEqual({ set: [{ cell: { kind: "wall" }, keys: ["1:1"] }] });
    expect(buildClientDelta({ ...args, map: null }).scene.map).toBeNull();

    const resized = { ...withTerrain, cols: 10 };

    expect(buildClientDelta({ ...args, map: resized }).scene).toMatchObject({ map: resized });
    expect(buildClientDelta({ ...args, map: resized }).scene).not.toHaveProperty("terrain");
  });

  it("зняття місцевості — removed; без змін місцевості — нічого", () => {
    const a = p("a");

    const map = { cols: 8, rows: 8, background: null, opacity: 0.3, terrain: { "1:1": { kind: "wall" as const }, "2:2": { kind: "hazard" as const } } };

    const args = {
      before: { scene, meta: { ...meta, map }, participants: [a], pending: [] },
      after: { ...scene, version: 8 },
      participants: [a],
      pending: [],
      stored: [],
      fullIds: [],
      log: [],
    };

    const { terrain: _t, ...bare } = map;

    expect(buildClientDelta({ ...args, map: { ...bare, terrain: { "2:2": { kind: "hazard" } } } }).scene.terrain).toEqual({ removed: ["1:1"] });
    expect(buildClientDelta({ ...args, map: bare }).scene.terrain).toEqual({ removed: ["1:1", "2:2"] });
    expect(buildClientDelta({ ...args, map: { ...map, terrain: { ...map.terrain } } }).scene).not.toHaveProperty("terrain");
  });

  it("великий штрих небезпеки з підписом на 150 клітинок тримає дельту далеко під лімітом Pusher", () => {
    const a = p("a");

    const map = { cols: 40, rows: 40, background: "https://example.com/bg.webp", opacity: 0.3 };

    const terrain = Object.fromEntries(
      Array.from({ length: 150 }, (_, i) => [`${i % 40}:${Math.floor(i / 40)}`, { kind: "hazard" as const, label: "Небезпечна зона" }]),
    );

    const d = buildClientDelta({
      before: { scene, meta: { ...meta, map }, participants: [a], pending: [] },
      after: { ...scene, version: 8 },
      participants: [a],
      pending: [],
      stored: [],
      fullIds: [],
      log: [],
      map: { ...map, terrain },
    });

    expect(d.scene.terrain?.set).toHaveLength(1);
    expect(Buffer.byteLength(JSON.stringify(d), "utf8")).toBeLessThan(PUSHER_DELTA_LIMIT_BYTES / 4);
  });

  it("видалення і зміна порядку → removed + order", () => {
    const a = p("a"), b = p("b"), c = p("c");

    const d = buildClientDelta({
      before: { scene, meta, participants: [a, b, c], pending: [] },
      after: { ...scene, version: 8 },
      participants: [c, a],
      pending: [],
      stored: [],
      fullIds: [],
      log: [],
    });

    expect(d.removed).toEqual(["b"]);
    expect(d.order).toEqual(["c", "a"]);
  });

  it("саммон у pending → повний список pending; переведення з pending в бій → order", () => {
    const a = p("a"), s = p("s", 5, ParticipantSide.ALLY);

    const toPending = buildClientDelta({
      before: { scene, meta, participants: [a], pending: [] },
      after: { ...scene, version: 8 },
      participants: [a],
      pending: [s],
      stored: [s],
      fullIds: [],
      log: [],
    });

    expect(toPending.pending).toEqual([s]);
    expect(toPending.upserted).toEqual([]);

    const promoted = buildClientDelta({
      before: { scene, meta, participants: [a], pending: [s] },
      after: { ...scene, version: 9 },
      participants: [a, s],
      pending: [],
      stored: [s],
      fullIds: [],
      log: [],
    });

    expect(promoted.pending).toEqual([]);
    expect(promoted.upserted).toEqual([s]);
    expect(promoted.patched).toBeUndefined();
    expect(promoted.order).toEqual(["a", "s"]);
    expect(promoted.removed).toEqual([]);
  });

  it("змінений знімок або видалене поле стану — повний учасник; зміна лише orderIndex — нічого", () => {
    const a = p("a"), b = p("b"), c = p("c");

    const a2 = { ...a, combatStats: { ...a.combatStats, armorClass: 30 } };

    const { abilityUsage: _drop, ...bData } = { ...b.battleData, abilityUsage: {} };

    const d = buildClientDelta({
      before: { scene, meta, participants: [a, { ...b, battleData: { ...b.battleData, abilityUsage: {} } }, c], pending: [] },
      after: { ...scene, version: 8 },
      participants: [a2, { ...b, battleData: bData }, c],
      pending: [],
      stored: [a2, { ...b, battleData: bData }, c],
      fullIds: ["a"],
      log: [],
    });

    expect(d.upserted.map((x) => x.basicInfo.id)).toEqual(["a", "b"]);
    expect(d.patched).toBeUndefined();
  });

  it("prepared → setup; журнал і cancelledFrom передаються як є", () => {
    const setup = [{ id: "u1", type: "unit" as const, side: ParticipantSide.ENEMY }];

    const d = buildClientDelta({
      before: { scene, meta: { ...meta, setup }, participants: [p("a")], pending: [] },
      after: { ...scene, status: "prepared", version: 8, round: 1, turnIndex: 0 },
      participants: [],
      pending: [],
      stored: [],
      fullIds: [],
      log: [],
      cancelledFrom: 0,
    });

    expect(d.setup).toEqual(setup);
    expect(d.cancelledFrom).toBe(0);
    expect(d.removed).toEqual(["a"]);
    expect(d.order).toEqual([]);
  });

  it("патчі й pending будуються зі збереженої форми, а не з сирого виводу рушія", () => {
    const a = p("a"), s = p("s");

    const raw = { ...a, combatStats: { ...a.combatStats, currentHp: 37.5, maxHp: 37.5 } };

    const stored = { ...a, combatStats: { ...a.combatStats, currentHp: 38, maxHp: 38 } };

    const rawSummon = { ...s, combatStats: { ...s.combatStats, maxHp: 12.5 } };

    const storedSummon = { ...s, combatStats: { ...s.combatStats, maxHp: 13 } };

    const d = buildClientDelta({
      before: { scene, meta, participants: [a], pending: [] },
      after: { ...scene, version: 8 },
      participants: [raw],
      pending: [rawSummon],
      stored: [stored, storedSummon],
      fullIds: [],
      log: [],
    });

    expect(d.patched).toEqual([{ id: "a", combatStats: { currentHp: 38, maxHp: 38 } }]);
    expect(d.pending).toEqual([storedSummon]);
  });

  it("відкат із completed → completedAt: null, щоб клієнт прибрав позначку завершення", () => {
    const a = p("a");

    const done = { ...scene, status: "completed" as const, completedAt: new Date("2026-01-02") };

    const d = buildClientDelta({
      before: { scene: done, meta, participants: [a], pending: [] },
      after: { ...scene, version: 8 },
      participants: [a],
      pending: [],
      stored: [],
      fullIds: [],
      log: [],
      cancelledFrom: 5,
    });

    expect(d.scene).toMatchObject({ status: "active", completedAt: null });
  });
});
