import { describe, expect, it } from "vitest";

import { SpellFxSchema } from "@/lib/utils/battle/fx/spell-fx-schema";

describe("SpellFxSchema", () => {
  it("accepts a partial fx", () => {
    expect(SpellFxSchema.parse({ archetype: "swarm", element: "nature" })).toEqual({ archetype: "swarm", element: "nature" });
  });

  it("rejects an unknown archetype", () => {
    expect(SpellFxSchema.safeParse({ archetype: "nope" }).success).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(SpellFxSchema.safeParse({ archetype: "swarm", color: "red" }).success).toBe(false);
  });
});
