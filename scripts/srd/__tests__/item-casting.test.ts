import { describe, expect, it } from "vitest";

import * as converter from "../convert/magic-items";
import { FIXTURE_4F4_DIR, loadOpen5e } from "../lib/open5e";
import type { ArtifactRow } from "../lib/types";
import items from "./fixtures-4f5b/Item.json";
import magicItems from "./fixtures-4f5b/MagicItem.json";
import spells from "./fixtures-4f5b/Spell.json";

const data = { ...loadOpen5e(FIXTURE_4F4_DIR), magicItems, items, spells } as unknown as ReturnType<typeof loadOpen5e>;

const rows: ArtifactRow[] = magicItems.map((m) => ({ slug: m.pk, name: m.fields.name, description: m.fields.desc, rarity: "rare", slot: "item", item: { unique: false, charges: { max: 10, rest: "long" } } }));

describe("item casting conversion", () => {
  it("converts explicit wand cost/upcast/DC, staff table and scroll level/DC", () => {
    expect(converter).toHaveProperty("applyItemCasting");

    if (!("applyItemCasting" in converter)) return;

    const result = (converter.applyItemCasting as (rows: ArtifactRow[], source: typeof data) => ArtifactRow[])(rows, data);

    expect(result.find((r) => r.slug === "srd-2024_ring-of-resistance")?.name).toBe("Ring of Resistance");
    expect(result.find((r) => r.name === "Wand of Fireballs")?.item?.spells).toEqual([{ spellId: "Fireball", cost: 1, castLevel: 3, dc: 15, upcast: { maxLevel: 5, extraCost: 1 } }]);
    expect(result.find((r) => r.name === "Staff of Fire")?.item?.spells).toContainEqual({ spellId: "Fireball", cost: 3, castLevel: 3 });

    const scroll = result.find((r) => r.name === "Spell Scroll (Level 1)");

    expect(scroll?.item).toMatchObject({ consumable: true, spells: expect.arrayContaining([{ spellId: "Longstrider", cost: 1, castLevel: 1, dc: 13, attackBonus: 5 }]) });
    expect(result.find((r) => r.name.startsWith("Ring of Resistance"))?.item?.parameter?.options.map((o) => o.key)).toContain("fire");
    expect(result.find((r) => r.name === "Sun Blade")?.abilities).toContainEqual(expect.objectContaining({ condition: { type: "all", conditions: [{ type: "withThisItem" }, { type: "targetCreatureType", types: ["undead"] }] } }));
  });
});
