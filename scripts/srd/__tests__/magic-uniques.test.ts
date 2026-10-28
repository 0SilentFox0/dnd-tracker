import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";

import { convertMagicItems, convertMagicUniques } from "../convert/magic-items";
import { readSrdData } from "../lib/data-files";
import { FIXTURE_4F2_DIR, FIXTURE_4F3_DIR, loadOpen5e } from "../lib/open5e";

import { createArtifactSchema } from "@/lib/schemas/artifacts";

const fixture = (file: string) => JSON.parse(fs.readFileSync(path.join(FIXTURE_4F3_DIR, `${file}.json`), "utf8"));

const gear = readSrdData().artifacts.filter((a) => a.rarity === "common");

const data = { ...loadOpen5e(FIXTURE_4F2_DIR), magicItems: fixture("MagicItem"), items: fixture("Item") };

const uniques = convertMagicUniques(data, gear);

const item = (name: string) => uniques.find((u) => u.name === name)!;

describe("unique magic items", () => {
  it("12 fixture uniques + 4 healing potions; generic duplicates and Dragon Slayer are not uniques", () => {
    expect(uniques.map((u) => u.name).sort()).toEqual([
      "Ammunition (+1)",
      "Amulet of Health",
      "Belt of Giant Strength (Fire)",
      "Boots of Elvenkind",
      "Bracers of Defense",
      "Cloak of Protection",
      "Dragon Orb",
      "Potion of Climbing",
      "Potion of Greater Healing",
      "Potion of Healing",
      "Potion of Superior Healing",
      "Potion of Supreme Healing",
      "Ring of Protection",
      "Staff of Power",
      "Sun Blade",
      "Wand of Magic Missiles",
    ]);
    expect(convertMagicItems(data, gear)).toHaveLength(13 + 16);
  });

  it("every row passes the artifact schema; all but Dragon Orb are non-unique", () => {
    for (const row of uniques) {
      const { slug: _slug, ...body } = row;

      expect(createArtifactSchema.safeParse(body).success, row.name).toBe(true);
      expect(row.item?.unique, row.name).toBe(row.name === "Dragon Orb" ? undefined : false);
    }

    expect(item("Dragon Orb").rarity).toBe("legendary");
  });

  it("Wand of Magic Missiles: item slot, 7 charges on a long rest, expend ability", () => {
    expect(item("Wand of Magic Missiles")).toMatchObject({ slot: "item", rarity: "uncommon", item: { charges: { max: 7, rest: "long" } } });
    expect(item("Wand of Magic Missiles").abilities).toContainEqual(expect.objectContaining({ id: "charge", trigger: { event: "action" }, limits: { pool: { key: "charges", cost: 1 } } }));
  });

  it("Ring of Protection: ring, attunement, AC and saves +1; Cloak of Protection: cloak slot", () => {
    expect(item("Ring of Protection")).toMatchObject({ slot: "ring", item: { attunement: true } });
    expect(item("Ring of Protection").abilities).toEqual([
      expect.objectContaining({ id: "ac", effects: [{ kind: "modifyStat", stat: "armor", flat: 1 }] }),
      expect.objectContaining({ id: "saves", effects: [{ kind: "modifyStat", stat: "savingThrow", flat: 1 }] }),
    ]);
    expect(item("Cloak of Protection").slot).toBe("cloak");
    expect(item("Boots of Elvenkind").slot).toBe("boots");
    expect(item("Boots of Elvenkind").abilities).toContainEqual(expect.objectContaining({ effects: [{ kind: "flag", flag: "checkAdvantage", skills: ["stealth"] }] }));
  });

  it("Amulet of Health: Constitution at least 19; Belt of Giant Strength (Fire): Strength at least 25", () => {
    expect(item("Amulet of Health")).toMatchObject({ slot: "amulet" });
    expect(item("Amulet of Health").abilities).toContainEqual(expect.objectContaining({ effects: [{ kind: "modifyStat", stat: "constitution", atLeast: 19 }] }));
    expect(item("Belt of Giant Strength (Fire)").abilities).toContainEqual(expect.objectContaining({ effects: [{ kind: "modifyStat", stat: "strength", atLeast: 25 }] }));
  });

  it("Bracers of Defense: +2 AC only without armor and shield", () => {
    expect(item("Bracers of Defense").abilities).toContainEqual(expect.objectContaining({ condition: { type: "armorWorn", categories: ["none"], shield: "without" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 2 }] }));
  });

  it("Sun Blade: Longsword stats as radiant finesse +2; Staff of Power: Quarterstaff +2 with 20 charges", () => {
    expect(item("Sun Blade")).toMatchObject({ slot: "weapon", weapon: { damageDice: "1d8", damageType: "radiant", attackBonus: 2, damageBonus: 2 } });
    expect(item("Sun Blade").weapon?.traits).toContain("finesse");
    expect(item("Staff of Power")).toMatchObject({ slot: "weapon", weapon: { attackBonus: 2, damageBonus: 2 }, item: { attunement: true, charges: { max: 20 } } });
  });

  it("consumables: Potion of Greater Healing heals 4d4+4 as a bonus action; ammunition and other potions are consumables", () => {
    expect(item("Potion of Greater Healing")).toMatchObject({ slot: "item", rarity: "uncommon", item: { unique: false, consumable: true } });
    expect(item("Potion of Greater Healing").abilities).toEqual([expect.objectContaining({ trigger: { event: "bonusAction" }, limits: { pool: { key: "charges", cost: 1 } }, effects: [{ kind: "heal", amount: "4d4+4", target: "self" }] })]);
    expect(item("Potion of Supreme Healing")).toMatchObject({ rarity: "epic" });
    expect(item("Ammunition (+1)").item).toEqual({ unique: false, consumable: true });
    expect(item("Potion of Climbing").item).toEqual({ unique: false, consumable: true });
    expect(item("Potion of Climbing").abilities?.some((a) => a.trigger.event === "passive")).toBe(false);
  });
});
