import { describe, expect, it } from "vitest";

import { convertArtifacts } from "../convert/artifacts";
import { FIXTURE_4F2_DIR, loadOpen5e } from "../lib/open5e";

import { createArtifactSchema } from "@/lib/schemas/artifacts";

const items = convertArtifacts(loadOpen5e(FIXTURE_4F2_DIR));

const item = (name: string) => items.find((i) => i.name === name)!;

describe("convertArtifacts: armor", () => {
  it("4 armors + shield, armor slot", () => {
    expect(items.map((i) => i.name).sort()).toEqual(["Breastplate", "Chain Mail", "Leather Armor", "Plate Armor", "Shield"]);
    expect(items.filter((i) => i.slot === "armor")).toHaveLength(4);
  });

  it("Chain Mail: heavy 16, Strength 13, stealth disadvantage", () => {
    expect(item("Chain Mail")).toMatchObject({ slug: "srd-2024_chain-mail", rarity: "common", slot: "armor", armor: { category: "heavy", base: 16, strength: 13, stealthDisadvantage: true } });
    expect(item("Chain Mail").description).toBe("Heavy Armor. Armor Class: 16. Strength: 13. Stealth: Disadvantage. Cost: 75 GP. Weight: 55 lb.");
  });

  it("Breastplate: medium 14 (Dex cap 2 by category); Leather: light 11", () => {
    expect(item("Breastplate").armor).toEqual({ category: "medium", base: 14 });
    expect(item("Breastplate").description).toBe("Medium Armor. Armor Class: 14 + Dex modifier (max 2). Cost: 400 GP. Weight: 20 lb.");
    expect(item("Leather Armor").armor).toEqual({ category: "light", base: 11 });
    expect(item("Plate Armor").armor).toEqual({ category: "heavy", base: 18, strength: 15, stealthDisadvantage: true });
  });

  it("every armor row passes the artifact schema", () => {
    for (const row of items.filter((i) => i.slot === "armor")) {
      const { slug: _slug, ...body } = row;

      expect(createArtifactSchema.safeParse(body).success, row.name).toBe(true);
    }
  });
});
