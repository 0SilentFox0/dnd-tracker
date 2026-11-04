import { describe, expect, it } from "vitest";

import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { reorderParticipants } from "@/lib/utils/battle/turn/reorder-initiative";

const ps = ["a", "b", "c"].map((id) => makeParticipant({ id }));

describe("reorderParticipants", () => {
  it("applies a valid permutation", () => {
    expect(reorderParticipants(ps, ["c", "a", "b"])?.map((p) => p.basicInfo.id)).toEqual(["c", "a", "b"]);
  });

  it.each([
    ["duplicate", ["a", "a", "b"]],
    ["foreign", ["a", "b", "x"]],
    ["missing", ["a", "b"]],
    ["empty", []],
  ])("returns null for %s", (_n, order) => {
    expect(reorderParticipants(ps, order)).toBeNull();
  });
});
