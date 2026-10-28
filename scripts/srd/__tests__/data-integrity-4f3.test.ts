import { describe, expect, it } from "vitest";

import { readSrdData } from "../lib/data-files";
import type { ArtifactRow } from "../lib/types";

import { armorStatsColumns } from "@/lib/utils/artifacts/armor-stats";
import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";
import { matchesAppliesTo } from "@/lib/utils/items/compose";
import { itemStatsColumns } from "@/lib/utils/items/item-stats";

const data = readSrdData();

const asRow = (r: ArtifactRow) => ({ id: r.slug, name: r.name, slot: r.slot, modifiers: [...(r.weapon ? weaponStatsColumns(r.weapon).modifiers : []), ...(r.armor ? armorStatsColumns(r.armor).modifiers : []), ...(r.item ? itemStatsColumns(r.item).modifiers : [])] });

const properties = data.artifacts.filter((a) => a.item?.property);

const rows = data.artifacts.map(asRow);

const usesCharges = (a: ArtifactRow) => (a.abilities ?? []).some((x) => x.limits?.pool?.key === "charges");

describe("SRD 5.2 data: 4f-3", () => {
  it("32 properties, 250 uniques (including two scroll levels), 51 non-unique gear", () => {
    expect(properties).toHaveLength(32);
    expect(data.artifacts.filter((a) => !a.item?.property && (a.rarity !== "common" || a.item?.consumable))).toHaveLength(250);
    expect(data.artifacts.filter((a) => a.rarity === "common" && !a.item?.consumable).every((a) => a.item?.unique === false)).toBe(true);
  });

  it("every property has at least one base in the template that passes matchesAppliesTo", () => {
    for (const p of properties) expect(rows.some((b) => matchesAppliesTo(b, asRow(p))), p.name).toBe(true);
  });

  it("the charges pool key only in items with charges or consumables", () => {
    for (const a of data.artifacts.filter(usesCharges)) expect(!!a.item?.charges || !!a.item?.consumable, a.name).toBe(true);
  });

  it("only Dragon Orb is unique among magic items", () => {
    expect(data.artifacts.filter((a) => a.rarity !== "common" && a.item?.unique !== false).map((a) => a.name)).toEqual(["Dragon Orb"]);
  });

  it("names are unique (import keys by name)", () => {
    const names = data.artifacts.map((a) => a.name);

    expect(new Set(names).size).toBe(names.length);
  });

  it("mechanized coverage reaches the spec ballpark", () => {
    const mechanized = data.artifacts.filter((a) => a.rarity !== "common" && ((a.abilities ?? []).some((x) => x.effects.some((e) => e.kind !== "note")) || a.weapon?.attackBonus));

    expect(mechanized.length).toBeGreaterThanOrEqual(60);
  });
});
