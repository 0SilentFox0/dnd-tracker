import { describe, expect, it } from "vitest";

import type { Row } from "../data";
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
});
