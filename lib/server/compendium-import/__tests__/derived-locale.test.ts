import { describe, expect, it } from "vitest";

import { adaptCompendium } from "../adapt";
import { equipmentText, proficiencyText } from "../adapters/character-traits";
import { derivedTranslator } from "../derived-text";
import { parseCompendium } from "../parse";

const subrace = JSON.stringify({ _meta: { sources: [{ json: "T" }] }, subrace: [{ name: "Sub", raceName: "Elf", raceSource: "T", source: "T", size: ["M"], speed: 35, languageProficiencies: [{ common: true }], entries: ["x"] }] });

const lineage = (locale: "uk" | "en") => {
  const entry = adaptCompendium(parseCompendium(subrace), { locale }).entries[0];

  const body = entry.body as { choices: Array<{ label: string; options: Array<{ description: string }> }> };

  return { label: body.choices[0].label, description: body.choices[0].options[0].description };
};

describe("derived import text follows the importer's locale", () => {
  it("writes the lineage label and size/speed head in en", () => {
    const { label, description } = lineage("en");

    expect(label).toBe("Lineage");
    expect(description).toContain("Size: medium");
    expect(description).toContain("Speed: walking 35 ft.");
    expect(description).toContain("Languages: common");
  });

  it("keeps the previous uk text", () => {
    const { label, description } = lineage("uk");

    expect(label).toBe("Походження");
    expect(description).toContain("Розмір: середній");
    expect(description).toContain("Швидкість: ходьба 35 фт.");
  });

  it("translates money and choice texts", () => {
    expect(equipmentText([{ _: [{ value: 1100 }], a: [{ equipmentType: "weaponMartial" }] }], derivedTranslator("en"))).toBe("11 gp; choose: a) any: weapon Martial");
    expect(proficiencyText([{ choose: { from: ["thieves"], count: 2 } }], derivedTranslator("en")).text).toBe("choose 2 from: thieves");
  });
});
