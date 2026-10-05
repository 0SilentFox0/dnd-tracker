import { describe, expect, it } from "vitest";

import { ARTIFACT_GRID_9 } from "@/lib/constants/artifacts";
import { buildEquipped } from "@/lib/utils/artifacts/equipment";

const [first, second] = ARTIFACT_GRID_9.map((c) => c.key);

describe("buildEquipped", () => {
  it("puts the artifact into the slot and keeps the others", () => {
    expect(buildEquipped({ [second]: "b" }, first, "a")).toEqual({ [first]: "a", [second]: "b" });
  });

  it("clears the slot on null and drops keys outside the grid", () => {
    expect(buildEquipped({ [first]: "a", junk: "x" }, first, null)).toEqual({});
  });
});
