import { describe, expect, it } from "vitest";

import { areIllusionFoes, disguiseFor, illusionPairs, illusionPartner } from "../illusion";

import { emptyMaze } from "@/lib/utils/battle/modes/maze/constants";
import type { IllusionPair } from "@/types/battle";

const pair: IllusionPair = {
  a: "zehir",
  b: "godric",
  aSees: { name: "Wolf", unitId: "u1" },
  bSees: { name: "Rogue", avatar: "/r.png" },
};

const other: IllusionPair = { a: "x", b: "y", aSees: { name: "A" }, bSees: { name: "B" } };

describe("illusion helpers", () => {
  it("illusionPairs reads the maze config and tolerates absence", () => {
    expect(illusionPairs(undefined)).toEqual([]);
    expect(illusionPairs(null)).toEqual([]);
    expect(illusionPairs(emptyMaze())).toEqual([]);
    expect(illusionPairs({ ...emptyMaze(), illusionSwap: { pairs: [pair] } })).toEqual([pair]);
  });

  it("illusionPartner finds the pair by either side", () => {
    expect(illusionPartner([pair, other], "godric")).toBe(pair);
    expect(illusionPartner([pair, other], "x")).toBe(other);
    expect(illusionPartner([pair], "c")).toBeUndefined();
  });

  it("areIllusionFoes is symmetric and pair-local", () => {
    expect(areIllusionFoes([pair, other], "zehir", "godric")).toBe(true);
    expect(areIllusionFoes([pair, other], "godric", "zehir")).toBe(true);
    expect(areIllusionFoes([pair, other], "zehir", "x")).toBe(false);
    expect(areIllusionFoes([pair], "zehir", "zehir")).toBe(false);
  });

  it("disguiseFor gives each viewer the mask of its partner", () => {
    expect(disguiseFor([pair], "zehir", "godric")).toBe(pair.aSees);
    expect(disguiseFor([pair], "godric", "zehir")).toBe(pair.bSees);
    expect(disguiseFor([pair], "c", "godric")).toBeUndefined();
    expect(disguiseFor([pair], "zehir", "c")).toBeUndefined();
  });
});
