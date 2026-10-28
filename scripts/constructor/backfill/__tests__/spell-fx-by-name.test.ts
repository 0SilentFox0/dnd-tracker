import { describe, expect, it } from "vitest";

import { SPELL_FX_BY_NAME } from "../spell-fx-by-name";

import { SPELLS } from "@/data/library/spells";
import { SpellFxSchema } from "@/lib/utils/battle/fx/spell-fx-schema";

describe("SPELL_FX_BY_NAME", () => {
  it("every key is a library spell", () => {
    const names = new Set(SPELLS.map((s) => s.name));

    expect(Object.keys(SPELL_FX_BY_NAME).filter((n) => !names.has(n))).toEqual([]);
  });

  it("every entry passes the spells.fx schema", () => {
    const invalid = Object.entries(SPELL_FX_BY_NAME).filter(([, fx]) => !SpellFxSchema.safeParse(fx).success);

    expect(invalid).toEqual([]);
  });
});
