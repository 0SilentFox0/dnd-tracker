import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

interface Row {
  name: string;
  slot: string;
  weapon?: { damageDice?: string; weaponCategory?: string };
  item?: { property?: unknown };
}

const rows = JSON.parse(readFileSync(join(process.cwd(), "data/templates/srd-5.2/artifacts.json"), "utf8")) as Row[];

const weapons = rows.filter((r) => (r.slot === "weapon" || r.slot === "range_weapon") && r.weapon);

describe("srd-5.2 weapon categories", () => {
  it("every base weapon with damage has a category", () => {
    expect(weapons.filter((r) => r.weapon?.damageDice && !r.weapon.weaponCategory).map((r) => r.name)).toEqual([]);
  });

  it("weapons without a category are bonus-only properties (they inherit the base weapon's category when composed)", () => {
    expect(weapons.filter((r) => !r.weapon?.weaponCategory && !r.item?.property).map((r) => r.name)).toEqual([]);
  });
});
