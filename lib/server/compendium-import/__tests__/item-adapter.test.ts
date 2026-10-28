import { describe, expect, it } from "vitest";

import { adaptCompendium } from "../adapt";

import { createArtifactSchema } from "@/lib/schemas/artifacts";

const adapt = (row: Record<string, unknown>, kind: "item" | "baseitem" = "item", extra: Record<string, unknown> = {}) => {
  const result = adaptCompendium({ _meta: { edition: "one" }, ...extra, [kind]: [{ name: "Synthetic Item", source: "Test", entries: ["Synthetic text."], ...row }] });

  return result.entries.find((e) => e.kind === "artifacts")!;
};

const codes = (e: { issues: Array<{ code: string }> }) => e.issues.map((i) => i.code).filter((c) => c === "MANUAL_ITEM_EFFECT" || c === "UNSUPPORTED_FIELD");

describe("item consumable and uniqueness", () => {
  it("potions, scrolls and CNS-tagged items are consumable and non-unique", () => {
    for (const row of [{ type: "P", rarity: "rare" }, { type: "SC", rarity: "uncommon" }, { rarity: "common", miscTags: ["CNS"] }]) {
      const entry = adapt(row);

      expect(entry.body.item).toEqual({ unique: false, consumable: true });
      expect(createArtifactSchema.safeParse(entry.body).success).toBe(true);
    }
  });

  it("a custom item type named like an ingredient is consumable", () => {
    const entry = adapt({ type: "Ingred", rarity: "common" }, "baseitem", { itemType: [{ name: "Ingredient", abbreviation: "Ingred", source: "Test" }] });

    expect(entry.body.item).toEqual({ unique: false, consumable: true });
  });

  it("mundane gear and ordinary magic items are non-unique, artifacts and unknown rarity stay unique", () => {
    expect(adapt({ type: "G", rarity: "none" }).body.item).toMatchObject({ unique: false });
    expect(adapt({ rarity: "uncommon", wondrous: true }).body.item).toMatchObject({ unique: false });
    expect(adapt({ rarity: "artifact", wondrous: true }).body.item).toMatchObject({ unique: true });
    expect(adapt({ rarity: "unknown (magic)" }).body.item).toMatchObject({ unique: true });
    expect(adapt({ type: "M", rarity: "none", dmg1: "1d6", dmgType: "P" }, "baseitem").body.item).toMatchObject({ unique: false });
  });
});

describe("item magic effects", () => {
  it("+N weapon bonus goes to the weapon stats", () => {
    const entry = adapt({ type: "M", rarity: "uncommon", dmg1: "1d8", dmgType: "B", bonusWeapon: "+1" });

    expect(entry.body.weapon).toMatchObject({ damageDice: "1d8", attackBonus: 1, damageBonus: 1 });
    expect(codes(entry)).toEqual([]);
    expect(createArtifactSchema.safeParse(entry.body).success).toBe(true);
  });

  it("armor and saving throw bonuses become a passive ability, resistance too", () => {
    const entry = adapt({ type: "LA", rarity: "rare", ac: 11, bonusAc: "+2", bonusSavingThrow: "+1", resist: ["fire", "cold"] });

    expect(entry.body.abilities).toEqual([{ id: "bonuses", name: "Бонуси предмета", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 2 }, { kind: "modifyStat", stat: "savingThrow", flat: 1 }, { kind: "flag", flag: "resistance", damageType: "fire", percent: 50 }, { kind: "flag", flag: "resistance", damageType: "cold", percent: 50 }] }]);
    expect(codes(entry)).toEqual([]);
    expect(createArtifactSchema.safeParse(entry.body).success).toBe(true);
  });

  it("a potion's effects become a timed drink ability with the duration from the text", () => {
    const entry = adapt({ type: "P", rarity: "uncommon", resist: ["cold"], bonusAc: "+2", entries: ["For 1 minute, you gain a +2 bonus to AC and resistance to cold damage."] });

    expect(entry.body.abilities).toEqual([{ id: "drink", name: "Випити", trigger: { event: "bonusAction" }, limits: { pool: { key: "charges", cost: 1 } }, effects: [{ kind: "modifyStat", stat: "armor", flat: 2, duration: { rounds: 10 } }, { kind: "flag", flag: "resistance", damageType: "cold", percent: 50, duration: { rounds: 10 } }] }]);
    expect(codes(entry)).toEqual([]);
    expect(createArtifactSchema.safeParse(entry.body).success).toBe(true);
  });

  it("a long potion duration is capped and a potion without a parsable duration stays manual", () => {
    expect(adapt({ type: "P", resist: ["fire"], entries: ["For the next 8 hours you resist fire."] }).body.abilities).toMatchObject([{ effects: [{ duration: { rounds: 99 } }] }]);

    const entry = adapt({ type: "P", resist: ["fire"], entries: ["You resist fire for the duration."] });

    expect(entry.body.abilities).toMatchObject([{ id: "drink", effects: [{ kind: "note" }] }]);
    expect(codes(entry)).toEqual(["MANUAL_ITEM_EFFECT"]);
    expect(entry.notes).toContain("resist");
  });

  it("a plain consumable gets a note-only use ability", () => {
    const entry = adapt({ type: "SC", entries: ["Read it."] });

    expect(entry.body.abilities).toMatchObject([{ id: "use", trigger: { event: "action" }, effects: [{ kind: "note" }] }]);
    expect(createArtifactSchema.safeParse(entry.body).success).toBe(true);
  });

  it("effects the engine does not model are reported by field name and kept in notes", () => {
    const entry = adapt({ type: "P", rarity: "rare", modifySpeed: { static: { fly: 90 } }, grantsProficiency: true, attachedSpells: ["fly"], bonusAc: "oops" });

    expect(entry.issues.filter((i) => i.code === "MANUAL_ITEM_EFFECT").map((i) => i.path.split(".").pop()).sort()).toEqual(["attachedSpells", "bonusAc", "grantsProficiency", "modifySpeed"]);
    expect(entry.issues.map((i) => i.code)).not.toContain("UNSUPPORTED_FIELD");
    expect(entry.notes).toContain("modifySpeed");
  });
});
