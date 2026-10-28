import { describe, expect, it } from "vitest";

import { convertRaces } from "../convert/races";
import { FIXTURE_DIR, loadOpen5e } from "../lib/open5e";

const races = convertRaces(loadOpen5e(FIXTURE_DIR));

const race = (name: string) => races.find((r) => r.name === name)!;

const ability = (raceName: string, id: string) => race(raceName).abilities.find((a) => a.id === id);

describe("convertRaces", () => {
  it("one race per species; size and speed go to the passive text", () => {
    expect(races.map((r) => r.name)).toEqual(["Dwarf", "Elf", "Goliath", "Orc"]);
    expect(race("Dwarf").passiveAbility.name).toBe("Size and Speed");
    expect(race("Dwarf").passiveAbility.description).toContain("Speed: 30 feet");
    expect(race("Dwarf").abilities.some((a) => a.id === "speed" || a.id === "size")).toBe(false);
  });

  it("mechanized traits", () => {
    expect(ability("Dwarf", "dwarven-toughness")).toMatchObject({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "maxHp", flat: { formula: "hero_level" } }] });
    expect(ability("Dwarf", "dwarven-resilience")).toMatchObject({ effects: [{ kind: "flag", flag: "resistance", damageType: "poison", percent: 50 }] });
    expect(ability("Goliath", "speed")).toMatchObject({ effects: [{ kind: "modifyStat", stat: "speed", flat: 5 }] });
    expect(ability("Orc", "relentless-endurance")).toMatchObject({ trigger: { event: "lethalDamage" }, limits: { perRest: { rest: "long", uses: 1 } }, effects: [{ kind: "heal", amount: 1, revive: true }] });
  });

  it("other traits are notes with the full SRD text", () => {
    const darkvision = ability("Elf", "darkvision")!;

    expect(darkvision.effects).toEqual([{ kind: "note", text: "Darkvision" }]);
    expect(darkvision.description).toContain("Darkvision with a range of 60 feet");
  });
});
