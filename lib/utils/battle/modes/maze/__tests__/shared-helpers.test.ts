import { describe, expect, it } from "vitest";

import { flag, mazeOf } from "./fixtures";

import { ParticipantSide } from "@/lib/constants/battle";
import { MAZE_TEXTS } from "@/lib/constants/maze-texts";
import { placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { cellKey } from "@/lib/utils/battle/grid/geometry";
import {
  edgeCells,
  featureKeys,
  fogSet,
  isPlaced,
  mazeGridOf,
  mazeHeroes,
  mazeVision,
  mulberry32,
  onMazeField,
  parseEdgeKey,
  scatterFreeStarts,
  teleportPartner,
} from "@/lib/utils/battle/modes/maze";
import { modeEnter } from "@/lib/utils/battle/modes/server";

describe("ребра", () => {
  it("parseEdgeKey і edgeCells", () => {
    expect(parseEdgeKey("2:3:e")).toEqual({ a: { x: 2, y: 3 }, b: { x: 3, y: 3 }, side: "e" });
    expect(parseEdgeKey("2:3:s")).toEqual({ a: { x: 2, y: 3 }, b: { x: 2, y: 4 }, side: "s" });
    expect(edgeCells("0:0:s")).toEqual([{ x: 0, y: 0 }, { x: 0, y: 1 }]);
  });
});

describe("особливі клітинки", () => {
  const maze = mazeOf({ exit: { x: 5, y: 0 }, teleports: [[{ x: 1, y: 1 }, { x: 4, y: 4 }]] });

  it("featureKeys — вихід і обидва кінці телепортів", () => {
    expect([...featureKeys(maze)].sort()).toEqual(["1:1", "4:4", "5:0"]);
    expect(featureKeys(mazeOf()).size).toBe(0);
  });

  it("teleportPartner — інший кінець пари або null", () => {
    expect(teleportPartner(maze, { x: 4, y: 4 })).toEqual({ x: 1, y: 1 });
    expect(teleportPartner(maze, { x: 1, y: 1 })).toEqual({ x: 4, y: 4 });
    expect(teleportPartner(maze, { x: 2, y: 2 })).toBeNull();
  });
});

describe("сітка лабіринту", () => {
  it("mazeGridOf — лише для карти з лабіринтом", () => {
    const maze = mazeOf();

    expect(mazeGridOf(testMap(6, 4, { maze }))).toEqual({ cols: 6, rows: 4, maze });
    expect(mazeGridOf(testMap(6, 4))).toBeNull();
    expect(mazeGridOf(null)).toBeNull();
  });

  it("fogSet кешує набір на той самий масив туману", () => {
    const maze = mazeOf({ fog: ["1:1", "2:2"] });

    expect(fogSet(maze).has("2:2")).toBe(true);
    expect(fogSet(maze)).toBe(fogSet({ fog: maze.fog }));
    expect(fogSet(mazeOf()).size).toBe(0);
  });

  it("mazeVision кешує поле зору для тієї самої точки огляду й лабіринту", () => {
    const grid = { cols: 8, rows: 8, maze: mazeOf({ walls: ["3:3:e"] }) };

    const view = { position: { x: 3, y: 3 }, facing: "e" as const };

    expect(mazeVision(grid, view)).toBe(mazeVision(grid, { ...view }));
    expect(mazeVision(grid, view)).not.toBe(mazeVision(grid, { ...view, facing: "w" }));
    expect(mazeVision({ ...grid, maze: mazeOf() }, view).has("5:3")).toBe(true);
    expect(mazeVision(grid, view).has("5:3")).toBe(false);
  });
});

describe("статуси учасників", () => {
  const hero = placed("h", { side: ParticipantSide.ALLY, at: { x: 0, y: 0 } });

  const offMap = placed("o", { side: ParticipantSide.ALLY });

  it("isPlaced / onMazeField", () => {
    expect(isPlaced(hero)).toBe(true);
    expect(isPlaced(offMap)).toBe(false);
    expect(onMazeField(hero)).toBe(true);
    expect(onMazeField(flag(hero, { escaped: true }))).toBe(false);
    expect(onMazeField(flag(hero, { reserved: true }))).toBe(false);
    expect(onMazeField(offMap)).toBe(false);
  });

  it("mazeHeroes — живі герої в лабіринті, зокрема без клітинки", () => {
    const foe = placed("f", { at: { x: 1, y: 1 } });

    const gone = flag(placed("g", { side: ParticipantSide.ALLY }), { escaped: true });

    expect(mazeHeroes([hero, offMap, foe, gone]).map((p) => p.basicInfo.id)).toEqual(["h", "o"]);
  });

  it("modeEnter — лише ворог і лише в лабіринті", () => {
    const foe = placed("f");

    const maze = testMap(6, 6, { maze: mazeOf() });

    expect(modeEnter(maze, foe).battleData.dormant).toBe(true);
    expect(modeEnter(maze, hero)).toBe(hero);
    expect(modeEnter(testMap(6, 6), foe)).toBe(foe);
  });
});

describe("scatterFreeStarts", () => {
  const grid = { cols: 6, rows: 6, maze: mazeOf({ exit: { x: 5, y: 2 } }) };

  it("старти на краю, не на чужих клітинках", () => {
    const others = [{ x: 0, y: 0 }, { x: 1, y: 0 }];

    const out = scatterFreeStarts(grid, { heroIds: ["a", "b"], others }, mulberry32(7));

    if ("error" in out) throw new Error(out.error);

    const taken = new Set(others.map(cellKey));

    for (const c of Object.values(out.starts)) {
      expect(c.x === 0 || c.y === 0 || c.x === 5 || c.y === 5).toBe(true);
      expect(taken.has(cellKey(c))).toBe(false);
    }
  });

  it("замало крайніх клітинок — помилка розкидання", () => {
    const tiny = { cols: 2, rows: 2, maze: mazeOf() };

    expect(scatterFreeStarts(tiny, { heroIds: ["a", "b", "c", "d", "e"], others: [] }, mulberry32(1))).toEqual({ error: MAZE_TEXTS.scatterNoRoom });
  });

  it("замуровані старти з mustReachExit — помилка «замурують»", () => {
    const walled = { cols: 3, rows: 3, maze: mazeOf({ exit: { x: 1, y: 1 }, walls: ["0:1:e", "1:0:s", "1:1:e", "1:1:s"] }) };

    expect(scatterFreeStarts(walled, { heroIds: ["a"], others: [], mustReachExit: true }, mulberry32(3))).toEqual({ error: MAZE_TEXTS.walledIn });
  });
});
