import { describe, expect, it } from "vitest";

import { applyMazeMove, mazeBudgetLeft, mazeReachable, placeMazeParticipants } from "../movement";
import { mazeGrid } from "./fixtures";

import { ParticipantSide } from "@/lib/constants/battle";
import { byId, placed } from "@/lib/utils/battle/__tests__/fixtures/placed";
import type { BattleParticipant, GridPoint, MazeConfig } from "@/types/battle";

const mk = (over: Partial<MazeConfig> = {}, cols = 10, rows = 10) => mazeGrid(over, cols, rows);

const hero = (at: GridPoint, id = "h"): BattleParticipant => placed(id, { side: ParticipantSide.ALLY, at });

const keys = (m: Map<string, unknown>) => [...m.keys()].sort();

describe("mazeReachable", () => {
  it("3 кроки по коридору, 4-й - ні", () => {
    const h = hero({ x: 0, y: 0 });

    const r = mazeReachable(mk({ walls: ["0:0:s", "1:0:s", "2:0:s", "3:0:s", "4:0:s"] }, 10, 2), { participants: [h], mover: h, budget: 3 });

    expect(r.has("3:0")).toBe(true);
    expect(r.has("4:0")).toBe(false);
    expect(r.get("3:0")?.cost).toBe(3);
    expect(r.get("3:0")?.path.map((c) => c.x)).toEqual([0, 1, 2, 3]);
  });

  it("стіна, закритий кут, зайняті клітинки та прохід крізь істот блокують", () => {
    const h = hero({ x: 1, y: 1 });

    const sleeper = { ...placed("s", { at: { x: 2, y: 1 } }), battleData: { ...placed("s").battleData, position: { x: 2, y: 1 }, dormant: true } };

    const ally = hero({ x: 1, y: 2 }, "a");

    const r = mazeReachable(mk({ walls: ["1:1:s"] }), { participants: [h, sleeper, ally], mover: h, budget: 1 });

    expect(r.has("2:1")).toBe(false);
    expect(r.has("1:2")).toBe(false);

    const corner = mazeReachable(mk({ walls: ["1:1:e"] }), { participants: [h], mover: h, budget: 1 });

    expect(corner.has("2:2")).toBe(false);
    expect(corner.has("2:1")).toBe(false);

    const behind = mazeReachable(mk({ walls: ["3:1:s", "3:0:s", "3:2:s"] }, 10, 3), {
      participants: [h, hero({ x: 2, y: 1 }, "b"), hero({ x: 2, y: 0 }, "c"), hero({ x: 2, y: 2 }, "d")],
      mover: h,
      budget: 3,
    });

    expect(behind.has("3:1")).toBe(false);
  });

  it("телепорт і вихід - кінцеві клітинки", () => {
    const h = hero({ x: 0, y: 0 });

    const grid = mk({ teleports: [[{ x: 1, y: 0 }, { x: 8, y: 8 }]], exit: { x: 0, y: 2 } }, 10, 3);

    const r = mazeReachable(grid, { participants: [h], mover: h, budget: 3 });

    expect(r.has("1:0")).toBe(true);
    expect(r.has("2:0")).toBe(true);
    expect(r.has("0:2")).toBe(true);
    expect(r.has("0:3")).toBe(false);

    const through = mazeReachable(mk({ teleports: [[{ x: 1, y: 0 }, { x: 8, y: 8 }]] }, 10, 1), { participants: [h], mover: h, budget: 3 });

    expect(keys(through)).toEqual(["1:0"]);
  });

  it("limit обрізає зону", () => {
    const h = hero({ x: 0, y: 0 });

    const r = mazeReachable(mk(), { participants: [h], mover: h, budget: 3, limit: new Set(["1:0", "2:0"]) });

    expect(keys(r)).toEqual(["1:0", "2:0"]);
  });
});

describe("applyMazeMove", () => {
  it("крок на схід: facing e, витрачено кроки", () => {
    const h = hero({ x: 0, y: 0 });

    const r = applyMazeMove(mk(), { participants: [h], mover: h, to: { x: 2, y: 0 } });

    if ("error" in r) throw new Error(r.error);

    expect(r.mover.battleData).toMatchObject({ position: { x: 2, y: 0 }, facing: "e", movementUsed: 2 });
    expect(r.stepsUsed).toBe(2);
    expect(mazeBudgetLeft(r.mover)).toBe(1);
  });

  it("помилки: далеко, стіна, зайнято, ті ж координати", () => {
    const h = hero({ x: 0, y: 0 });

    const msg = "battleActions.maze.moveBlocked";

    expect(applyMazeMove(mk(), { participants: [h], mover: h, to: { x: 4, y: 0 } })).toEqual({ error: msg });
    expect(applyMazeMove(mk({ walls: ["0:0:e"] }, 10, 1), { participants: [h], mover: h, to: { x: 1, y: 0 } })).toEqual({ error: msg });
    expect(applyMazeMove(mk(), { participants: [h, hero({ x: 1, y: 0 }, "a")], mover: h, to: { x: 1, y: 0 } })).toEqual({ error: msg });
    expect(applyMazeMove(mk(), { participants: [h], mover: h, to: { x: 0, y: 0 } })).toEqual({ error: msg });
  });

  it("раніше витрачені кроки зменшують бюджет", () => {
    const h = { ...hero({ x: 0, y: 0 }), battleData: { ...hero({ x: 0, y: 0 }).battleData, movementUsed: 2 } };

    expect("error" in applyMazeMove(mk(), { participants: [h], mover: h, to: { x: 2, y: 0 } })).toBe(true);
  });

  it("фініш на телепорті переносить до парної, якщо вона вільна", () => {
    const h = hero({ x: 0, y: 0 });

    const grid = mk({ teleports: [[{ x: 1, y: 0 }, { x: 8, y: 8 }]] });

    const r = applyMazeMove(grid, { participants: [h], mover: h, to: { x: 1, y: 0 } });

    if ("error" in r) throw new Error(r.error);

    expect(r.teleported).toBe(true);
    expect(r.mover.battleData).toMatchObject({ position: { x: 8, y: 8 }, facing: "e" });

    const busy = applyMazeMove(grid, { participants: [h, hero({ x: 8, y: 8 }, "o")], mover: h, to: { x: 1, y: 0 } });

    if ("error" in busy) throw new Error(busy.error);

    expect(busy.teleported).toBe(false);
    expect(busy.mover.battleData.position).toEqual({ x: 1, y: 0 });
  });

  it("вихід: escaped", () => {
    const h = hero({ x: 0, y: 0 });

    const r = applyMazeMove(mk({ exit: { x: 1, y: 1 } }), { participants: [h], mover: h, to: { x: 1, y: 1 } });

    if ("error" in r) throw new Error(r.error);

    expect(r.escaped).toBe(true);
    expect(r.mover.battleData.escaped).toBe(true);
    expect(r.mover.battleData.facing).toBe("se");
  });
});

describe("placeMazeParticipants", () => {
  it("2x2 ворог отримує gridSize 1, інші без змін", () => {
    const big = placed("big", { size: 2 });

    const out = placeMazeParticipants(mk(), [big, placed("small", { size: 1 })]);

    expect(byId(out, "big").combatStats.gridSize).toBe(1);
    expect(byId(out, "small").combatStats.gridSize).toBe(1);
  });

  it("союзники на краю обличчям досередини, вороги всередині, без накладань", () => {
    const grid = mk();

    const out = placeMazeParticipants(grid, [placed("a1", { side: ParticipantSide.ALLY }), placed("a2", { side: ParticipantSide.ALLY }), placed("e1"), placed("keep", { at: { x: 4, y: 4 } })]);

    const a1 = byId(out, "a1").battleData;

    expect([0, 9]).toContain(a1.position?.x === 0 || a1.position?.x === 9 ? a1.position.x : a1.position?.y);
    expect(a1.facing).toBeDefined();

    const e1 = byId(out, "e1").battleData.position as GridPoint;

    expect(e1.x > 0 && e1.y > 0 && e1.x < 9 && e1.y < 9).toBe(true);
    expect(byId(out, "keep").battleData.position).toEqual({ x: 4, y: 4 });

    const cells = out.map((p) => `${p.battleData.position?.x}:${p.battleData.position?.y}`);

    expect(new Set(cells).size).toBe(cells.length);
  });
});

describe("вихід лише для героїв", () => {
  it("ворог на виході не «вибирається», герой — так", () => {
    const g = mazeGrid({ exit: { x: 5, y: 0 } }, 6);

    const enemy = placed("e", { at: { x: 4, y: 0 } });

    const out = applyMazeMove(g, { participants: [enemy], mover: enemy, to: { x: 5, y: 0 } });

    expect(out).toMatchObject({ escaped: false });
    expect("mover" in out && out.mover.battleData.escaped).toBeFalsy();

    const h = placed("h", { side: ParticipantSide.ALLY, at: { x: 4, y: 0 } });

    expect(applyMazeMove(g, { participants: [h], mover: h, to: { x: 5, y: 0 } })).toMatchObject({ escaped: true });
  });
});
