import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { backgroundFeatVariants,convertBackgrounds } from "../convert/backgrounds";
import { convertFeats } from "../convert/feats";
import { FIXTURE_4F4_DIR, loadOpen5e } from "../lib/open5e";

import { createBackgroundSchema } from "@/lib/schemas/backgrounds";

const read = (name: string) => JSON.parse(readFileSync(join(__dirname, "fixtures-backgrounds", `${name}.json`), "utf8"));

const data = { ...loadOpen5e(FIXTURE_4F4_DIR), backgrounds: read("Background"), backgroundBenefits: read("BackgroundBenefit") };

describe("pinned SRD backgrounds", () => {
  it("converts four records with exact abilities, skills and manual equipment", () => {
    const rows = convertBackgrounds(data);

    expect(rows.map((r) => [r.name, r.choices[0].abilities, r.skillProficiencies, r.originFeatId])).toEqual([
      ["Acolyte", ["intelligence", "wisdom", "charisma"], ["insight", "religion"], "Magic Initiate (Cleric)"],
      ["Criminal", ["dexterity", "constitution", "intelligence"], ["sleightOfHand", "stealth"], "Alert"],
      ["Sage", ["constitution", "intelligence", "wisdom"], ["arcana", "history"], "Magic Initiate (Wizard)"],
      ["Soldier", ["strength", "dexterity", "constitution"], ["athletics", "intimidation"], "Savage Attacker"],
    ]);
    for (const { slug: _slug, ...row } of rows) {
      expect(row.choices[0]).toMatchObject({ count: 3, points: 3, maxPerAbility: 2, max: 20 });
      expect(row.equipmentText).toContain("(B) 50 GP");
      expect(createBackgroundSchema.safeParse(row).success).toBe(true);
    }
    expect(rows[3].toolProficiencies).toEqual([]);
    expect(rows[3].description).toContain("Choose one kind of Gaming Set");
  });
  it("resolves specified Magic Initiate spell lists through origin feat variants", () => {
    const variants = backgroundFeatVariants(data, convertFeats(data));

    expect(variants.map((f) => f.name)).toEqual(["Magic Initiate (Cleric)", "Magic Initiate (Wizard)"]);
    for (const f of variants) expect(f.choices.every((c) => c.spells?.lists.length === 1)).toBe(true);

    const all = [...convertFeats(data), ...variants];

    expect(convertBackgrounds(data).every((b) => all.some((f) => f.name === b.originFeatId && f.type === "origin"))).toBe(true);
  });
});
