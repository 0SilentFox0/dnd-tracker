import { describe, expect, it } from "vitest";

import { createWorldMarkerSchema } from "../world";

const zone = (polygon: [number, number][]) => createWorldMarkerSchema.safeParse({ mapId: "m", kind: "zone", x: 0.5, y: 0.5, polygon, name: "Z" });

describe("polygon schema", () => {
  it("rejects 3 identical vertices", () => {
    expect(zone([[0.1, 0.1], [0.1, 0.1], [0.1, 0.1]]).success).toBe(false);
  });

  it("rejects fewer than 3 distinct vertices", () => {
    expect(zone([[0.1, 0.1], [0.4, 0.4], [0.1, 0.1]]).success).toBe(false);
  });

  it("accepts 3 distinct vertices", () => {
    expect(zone([[0.1, 0.1], [0.4, 0.1], [0.2, 0.4]]).success).toBe(true);
  });
});
