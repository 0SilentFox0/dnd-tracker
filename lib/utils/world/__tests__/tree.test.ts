import { describe, expect, it } from "vitest";

import { mapPath, subtreeMapIds } from "../tree";

import type { WorldMapSummary } from "@/types/world";

const m = (id: string, parentMapId: string | null): WorldMapSummary => ({ id, name: id, parentMarkerId: null, parentMapId, imageUrl: "", width: 1, height: 1 });

describe("mapPath", () => {
  it("від кореня до міста", () => {
    expect(mapPath([m("world", null), m("kingdom", "world"), m("city", "kingdom")], "city").map((x) => x.id)).toEqual(["world", "kingdom", "city"]);
  });

  it("невідомий id → []", () => {
    expect(mapPath([m("a", null)], "zzz")).toEqual([]);
  });

  it("цикл не зависає", () => {
    expect(mapPath([m("a", "b"), m("b", "a")], "a").length).toBe(2);
  });

  it("обрив ланцюга → відомий хвіст", () => {
    expect(mapPath([m("b", "gone")], "b").map((x) => x.id)).toEqual(["b"]);
  });
});

describe("subtreeMapIds", () => {
  it("глибина 3 з двома гілками", () => {
    const maps = [m("r", null), m("a", "r"), m("b", "r"), m("a1", "a"), m("a1x", "a1"), m("other", null)];

    expect(subtreeMapIds(maps, "r").sort()).toEqual(["a", "a1", "a1x", "b", "r"]);
    expect(subtreeMapIds(maps, "a").sort()).toEqual(["a", "a1", "a1x"]);
  });
});
