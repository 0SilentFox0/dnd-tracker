import { describe, expect, it } from "vitest";

import { SYSTEM_UI, systemUiOf } from "../registry";

describe("system ui registry", () => {
  it("has the three systems, homm and dnd5e share the d20 ui", () => {
    expect(Object.keys(SYSTEM_UI).sort()).toEqual(["dnd5e", "homm", "wfrp"]);
    expect(systemUiOf("homm")).toBe(systemUiOf("dnd5e"));
    expect(systemUiOf("wfrp")).not.toBe(systemUiOf("homm"));
  });

  it("wfrp hides progression, d20 does not", () => {
    expect(systemUiOf("wfrp").hideProgression).toBe(true);
    expect(systemUiOf("homm").hideProgression).toBe(false);
  });
});
