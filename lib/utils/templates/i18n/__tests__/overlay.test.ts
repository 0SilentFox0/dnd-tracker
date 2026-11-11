import { describe, expect, it } from "vitest";

import { applyOverlay, translateAt } from "../overlay";

const tr = { "spells/bless/name": { text: "Благословення", en: "Bless" }, "spells/bless/description": { text: "Дає {n} HP", en: "Gives {n} HP" } };

describe("translateAt", () => {
  it("returns the translation, applies a stale one, and falls back when missing", () => {
    expect(translateAt(tr, "spells/bless/name", "Bless")).toBe("Благословення");
    expect(translateAt(tr, "spells/bless/name", "Greater Bless")).toBe("Благословення");
    expect(translateAt(tr, "spells/other/name", "Other")).toBe("Other");
    expect(translateAt(tr, "constructor", "Other")).toBe("Other");
  });

  it("keeps English when the placeholders differ", () => {
    expect(translateAt(tr, "spells/bless/description", "Gives {x} HP")).toBe("Gives {x} HP");
    expect(translateAt(tr, "spells/bless/description", "Gives {n} HP")).toBe("Дає {n} HP");
  });
});

describe("applyOverlay", () => {
  const data = { spells: [{ slug: "bless", name: "Bless", description: "Gives {n} HP" }], classes: [{ slug: "cleric", name: "Cleric", spellList: "Cleric" }], units: [] };

  it("translates rows by key and resolves name references over the given kinds", () => {
    const out = applyOverlay(data, { ...tr, "classes/cleric/name": { text: "Жрець", en: "Cleric" } }, ["spells", "classes"]);

    expect(out.spells[0]).toEqual({ slug: "bless", name: "Благословення", description: "Дає {n} HP" });
    expect(out.classes[0]).toMatchObject({ name: "Жрець", spellList: "Жрець" });
    expect(out.units).toBe(data.units);
  });

  it("does not translate kinds outside the list and returns the input for an empty dictionary", () => {
    expect(applyOverlay(data, tr, ["classes"]).spells).toBe(data.spells);
    expect(applyOverlay(data, {}, ["spells"])).toBe(data);
  });
});
