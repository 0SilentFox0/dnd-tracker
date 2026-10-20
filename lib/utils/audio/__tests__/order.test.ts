import { describe, expect, it } from "vitest";

import { moveTrack } from "../order";

describe("moveTrack", () => {
  it("міняє місцями з сусідом; за межами — той самий масив", () => {
    const ids = ["a", "b", "c"];

    expect(moveTrack(ids, 0, 1)).toEqual(["b", "a", "c"]);
    expect(moveTrack(ids, 2, -1)).toEqual(["a", "c", "b"]);
    expect(moveTrack(ids, 0, -1)).toBe(ids);
    expect(moveTrack(ids, 2, 1)).toBe(ids);
  });
});
