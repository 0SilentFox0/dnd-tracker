import { describe, expect, it } from "vitest";

import { convertArtifacts } from "../convert/artifacts";
import { FIXTURE_DIR, loadOpen5e } from "../lib/open5e";

const items = convertArtifacts(loadOpen5e(FIXTURE_DIR));

const item = (name: string) => items.find((i) => i.name === name)!;

describe("convertArtifacts", () => {
  it("6 weapons + shield", () => {
    expect(items.map((i) => i.name).sort()).toEqual(["Battleaxe", "Blowgun", "Dagger", "Greatsword", "Javelin", "Longbow", "Shield"]);
    expect(items.every((i) => i.rarity === "common")).toBe(true);
  });

  it("Battleaxe: versatile 1d10, mastery in properties", () => {
    expect(item("Battleaxe")).toMatchObject({ slot: "weapon", weapon: { damageDice: "1d8", damageType: "slashing", attackType: "melee", traits: ["versatile"], versatileDice: "1d10", properties: "Mastery: Topple" } });
    expect(item("Battleaxe").description).toContain("Martial Melee Weapon");
    expect(item("Battleaxe").description).toContain("Cost: 10 GP");
  });

  it("Dagger is a thrown melee weapon; Longbow is ranged ammunition", () => {
    expect(item("Dagger").weapon).toMatchObject({ attackType: "melee", range: "20/60", traits: ["light", "finesse", "thrown"] });
    expect(item("Longbow")).toMatchObject({ slot: "range_weapon", weapon: { attackType: "ranged", range: "150/600", traits: ["twoHanded", "ammunition"], properties: "Heavy. Mastery: Slow" } });
    expect(item("Blowgun").weapon?.damageDice).toBe("1");
  });

  it("Shield: +2 AC passive", () => {
    expect(item("Shield")).toMatchObject({ slot: "shield", abilities: [{ id: "shield-ac", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 2 }] }] });
  });
});
