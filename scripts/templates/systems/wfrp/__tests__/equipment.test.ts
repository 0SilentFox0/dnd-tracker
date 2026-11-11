import { describe, expect, it } from "vitest";

import type { Row } from "../common";
import { equipmentIssues } from "../equipment";

const rows: Row[] = [
  {"name":"Light Crossbow","description":"A stirrup crossbow spanned by hand.","rarity":"common","slot":"range_weapon","systemStats":{"type":"weapon","group":"crossbow","range":180,"damage":{"addSb":false,"flat":7},"qualities":[],"flaws":[{"key":"reload","value":1}],"twoHanded":true,"ammoCapacity":1,"weight":2,"price":600}},
  {"name":"Chain Hauberk","description":"A mail coat with sleeves and a split skirt.","rarity":"uncommon","slot":"armor","systemStats":{"type":"armour","locations":{"head":0,"arm":2,"body":2,"leg":2},"kind":"mail","qualities":[{"key":"flexible"}],"weight":3,"price":1200}},
  {"name":"Round Shield","description":"A planked shield with an iron boss.","rarity":"common","slot":"shield","systemStats":{"type":"gear","weight":1,"price":120,"qualities":[{"key":"shield","value":2}]}},
];

describe("equipmentIssues", () => {
  it.each(rows)("accepts the roster row $name", (row) => {
    expect(equipmentIssues(row)).toEqual([]);
  });

  const shield = rows[2].systemStats as Record<string, unknown>;

  const withStats = (row: Row, patch: Record<string, unknown>, slot?: string): Row => ({ ...row, ...(slot && { slot }), systemStats: { ...(row.systemStats as object), ...patch } });

  const bow = withStats(rows[0], { group: "bow", range: 180, damage: { addSb: true, flat: 3 }, flaws: [], ammoCapacity: undefined, price: 300 });

  it.each([
    ["ranged weapon in the weapon slot", withStats(rows[0], {}, "weapon"), 'slot "weapon" needs a weapon with reach'],
    ["shield gear without shield X", withStats(rows[2], { qualities: [] }), 'slot "shield" needs gear with one "shield X" quality'],
    ["shield gear with an extra quality", withStats(rows[2], { qualities: [...(shield.qualities as object[]), { key: "flexible" }] }), 'slot "shield" needs gear with one "shield X" quality'],
    ["wrap quality", withStats(rows[0], { qualities: [{ key: "wrap" }] }), "wrap"],
    ["bow without twoHanded", withStats(bow, { twoHanded: false }), 'group "bow" needs twoHanded'],
    ["crossbow without reload", withStats(rows[0], { flaws: [], ammoCapacity: undefined }), 'group "crossbow" needs reload'],
  ])("rejects %s", (_label, row, message) => {
    expect(equipmentIssues(row).join("\n")).toContain(message);
  });
});
