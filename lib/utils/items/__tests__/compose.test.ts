import { describe, expect, it } from "vitest";

import { armorStatsColumns } from "@/lib/utils/artifacts/armor-stats";
import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";
import { weaponCategoryOf } from "@/lib/utils/battle/participant/extract-attacks";
import { composedName, composeItemRow, itemKindOf, type ItemRowLike, matchesAppliesTo } from "@/lib/utils/items/compose";
import { itemStatsFromRow } from "@/lib/utils/items/item-row";
import { type ItemStats,itemStatsColumns } from "@/lib/utils/items/item-stats";

const weapon = (id: string, name: string, stats: Parameters<typeof weaponStatsColumns>[0], slot = "weapon", item: ItemStats = { unique: false }): ItemRowLike => {
  const cols = weaponStatsColumns(stats);

  return { id, name, slot, icon: `${id}.png`, rarity: "common", description: name, setId: null, bonuses: cols.bonuses, modifiers: [...cols.modifiers, ...itemStatsColumns(item).modifiers], abilities: [] as unknown[] };
};

const property = (id: string, name: string, item: ItemStats, extra: { bonuses?: object; modifiers?: unknown[]; abilities?: unknown[]; rarity?: string } = {}): ItemRowLike => ({
  id,
  name,
  slot: "weapon",
  icon: null,
  rarity: extra.rarity ?? "rare",
  description: `${name} text`,
  setId: null,
  bonuses: extra.bonuses ?? {},
  modifiers: [...(extra.modifiers ?? []), ...itemStatsColumns(item).modifiers],
  abilities: extra.abilities ?? [],
});

const armorRow = (id: string, name: string, stats: Parameters<typeof armorStatsColumns>[0]): ItemRowLike => ({ id, name, slot: "armor", icon: null, rarity: "common", description: name, setId: null, bonuses: {}, modifiers: [...armorStatsColumns(stats).modifiers, ...itemStatsColumns({ unique: false }).modifiers], abilities: [] });

const longsword = weapon("ls", "Longsword", { damageDice: "1d8", damageType: "slashing", attackType: "melee", traits: ["versatile"] });

const longbow = weapon("lb", "Longbow", { damageDice: "1d8", damageType: "piercing", attackType: "ranged" }, "range_weapon");

const shield: ItemRowLike = { id: "sh", name: "Shield", slot: "shield", icon: null, rarity: "common", description: "Shield", setId: null, bonuses: {}, modifiers: itemStatsColumns({ unique: false }).modifiers, abilities: [] };

const plate = armorRow("pl", "Plate Armor", { category: "heavy", base: 18, strength: 15, stealthDisadvantage: true });

const leather = armorRow("le", "Leather Armor", { category: "light", base: 11 });

const flameTongue = property(
  "ft",
  "Flame Tongue",
  { unique: false, attunement: true, property: { appliesTo: { kinds: ["weapon"], attackType: "melee" }, nameTemplate: "Flame Tongue {base}" } },
  { abilities: [{ id: "rider", name: "Flame", trigger: { event: "hit", role: "attacker" }, condition: { type: "withThisItem" }, effects: [{ kind: "dealDamage", amount: "2d6", damageType: "fire", target: "eventTarget" }] }] },
);

const plus2 = property("w2", "Weapon +2", { unique: false, property: { appliesTo: { kinds: ["weapon"] }, nameTemplate: "{base} (+2)" } }, { bonuses: { attackBonus: 2 }, modifiers: weaponStatsColumns({ damageBonus: 2 }).modifiers });

const mithral = property("mi", "Mithral Armor", { unique: false, property: { appliesTo: { kinds: ["armor"], armorCategories: ["medium", "heavy"] }, nameTemplate: "Mithral Armor ({base})", overrides: { stealthDisadvantage: false, strength: null } } });

const armorPlus1 = property("a1", "Armor +1", { unique: false, property: { appliesTo: { kinds: ["armor", "shield"] } } });

const luckBlade = property("lk", "Luck Blade", { unique: false, property: { appliesTo: { kinds: ["weapon"], bases: ["longsword", "Rapier"] } } });

describe("itemKindOf / matchesAppliesTo", () => {
  it("kinds by slot; armor needs an armor model; properties are not bases", () => {
    expect(itemKindOf(longsword)).toBe("weapon");
    expect(itemKindOf(longbow)).toBe("weapon");
    expect(itemKindOf(plate)).toBe("armor");
    expect(itemKindOf(shield)).toBe("shield");
    expect(itemKindOf({ ...plate, modifiers: [] })).toBeNull();
    expect(itemKindOf({ id: "r", name: "Ring", slot: "ring" })).toBeNull();
    expect(itemKindOf(flameTongue)).toBeNull();
  });

  it("attack type, armor categories, base names (case-insensitive), shield ≠ armor", () => {
    expect(matchesAppliesTo(longsword, flameTongue)).toBe(true);
    expect(matchesAppliesTo(longbow, flameTongue)).toBe(false);
    expect(matchesAppliesTo(plate, mithral)).toBe(true);
    expect(matchesAppliesTo(leather, mithral)).toBe(false);
    expect(matchesAppliesTo(shield, armorPlus1)).toBe(true);
    expect(matchesAppliesTo(shield, mithral)).toBe(false);
    expect(matchesAppliesTo(longsword, luckBlade)).toBe(true);
    expect(matchesAppliesTo(weapon("gs", "Greatsword", { damageDice: "2d6" }), luckBlade)).toBe(false);
    expect(matchesAppliesTo(flameTongue, plus2)).toBe(false);
    expect(matchesAppliesTo(longsword, longsword)).toBe(false);
  });
});

describe("composeItemRow", () => {
  it("name by template; default template", () => {
    expect(composedName(longsword, flameTongue, "Flame Tongue {base}")).toBe("Flame Tongue Longsword");
    expect(composedName(longsword, flameTongue)).toBe("Flame Tongue (Longsword)");
  });

  it("Flame Tongue Longsword: ref id, base stats and slot, property rarity, prefixed rider, attunement kept", () => {
    const row = composeItemRow(longsword, flameTongue);

    expect(row).toMatchObject({ id: "ls+ft", name: "Flame Tongue Longsword", slot: "weapon", icon: "ls.png", rarity: "rare", description: "Flame Tongue text", setId: null });
    expect(row.modifiers).toContainEqual({ type: "damageDice", value: "1d8" });
    expect(row.abilities).toEqual([expect.objectContaining({ id: "p-rider" })]);
    expect(itemStatsFromRow(row)).toEqual({ unique: false, attunement: true });
  });

  it("Longsword (+2): attack and damage bonuses summed", () => {
    const row = composeItemRow({ ...longsword, bonuses: { attackBonus: 1 } }, plus2);

    expect(row.bonuses).toEqual({ attackBonus: 3 });
    expect(row.modifiers).toContainEqual({ type: "damageBonus", value: "2" });
    expect(row.name).toBe("Longsword (+2)");
  });

  it("Mithral Plate drops strength and stealth; addTraits and damageType override weapon stats", () => {
    const row = composeItemRow(plate, mithral);

    expect((row.modifiers as Array<{ type: string }>).map((m) => m.type)).not.toContain("armorStrength");
    expect((row.modifiers as Array<{ type: string }>).map((m) => m.type)).not.toContain("armorStealth");

    const sun = property("sb", "Radiant", { property: { appliesTo: { kinds: ["weapon"] }, overrides: { damageType: "radiant", addTraits: ["finesse"] } } });

    const composed = composeItemRow(longsword, sun);

    expect(composed.modifiers).toContainEqual({ type: "damageType", value: "radiant" });
    expect(composed.modifiers).toContainEqual({ type: "traits", value: "versatile,finesse" });
  });

  it("a HOMM unique base stays unique in the composed row", () => {
    const homm = { ...longsword, id: "homm", modifiers: weaponStatsColumns({ damageDice: "1d8" }).modifiers };

    expect(itemStatsFromRow(composeItemRow(homm, plus2))).toBeNull();
  });

  it("keeps the base weapon category, also when it lives only in the description (a property replaces the description)", () => {
    const structured = weapon("ms", "Maul", { damageDice: "2d6", damageType: "bludgeoning", attackType: "melee", weaponCategory: "martial" });

    const legacy = { ...longsword, description: "Simple Melee Weapon. Damage: 1d8 slashing." };

    const category = (row: ItemRowLike) => weaponCategoryOf(row.modifiers as never, row.description);

    expect(category(composeItemRow(structured, plus2))).toBe("martial");
    expect(category(composeItemRow(legacy, plus2))).toBe("simple");
    expect(category(composeItemRow(longsword, plus2))).toBeUndefined();
  });
});
