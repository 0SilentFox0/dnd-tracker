import { describe, expect, it } from "vitest";

import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";
import { matchesAppliesTo } from "@/lib/utils/items/compose";
import { itemStatsFromRow } from "@/lib/utils/items/item-row";
import { type ItemStats,itemStatsColumns } from "@/lib/utils/items/item-stats";
import { activeItemRefs, attunementRequired, heldRefs, inventoryArtifactIds, itemChargesOf, pruneAttuned, resolveItemRow, resolveItemRows, uniqueChecker } from "@/lib/utils/items/resolve";

const row = (id: string, slot: string, item?: ItemStats, extra: { bonuses?: object; abilities?: unknown[]; modifiers?: unknown[] } = {}) => ({
  id,
  name: id,
  slot,
  bonuses: extra.bonuses ?? {},
  modifiers: [...(extra.modifiers ?? []), ...(item ? itemStatsColumns(item).modifiers : [])],
  abilities: extra.abilities ?? [],
});

const RIDER = { id: "r", name: "R", trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "note", text: "x" }] };

const rows = new Map(
  [
    row("sword", "weapon", { unique: false }, { modifiers: weaponStatsColumns({ damageDice: "1d8" }).modifiers }),
    row("ft", "weapon", { unique: false, attunement: true, property: { appliesTo: { kinds: ["weapon"] } } }, { abilities: [RIDER] }),
    row("slayer", "weapon", { unique: false, property: { appliesTo: { kinds: ["weapon"] }, nameTemplate: "Slayer of {param} {base}" }, parameter: { kind: "creatureType", options: [{ key: "dragon", label: "Dragon" }] } }, { abilities: [{ id: "slay", name: "Against {param}", trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "damage", damageType: "radiant", condition: { targetCreatureType: { types: ["{param}"] } } }] }] }),
    row("sun", "weapon", { unique: false, attunement: true }, { bonuses: { attackBonus: 2 }, modifiers: weaponStatsColumns({ damageDice: "1d8", damageBonus: 2 }).modifiers, abilities: [RIDER] }),
    row("wand", "item", { unique: false, charges: { max: 7, rest: "long" } }),
    row("ring", "ring", { unique: false, attunement: true }),
    row("homm", "helmet"),
    row("cloak", "cloak", { unique: false }),
    row("resist", "ring", { unique: false, parameter: { kind: "damageType", options: [{ key: "fire", label: "Fire" }] } }, { abilities: [{ id: "res", name: "Resistance to {param}", trigger: { event: "passive" }, effects: [{ kind: "resistance", damageType: "{param}" }] }] }),
  ].map((r) => [r.id, r]),
);

describe("resolveItemRow(s)", () => {
  it("plain, composed, unknown and bare-property refs", () => {
    expect(resolveItemRow("sword", rows)?.id).toBe("sword");
    expect(resolveItemRow("sword+ft", rows)).toMatchObject({ id: "sword+ft", name: "ft (sword)" });
    expect(resolveItemRow("gone", rows)).toBeNull();
    expect(resolveItemRow("sword+gone", rows)).toBeNull();
    expect(resolveItemRow("gone+ft", rows)).toBeNull();
    expect(resolveItemRow("ft", rows)).toBeNull();
    expect(resolveItemRows(["sword", "gone", "sword+ft"], rows).map((r) => r.id)).toEqual(["sword", "sword+ft"]);
  });

  it("resolves only a parameter allowed by that item's current definition", () => {
    expect(matchesAppliesTo(rows.get("sword") ?? row("missing", "weapon"), rows.get("slayer") ?? row("missing", "weapon"))).toBe(true);
    expect(itemStatsFromRow(rows.get("slayer") ?? row("missing", "weapon"))).toMatchObject({ parameter: { options: [{ key: "dragon" }] } });
    expect(resolveItemRow("resist~fire", rows)).toMatchObject({ id: "resist~fire", name: "resist (fire)", abilities: [{ name: "Resistance to fire", effects: [{ damageType: "fire" }] }] });
    expect(resolveItemRow("resist~cold", rows)).toBeNull();
    expect(resolveItemRow("resist", rows)).toBeNull();
    expect(resolveItemRow("sword+slayer", rows)).toBeNull();
    expect(resolveItemRow("sword+slayer~dragon", rows)).toMatchObject({ id: "sword+slayer~dragon", name: "Slayer of dragon sword" });
    expect(resolveItemRow("sword+slayer~giant", rows)).toBeNull();

    const resolved = resolveItemRow("resist~fire", rows);

    expect(resolved).not.toBeNull();

    if (resolved) expect(resolveItemRow("resist~fire", new Map([[resolved.id, resolved]]))).toEqual(resolved);
  });

  it("items disabled → attunement ignored (all active)", () => {
    expect(resolveItemRow("sword+ft", rows)?.abilities).toHaveLength(1);
    expect(resolveItemRow("sun", rows)?.bonuses).toEqual({ attackBonus: 2 });
  });

  it("items enabled, not attuned → base only / stripped unique; attuned → full", () => {
    const off = { itemsEnabled: true, attuned: [] };

    const composed = resolveItemRow("sword+ft", rows, off);

    expect(composed).toMatchObject({ id: "sword+ft", name: "ft (sword)", abilities: [] });

    const sun = resolveItemRow("sun", rows, off);

    expect(sun?.bonuses).toEqual({});
    expect(sun?.abilities).toEqual([]);
    expect((sun?.modifiers as Array<{ type: string }>).map((m) => m.type)).toEqual(["damageDice"]);

    const on = { itemsEnabled: true, attuned: ["sword+ft", "sun"] };

    expect(resolveItemRow("sword+ft", rows, on)?.abilities).toHaveLength(1);
    expect(resolveItemRow("sun", rows, on)?.bonuses).toEqual({ attackBonus: 2 });
  });

  it("a pre-resolved composed row (balance/sim preload) is taken as is", () => {
    const pre = new Map([["sword+ft", { id: "sword+ft", name: "FT", slot: "weapon" }]]);

    expect(resolveItemRow("sword+ft", pre)?.name).toBe("FT");
  });
});

describe("inventory helpers", () => {
  const inv = { equipped: { weapon: "sword+ft", shield: "sword", helmet: "homm" }, stash: ["wand", "ring", "cloak", "sword"], attuned: ["sword+ft", "gone"], items: [{ id: "p1", name: "Potion", quantity: 2, consumable: true, artifactId: "potion" }] };

  it("held refs and stale attunement pruning", () => {
    expect(heldRefs(inv)).toEqual(["sword+ft", "sword", "homm", "wand", "ring", "cloak"]);
    expect(pruneAttuned(inv.attuned, inv)).toEqual(["sword+ft"]);
  });

  it("carried: item/ring from the stash only when items are enabled and not worn", () => {
    expect(activeItemRefs(inv, rows, false)).toEqual([
      { ref: "sword+ft", slot: "weapon" },
      { ref: "sword", slot: "shield" },
      { ref: "homm", slot: "helmet" },
    ]);
    expect(activeItemRefs(inv, rows, true).slice(3)).toEqual([
      { ref: "wand", slot: "item", carried: true },
      { ref: "ring", slot: "ring", carried: true },
    ]);
  });

  it("artifact ids to load", () => {
    expect(inventoryArtifactIds(inv, { stash: false, consumables: false })).toEqual(["sword", "ft", "homm"]);
    expect(inventoryArtifactIds(inv, { stash: true, consumables: true })).toEqual(["sword", "ft", "homm", "wand", "ring", "cloak", "potion"]);
    expect(inventoryArtifactIds(null, { stash: true, consumables: true })).toEqual([]);
  });

  it("uniqueness, attunement and charges lookups", () => {
    const unique = uniqueChecker(rows);

    expect(unique("homm")).toBe(true);
    expect(unique("sword")).toBe(false);
    expect(unique("ft")).toBe(false);
    expect(unique("unknown")).toBe(true);
    expect(attunementRequired("sword+ft", rows)).toBe(true);
    expect(attunementRequired("sword", rows)).toBe(false);
    expect(attunementRequired("ring", rows)).toBe(true);
    expect(itemChargesOf("wand", rows)).toEqual({ max: 7, rest: "long" });
    expect(itemChargesOf("sword", rows)).toBeNull();
  });
});

describe("unattuned unique shield", () => {
  it("keeps its base shield AC but loses the rest", () => {
    const shield = row("anim", "shield", { unique: true, attunement: true }, { abilities: [{ id: "shield-ac", name: "Shield" }, RIDER] });

    const out = resolveItemRow("anim", new Map([["anim", shield]]), { itemsEnabled: true, attuned: [] });

    expect((out?.abilities as Array<{ id: string }>).map((a) => a.id)).toEqual(["shield-ac"]);
  });
});
