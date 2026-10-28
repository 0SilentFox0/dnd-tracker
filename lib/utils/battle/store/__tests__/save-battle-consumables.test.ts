import { describe, expect, it } from "vitest";

import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { consumableEntries, consumablePools, consumableSpend, spendConsumables } from "@/lib/utils/items/consumables";

const rows = new Map([["pot", { id: "pot", name: "Potion of Healing", slot: "item" }]]);

describe("consumables", () => {
  it("entries need an artifact link, a known row and a positive quantity", () => {
    const items = [
      { id: "p1", name: "Potion", quantity: 2, consumable: true, artifactId: "pot" },
      { id: "p2", name: "Free note", quantity: 1, consumable: true },
      { id: "p3", name: "Gone", quantity: 1, consumable: true, artifactId: "gone" },
    ];

    expect(consumableEntries(items, rows).map((e) => [e.itemId, e.quantity, e.row.id])).toEqual([["p1", 2, "pot"]]);
    expect(consumablePools(consumableEntries(items, rows))).toEqual({ "pool:consumable:p1": { label: "Potion of Healing", max: 2, rest: null } });
  });

  it("spend: decrement, remove at zero, skip missing items", () => {
    const items = [
      { id: "p1", name: "Potion", quantity: 2, consumable: true, artifactId: "pot" },
      { id: "p2", name: "Elixir", quantity: 1, consumable: true, artifactId: "el" },
    ];

    expect(spendConsumables(items, { p1: 1, p2: 1, gone: 3 })).toEqual({
      items: [{ id: "p1", name: "Potion", quantity: 1, consumable: true, artifactId: "pot" }],
      used: [
        { item: "Potion", qty: 1 },
        { item: "Elixir", qty: 1 },
      ],
    });
  });

  it("consumableSpend reads only consumable pools with usage", () => {
    const p = makeParticipant({ id: "h" });

    const hero = { ...p, battleData: { ...p.battleData, pools: { "pool:consumable:p1": { label: "P", max: 2, rest: null }, "pool:item:w": { label: "W", max: 7, rest: "long" as const } }, abilityUsage: { "pool:consumable:p1": { battle: 1, round: 1, turn: 1 }, "pool:item:w": { battle: 2, round: 0, turn: 0 } } } };

    expect(consumableSpend(hero)).toEqual({ p1: 1 });
  });
});
