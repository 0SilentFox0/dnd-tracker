import { describe, expect, it } from "vitest";

import { SPELLS } from "@/data/library/spells";
import { AURA_BY_NAME } from "@/lib/utils/battle/fx/aura";
import { SPELL_FX_OVERRIDES } from "@/lib/utils/battle/fx/overrides";

// Signatures are keyed by name, so a renamed library spell would silently fall back to the generic look.
describe("FX maps keyed by spell name", () => {
  const names = new Set(SPELLS.map((s) => s.name));

  it("every SPELL_FX_OVERRIDES key is a library spell", () => {
    expect(Object.keys(SPELL_FX_OVERRIDES).filter((n) => !names.has(n))).toEqual([]);
  });

  it("every AURA_BY_NAME key is a library spell", () => {
    expect(Object.keys(AURA_BY_NAME).filter((n) => !names.has(n))).toEqual([]);
  });
});
