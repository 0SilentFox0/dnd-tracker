import { describe, expect, it } from "vitest";

import {
  getUniqueSpellIds,
  parseSpellsTestingMd,
  type SpellTestCase,
} from "../spells-testing-parser";

const SAMPLE = `
1. cmldnjuk40009ipdsnhiziq6n - Slow

- D3 speed of TE -50%
- D3 initiative of TE -2

-ST WIZ >= 14

2. cmldnjuk4000aipds9faf2kkv - Sorrow

- D3 morale of TE -2
- D3 saving throw of TE -2

-ST WIZ >= 14

3. cmldnjuk4000wipdspuumzd31 - Divine_Strength

- B3 TA +all dice size (example d4->d6, d6->d8 etc)

- HT INT >= 14
`;

describe("parseSpellsTestingMd", () => {
  it("парсить блок з ST (saving throw)", () => {
    const cases = parseSpellsTestingMd(SAMPLE);

    const slow = cases.find((c) => c.spellId === "cmldnjuk40009ipdsnhiziq6n");

    expect(slow).toBeDefined();
    expect(slow?.name).toBe("Slow");
    expect(slow?.savingThrow).toEqual({ ability: "wisdom", dc: 14 });
    expect(slow?.hitCheck).toBe("no");
    expect(slow?.assertions).toContain("D3 speed of TE -50%");
    expect(slow?.assertions).toContain("D3 initiative of TE -2");
  });

  it("парсить блок з HT (hit check)", () => {
    const cases = parseSpellsTestingMd(SAMPLE);

    const divine = cases.find((c) => c.spellId === "cmldnjuk4000wipdspuumzd31");

    expect(divine).toBeDefined();
    expect(divine?.name).toBe("Divine_Strength");
    expect(divine?.hitCheck).toEqual({ ability: "intelligence", dc: 14 });
    expect(divine?.savingThrow).toBe("no");
  });

  it("нормалізує WIZ -> wisdom, INT -> intelligence", () => {
    const cases = parseSpellsTestingMd(SAMPLE);

    const sorrow = cases.find((c) => c.spellId === "cmldnjuk4000aipds9faf2kkv");

    expect(sorrow?.savingThrow).toEqual({ ability: "wisdom", dc: 14 });

    const divine = cases.find((c) => c.spellId === "cmldnjuk4000wipdspuumzd31");

    expect(divine?.hitCheck).toEqual({ ability: "intelligence", dc: 14 });
  });
});

describe("ST - no / HT NO", () => {
  const sampleNo = `
1. spellid12345678901234567890 - NoSaveSpell
- some effect
-ST - no

2. spellid22345678901234567890 - NoHitSpell
- other effect
- HT NO
`;

  it("парсить ST - no", () => {
    const cases = parseSpellsTestingMd(sampleNo);

    const noSave = cases.find((c) => c.name === "NoSaveSpell");

    expect(noSave?.savingThrow).toBe("no");
  });

  it("парсить HT NO", () => {
    const cases = parseSpellsTestingMd(sampleNo);

    const noHit = cases.find((c) => c.name === "NoHitSpell");

    expect(noHit?.hitCheck).toBe("no");
  });
});

describe("full SPELLS_TESTING.md", () => {
  it("парсить реальний файл без помилок", async () => {
    const fs = await import("fs");

    const path = await import("path");

    const content = fs.readFileSync(
      path.join(process.cwd(), "docs", "SPELLS_TESTING.md"),
      "utf8",
    );

    const cases = parseSpellsTestingMd(content);

    const ids = getUniqueSpellIds(cases);

    expect(cases.length).toBeGreaterThan(30);
    expect(ids.length).toBeGreaterThan(30);
  });
});

describe("getUniqueSpellIds", () => {
  it("повертає унікальні id збережені в порядку", () => {
    const cases: SpellTestCase[] = [
      {
        spellId: "a",
        name: "A",
        assertions: [],
        savingThrow: "no",
        hitCheck: "no",
      },
      {
        spellId: "b",
        name: "B",
        assertions: [],
        savingThrow: "no",
        hitCheck: "no",
      },
      {
        spellId: "a",
        name: "A2",
        assertions: [],
        savingThrow: "no",
        hitCheck: "no",
      },
    ];

    expect(getUniqueSpellIds(cases)).toEqual(["a", "b"]);
  });
});
