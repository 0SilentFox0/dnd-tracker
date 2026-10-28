import { describe, expect, it } from "vitest";

import { EffectSchema } from "@/lib/utils/abilities/schema";

describe("4c-2 ability schema", () => {
  it("accepts attacksPerAction stat", () => {
    expect(EffectSchema.safeParse({ kind: "modifyStat", stat: "attacksPerAction", flat: 1 }).success).toBe(true);
  });

  it("accepts twoWeaponFighting flag", () => {
    expect(EffectSchema.safeParse({ kind: "flag", flag: "twoWeaponFighting" }).success).toBe(true);
  });
});
