import { describe, expect, it } from "vitest";

import { describeRoot, rootsToReplace } from "../world-map-roots";

const hand = { id: "r1", name: "Ашан", maps: 3, markers: 12 };

describe("rootsToReplace", () => {
  it("no roots: nothing to replace", () => {
    expect(rootsToReplace([], false)).toEqual([]);
  });

  it("refuses any existing root, even one named Ashan, without --replace", () => {
    expect(() => rootsToReplace([hand], false)).toThrow(/--replace/);
    expect(() => rootsToReplace([{ ...hand, name: "My world" }], false)).toThrow(/My world/);
  });

  it("with --replace returns the roots to delete", () => {
    expect(rootsToReplace([hand], true)).toEqual([hand]);
  });

  it("describes nested counts", () => {
    expect(describeRoot(hand)).toBe("«Ашан» (вкладених карт: 2, маркерів: 12)");
  });
});
