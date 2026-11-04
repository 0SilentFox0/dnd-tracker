import { describe, expect, it } from "vitest";

import { resourcesEditSchema, restSchema, sheetRollSchema } from "../out-of-combat";

describe("out-of-combat wfrp schemas", () => {
  it("accepts both test variants and defaults difficulty", () => {
    expect(sheetRollSchema.parse({ kind: "test", characteristic: "ws" })).toEqual({ kind: "test", characteristic: "ws", difficulty: "challenging" });
    expect(sheetRollSchema.parse({ kind: "test", skill: "melee", spec: "flail", difficulty: "hard" })).toEqual({ kind: "test", skill: "melee", spec: "flail", difficulty: "hard" });
  });

  it("rejects useInspiration with test and bad keys", () => {
    expect(sheetRollSchema.safeParse({ kind: "test", characteristic: "ws", useInspiration: true }).success).toBe(false);
    expect(sheetRollSchema.safeParse({ kind: "test", skill: "Melee" }).success).toBe(false);
    expect(sheetRollSchema.safeParse({ kind: "test", characteristic: "xx" }).success).toBe(false);
  });

  it("d20 variants still parse", () => {
    expect(sheetRollSchema.safeParse({ kind: "save", ability: "wisdom" }).success).toBe(true);
  });

  it("rest accepts session", () => {
    expect(restSchema.safeParse({ kind: "session", characterIds: ["a"] }).success).toBe(true);
  });

  it("fortune is 0..9", () => {
    expect(resourcesEditSchema.safeParse({ fortune: 3 }).success).toBe(true);
    expect(resourcesEditSchema.safeParse({ fortune: 10 }).success).toBe(false);
  });
});
