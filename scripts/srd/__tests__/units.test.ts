import { describe, expect, it } from "vitest";

import { convertUnits, parseTextAttack } from "../convert/units";
import { FIXTURE_DIR, loadOpen5e } from "../lib/open5e";

const units = convertUnits(loadOpen5e(FIXTURE_DIR));

const unit = (name: string) => units.find((u) => u.name === name) as (typeof units)[number];

const ability = (name: string, id: string) => unit(name).abilities.find((a) => a.id === id);

describe("convertUnits", () => {
  it("Adult Red Dragon: stats, saves, legendary, size", () => {
    expect(unit("Adult Red Dragon")).toMatchObject({
      slug: "srd-2024_adult-red-dragon",
      cr: 17,
      level: 17,
      armorClass: 19,
      maxHp: 256,
      speed: 40,
      initiative: 12,
      gridSize: 3,
      strength: 27,
      charisma: 23,
      saveProficiencies: ["dexterity", "wisdom"],
      multiattack: 3,
      legendaryActions: 3,
      legendaryResistances: 3,
    });
  });

  it("Adult Red Dragon: Rend (residual bonus 0), reach and the fire rider in properties", () => {
    expect(unit("Adult Red Dragon").attacks).toEqual([{ name: "Rend", type: "melee", attackBonus: 0, damageDice: "1d10", damageType: "slashing", traits: ["reach"], properties: "plus 2d4 fire damage" }]);
  });

  it("Adult Red Dragon: immunity as resistance 100, legendary actions usable, breath as a note", () => {
    expect(ability("Adult Red Dragon", "damage-immunities")).toMatchObject({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "fire", percent: 100 }] });

    const legendary = unit("Adult Red Dragon").abilities.filter((a) => a.limits?.legendaryCost);

    expect(legendary.map((a) => a.name).sort()).toEqual(["Commanding Presence", "Fiery Rays", "Pounce"]);
    expect(legendary.every((a) => a.trigger.event === "action" && a.limits?.legendaryCost === 1)).toBe(true);
    expect(unit("Adult Red Dragon").abilities.find((a) => a.name.startsWith("Fire Breath"))).toMatchObject({ name: "Fire Breath (Recharge 5–6)", effects: [{ kind: "note", text: "Fire Breath (Recharge 5–6)" }] });
    expect(unit("Adult Red Dragon").abilities.some((a) => a.name.startsWith("Legendary Resistance"))).toBe(false);
    expect(ability("Adult Red Dragon", "statblock")?.description).toContain("Huge Dragon, Chaotic Evil");
  });

  it("Goblin Warrior: finesse scimitar, ranged shortbow, CR 1/4 → level 1, small → 1 cell", () => {
    expect(unit("Goblin Warrior")).toMatchObject({ cr: 0.25, level: 1, gridSize: 1 });
    expect(unit("Goblin Warrior").attacks).toEqual([
      { name: "Scimitar", type: "melee", attackBonus: 0, damageDice: "1d6", damageType: "slashing", traits: ["finesse"] },
      { name: "Shortbow", type: "ranged", attackBonus: 0, damageDice: "1d6", damageType: "piercing", range: "80/320" },
    ]);
  });

  it("text-only attacks, flat damage and multiattack overrides", () => {
    expect(unit("Ankheg").attacks[0]).toEqual({ name: "Bite", type: "melee", attackBonus: 0, damageDice: "2d6", damageType: "slashing", properties: "plus 1d6 acid damage" });
    expect(unit("Bat").attacks[0]).toMatchObject({ damageDice: "1", damageType: "piercing" });
    expect(unit("Octopus").attacks[0]).toMatchObject({ damageDice: "1" });
    expect(unit("Hydra").multiattack).toBe(5);
    expect(unit("Bugbear Warrior").attacks.find((a) => a.name === "Light Hammer")).toEqual({ name: "Light Hammer", type: "melee", attackBonus: 0, damageDice: "3d4", damageType: "bludgeoning", range: "20/60", traits: ["reach", "thrown"] });
  });

  it("Magic Resistance and Regeneration are mechanized", () => {
    expect(ability("Archmage", "magic-resistance")).toMatchObject({ effects: [{ kind: "flag", flag: "saveAdvantage", abilities: "all", vsSpells: true }] });
    expect(ability("Oni", "regeneration")).toMatchObject({ trigger: { event: "turnStart" }, effects: [{ kind: "heal", amount: 10, target: "self" }] });
  });

  it("parseTextAttack: unparseable text → null", () => {
    expect(parseTextAttack("Tentacle", "Melee Attack Roll: +7, reach 60 ft. The target has the Grappled condition (escape DC 14).")).toBeNull();
  });
});
