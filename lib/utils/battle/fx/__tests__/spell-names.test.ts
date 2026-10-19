import { describe, expect, it } from "vitest";

import { SPELLS } from "@/data/library/spells";
import { SPELL_FX, spellFx } from "@/lib/utils/battle/fx/spells";

// Signatures are keyed by name, so a renamed library spell would silently fall back to the generic look.
describe("SPELL_FX keyed by spell name", () => {
  it("every key is a library spell", () => {
    const names = new Set(SPELLS.map((s) => s.name));

    expect(Object.keys(SPELL_FX).filter((n) => !names.has(n))).toEqual([]);
  });

  it("names of Object.prototype members are not signatures", () => {
    expect(spellFx("constructor")).toBeUndefined();
    expect(spellFx(undefined)).toBeUndefined();
  });
});
