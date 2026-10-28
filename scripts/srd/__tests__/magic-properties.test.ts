import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";

import { convertArtifacts } from "../convert/artifacts";
import { chargesOf, convertMagicProperties, familyTemplate, normalizeItemName } from "../convert/magic-items";
import { readSrdData } from "../lib/data-files";
import { FIXTURE_4F2_DIR, FIXTURE_4F3_DIR, loadOpen5e } from "../lib/open5e";
import type { ArtifactRow } from "../lib/types";

import { createArtifactSchema } from "@/lib/schemas/artifacts";
import { armorStatsColumns } from "@/lib/utils/artifacts/armor-stats";
import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";
import { composeItemRow, matchesAppliesTo } from "@/lib/utils/items/compose";
import { itemStatsColumns } from "@/lib/utils/items/item-stats";

const fixture = (file: string) => JSON.parse(fs.readFileSync(path.join(FIXTURE_4F3_DIR, `${file}.json`), "utf8"));

const gear = readSrdData().artifacts.filter((a) => a.rarity === "common");

const data = { ...loadOpen5e(FIXTURE_4F2_DIR), magicItems: fixture("MagicItem"), items: fixture("Item") };

const props = convertMagicProperties(data, gear);

const prop = (name: string) => props.find((p) => p.name === name)!;

// the same shape the importer writes, so the shared compose/match code sees what the app will see
const asRow = (r: ArtifactRow) => ({ id: r.slug, name: r.name, slot: r.slot, bonuses: r.weapon?.attackBonus ? { attackBonus: r.weapon.attackBonus } : {}, modifiers: [...(r.weapon ? weaponStatsColumns(r.weapon).modifiers : []), ...(r.armor ? armorStatsColumns(r.armor).modifiers : []), ...(r.item ? itemStatsColumns(r.item).modifiers : [])], abilities: r.abilities ?? [] });

const base = (name: string) => asRow(gear.find((g) => g.name === name)!);

describe("magic item properties", () => {
  it("helpers: family templates, normalized names, charges", () => {
    expect(familyTemplate("Flame Tongue Longsword", "Longsword")).toBe("Flame Tongue {base}");
    expect(familyTemplate("Armor of Resistance (Padded)", "Padded Armor")).toBe("Armor of Resistance ({base})");
    expect(familyTemplate("Dwarven Plate", "Plate Armor")).toBe("Dwarven {base}");
    expect(familyTemplate("Wand of Web", "Longsword")).toBeNull();
    expect(normalizeItemName("Armor of Resistance (Padded Armor)")).toBe(normalizeItemName("Armor of Resistance (Padded)"));
    expect(chargesOf("This wand has 7 charges. … The wand regains 1d6 + 1 expended charges daily at dawn.")).toEqual({ max: 7, rest: "long" });
    expect(chargesOf("The weapon has 1d8 + 1 charges.")).toEqual({ max: 9, rest: null });
    expect(chargesOf("No charges here.")).toBeNull();
  });

  it("13 fixture families incl. Dragon Slayer; generic Defender row dropped; every row passes the schema", () => {
    expect(props.map((p) => p.name).sort()).toEqual(["Adamantine Armor", "Armor +1", "Armor of Resistance", "Berserker", "Defender", "Dragon Slayer", "Dwarven Plate", "Flame Tongue", "Frost Brand", "Mithral Armor", "Vicious", "Weapon +2", "Wounding"]);

    for (const row of props) {
      const { slug: _slug, ...body } = row;

      expect(createArtifactSchema.safeParse(body).success, row.name).toBe(true);
      expect(row.item?.unique, row.name).toBe(false);
    }
  });

  it("Flame Tongue Longsword: composes from Longsword with a 2d6 fire rider bound to the item", () => {
    const ft = prop("Flame Tongue");

    expect(ft).toMatchObject({ slot: "weapon", rarity: "rare", item: { attunement: true, property: { nameTemplate: "Flame Tongue {base}", appliesTo: { kinds: ["weapon"], bases: ["Longsword"] } } } });
    expect(matchesAppliesTo(base("Longsword"), asRow(ft))).toBe(true);

    const row = composeItemRow(base("Longsword"), asRow(ft));

    expect(row.name).toBe("Flame Tongue Longsword");
    expect(row.abilities).toContainEqual(expect.objectContaining({ id: "p-rider", trigger: { event: "hit", role: "attacker" }, condition: { type: "withThisItem" }, effects: [{ kind: "dealDamage", amount: "2d6", damageType: "fire", target: "eventTarget" }] }));
  });

  it("Longsword (+2): +2 attack and damage; Breastplate (+1): +1 AC on top; Shield (+1) too", () => {
    expect(prop("Weapon +2").weapon).toEqual({ attackBonus: 2, damageBonus: 2 });

    const longsword = composeItemRow(base("Longsword"), asRow(prop("Weapon +2")));

    expect(longsword).toMatchObject({ name: "Longsword (+2)", bonuses: { attackBonus: 2 } });
    expect(longsword.modifiers).toContainEqual({ type: "damageBonus", value: "2" });
    expect(prop("Armor +1").abilities).toEqual([expect.objectContaining({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 1 }] })]);
    expect(prop("Armor +1").item?.property?.appliesTo.kinds.sort()).toEqual(["armor", "shield"]);
    expect(composeItemRow(base("Breastplate"), asRow(prop("Armor +1"))).name).toBe("Breastplate (+1)");
  });

  it("Mithral Plate drops strength and stealth; Adamantine grants crit immunity; Frost Brand resists fire; Berserker adds HP per level", () => {
    const mithral = composeItemRow(base("Plate Armor"), asRow(prop("Mithral Armor")));

    expect((mithral.modifiers as Array<{ type: string }>).map((m) => m.type)).not.toContain("armorStrength");
    expect((mithral.modifiers as Array<{ type: string }>).map((m) => m.type)).not.toContain("armorStealth");
    expect(prop("Adamantine Armor").abilities).toContainEqual(expect.objectContaining({ effects: [{ kind: "flag", flag: "critImmunity" }] }));
    expect(prop("Frost Brand").abilities).toContainEqual(expect.objectContaining({ effects: [{ kind: "flag", flag: "resistance", damageType: "fire", percent: 50 }] }));
    expect(prop("Berserker").abilities).toContainEqual(expect.objectContaining({ effects: [{ kind: "modifyStat", stat: "maxHp", flat: { formula: "hero_level" } }] }));
    expect(prop("Defender")).toMatchObject({ weapon: { attackBonus: 3, damageBonus: 3 } });
    expect((prop("Defender").abilities ?? []).some((a) => a.id === "ac")).toBe(false);
  });

  it("Vicious rider has no damage type; Dragon Slayer is a +1 any-weapon property without the dragon-only rider", () => {
    expect(prop("Vicious").abilities).toContainEqual(expect.objectContaining({ effects: [{ kind: "dealDamage", amount: "2d6", target: "eventTarget" }] }));
    expect(prop("Dragon Slayer")).toMatchObject({ weapon: { attackBonus: 1, damageBonus: 1 }, item: { property: { appliesTo: { kinds: ["weapon"] }, nameTemplate: "Dragon Slayer ({base})" } } });
    expect(prop("Dragon Slayer").abilities ?? []).toEqual([]);
  });

  it("common gear becomes non-unique; the 4f-2 armor rows keep their models", () => {
    const rows = convertArtifacts(loadOpen5e(FIXTURE_4F2_DIR));

    expect(rows.every((r) => r.item?.unique === false)).toBe(true);
    expect(rows.find((r) => r.name === "Chain Mail")?.armor).toEqual({ category: "heavy", base: 16, strength: 13, stealthDisadvantage: true });
  });
});
