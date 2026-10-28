import { describe, expect, it } from "vitest";

import { magicMainSkillIds } from "@/lib/utils/battle/balance/magic-school";

describe("magicMainSkillIds", () => {
  it("role magic or a linked spell group counts as magic; the name does not", () => {
    const ids = magicMainSkillIds([
      { id: "a", role: "magic" },
      { id: "b", role: null, spellGroupId: "g1" },
      { id: "c", role: "attack" },
      { id: "d", role: null, spellGroupId: null },
    ]);

    expect([...ids].sort()).toEqual(["a", "b"]);
  });

  it("empty campaign → empty set", () => expect(magicMainSkillIds([]).size).toBe(0));
});
