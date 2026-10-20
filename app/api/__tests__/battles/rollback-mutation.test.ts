import { describe, expect, it, vi } from "vitest";

import { context, goblin, hero } from "./fixtures";

import { createRollbackMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/rollback/rollback-mutation";
import { mazeMap } from "@/lib/utils/battle/modes/maze/__tests__/fixtures";
import { diffParticipants, splitParticipant } from "@/lib/utils/battle/store";
import { buildSnapshotState } from "@/lib/utils/battle/store/snapshot-state";
import type { BattleMapConfig, MazeConfig } from "@/types/battle";

const ctx = context({ scene: { ...context().scene, eventSeq: 6, status: "completed" } });

const s = [splitParticipant(hero, { orderIndex: 0, isPending: false }), splitParticipant(goblin, { orderIndex: 1, isPending: false })];

const snapshot = { seq: 4, state: buildSnapshotState({ ...ctx.scene, status: "active", turnIndex: 1, eventSeq: 3 }, s, diffParticipants(s, s)) };

describe("rollback mutation", () => {
  it("відкат на подію в середині багатоподійної дії — до знімка першої події цієї дії", async () => {
    const load = vi.fn(async () => [snapshot]);

    const out = await createRollbackMutation(load, vi.fn(async () => true))(ctx, { actionIndex: 5 });

    expect(load).toHaveBeenCalledWith("b1", 5);
    expect(out.history).toEqual({ cancelFromSeq: 4 });
    expect(out.scene).toMatchObject({ status: "active", turnIndex: 1, completedAt: null });
    expect(out.participants.map((p) => p.basicInfo.id)).toEqual(["hero", "gob"]);
  });

  it("відкат повертає місцевість зі знімка: барʼєр, поставлений пізніше, зникає", async () => {
    const map = { cols: 8, rows: 8, background: null, opacity: 0.3 };

    const withBarrier = { ...map, terrain: { "1:1": { kind: "barrier" as const, untilRound: 2 } } };

    const mapped = { ...ctx, meta: { ...ctx.meta, map: withBarrier } };

    const before = { seq: 4, state: buildSnapshotState({ ...ctx.scene, status: "active" }, s, diffParticipants(s, s), map) };

    const out = await createRollbackMutation(vi.fn(async () => [before]), vi.fn(async () => true))(mapped, { actionIndex: 4 });

    expect(out.scene?.map).toEqual(map);

    const same = { seq: 4, state: buildSnapshotState({ ...ctx.scene, status: "active" }, s, diffParticipants(s, s), withBarrier) };

    const kept = await createRollbackMutation(vi.fn(async () => [same]), vi.fn(async () => true))(mapped, { actionIndex: 4 });

    expect(kept.scene?.map?.terrain).toEqual(withBarrier.terrain);
  });

  it("старий знімок без місцевості або бій без карти — карту не чіпає", async () => {
    const mapped = { ...ctx, meta: { ...ctx.meta, map: { cols: 8, rows: 8, background: null, opacity: 0.3 } } };

    const out = await createRollbackMutation(vi.fn(async () => [snapshot]), vi.fn(async () => true))(mapped, { actionIndex: 5 });

    expect(out.scene).not.toHaveProperty("map");
  });

  describe("лабіринт у знімку", () => {
    const flat = { cols: 8, rows: 8, background: null, opacity: 0.3 };

    const maze = mazeMap({ exit: { x: 7, y: 7 }, walls: ["1:1:e"] }, 8).maze as MazeConfig;

    const rollbackTo = (now: BattleMapConfig, snapshotMap: BattleMapConfig) => {
      const state = buildSnapshotState({ ...ctx.scene, status: "active" }, s, diffParticipants(s, s), snapshotMap);

      return createRollbackMutation(vi.fn(async () => [{ seq: 4, state }]), vi.fn(async () => true))({ ...ctx, meta: { ...ctx.meta, map: now } }, { actionIndex: 4 });
    };

    it("знімок без ключа maze — лабіринт не чіпається", async () => {
      const state = buildSnapshotState({ ...ctx.scene, status: "active" }, s, diffParticipants(s, s));

      const out = await createRollbackMutation(vi.fn(async () => [{ seq: 4, state }]), vi.fn(async () => true))({ ...ctx, meta: { ...ctx.meta, map: { ...flat, maze } } }, { actionIndex: 4 });

      expect(out.scene).not.toHaveProperty("map");
    });

    it("maze: null при ввімкненому лабіринті — вимикає", async () => {
      const out = await rollbackTo({ ...flat, maze }, flat);

      expect(out.scene?.map?.maze).toBeNull();
    });

    it("maze зі знімка — ставиться", async () => {
      const out = await rollbackTo({ ...flat, maze: { ...maze, dark: true } }, { ...flat, maze });

      expect(out.scene?.map?.maze).toEqual(maze);
    });
  });

  it("немає знімків — action_rejected", async () => {
    await expect(createRollbackMutation(vi.fn(async () => []), vi.fn(async () => true))(ctx, { actionIndex: 1 })).rejects.toMatchObject({
      code: "action_rejected",
      message: expect.stringContaining("лише останні 20"),
    });
  });

  it("подія вже скасована (подвійний клік) або не існує — action_rejected, без відкату", async () => {
    const load = vi.fn(async () => [snapshot]);

    await expect(createRollbackMutation(load, vi.fn(async () => false))(ctx, { actionIndex: 5 })).rejects.toMatchObject({
      code: "action_rejected",
    });
    expect(load).not.toHaveBeenCalled();
  });
});
