import { describe, expect, it } from "vitest";

import { SpellType } from "@/lib/constants/spell-abilities";
import { csvRowToImportSpell } from "@/lib/utils/spells/spell-import";
import type { CSVSpellRow } from "@/types/import";

describe("csvRowToImportSpell", () => {
  it("maps the UA columns and derives the defaults", () => {
    const s = csvRowToImportSpell({ "UA Name": " Вогняна куля ", "Original Name": "Fireball", Level: "3", School: "Evocation", Effect: "8d6 fire damage in a 20-foot radius, DEX save for half" } as CSVSpellRow);

    expect(s.name).toBe("Вогняна куля");
    expect(s.level).toBe(3);
    expect(s.castingTime).toBe("1 action");
    expect(s.components).toBe("V, S");
    expect(s.description).toBe("Fireball ( Вогняна куля ): 8d6 fire damage in a 20-foot radius, DEX save for half");
    expect(s.range).toBe(s.type === SpellType.AOE ? "60 feet" : "Touch");
  });

  it("defaults a missing level to 0", () => {
    expect(csvRowToImportSpell({ name: "X", Effect: "" } as CSVSpellRow).level).toBe(0);
  });
});
