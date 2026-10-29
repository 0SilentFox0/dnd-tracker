import { describe, expect, it } from "vitest";

import { isPlayable } from "../geometry";
import { pathTo, reachable } from "../path";
import { diffTerrain } from "../terrain";

import { placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import type { TerrainCell } from "@/types/battle";

const mover = placed("m", { at: { x: 0, y: 0 } });

const withTerrain = (terrain: Record<string, TerrainCell>) => testMap(6, 1, { terrain });

describe("складна місцевість", () => {
  it("клітинка difficult коштує 2, але прохідна", () => {
    const map = withTerrain({ "1:0": { kind: "difficult" } });

    const reach = reachable(map, [mover], mover, 5);

    expect(isPlayable(map, { x: 1, y: 0 })).toBe(true);
    expect(reach.get("1:0")).toBe(2);
    expect(reach.get("2:0")).toBe(3);
    expect(reach.has("5:0")).toBe(false);
  });

  it("прапорець difficult на небезпеці теж подвоює вартість", () => {
    const map = withTerrain({ "1:0": { kind: "hazard", difficult: true } });

    expect(reachable(map, [mover], mover, 5).get("2:0")).toBe(3);
  });

  it("reachable і pathTo дають один і той самий кінцевий набір", () => {
    const map = testMap(6, 3, { terrain: { "1:0": { kind: "difficult" }, "1:1": { kind: "difficult" }, "2:1": { kind: "difficult" } } });

    const reach = reachable(map, [mover], mover, 5);

    expect(reach.has("4:0")).toBe(true);

    for (const key of reach.keys()) {
      const [x, y] = key.split(":").map(Number);

      expect(pathTo(map, [mover], mover, { x, y }, 5)?.at(-1)).toEqual({ x, y });
    }

    expect(reach.has("5:0")).toBe(false);
    expect(pathTo(map, [mover], mover, { x: 5, y: 0 }, 5)).toBeNull();
  });

  it("шлях обходить складну клітинку, якщо обхід дешевший", () => {
    const map = testMap(3, 3, { terrain: { "1:0": { kind: "difficult" } } });

    const path = pathTo(map, [mover], mover, { x: 2, y: 0 }, 3);

    expect(path?.map((p) => `${p.x}:${p.y}`)).not.toContain("1:0");
  });

  it("мапа без difficult не змінюється", () => {
    const map = testMap(4, 1);

    expect([...reachable(map, [mover], mover, 3)]).toEqual([["1:0", 1], ["2:0", 2], ["3:0", 3]]);
  });

  it("diffTerrain розрізняє клітинки з різними прапорцями", () => {
    const diff = diffTerrain({ "1:0": { kind: "hazard" } }, { "1:0": { kind: "hazard", obscured: true } });

    expect(diff?.set?.[0].keys).toEqual(["1:0"]);
  });
});
