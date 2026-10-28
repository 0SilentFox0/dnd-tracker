import { describe, expect, it } from "vitest";

import { applyRaceChoices, tableRows } from "../convert/race-choices";
import { convertRaces } from "../convert/races";
import { FIXTURE_4F4_DIR, loadOpen5e } from "../lib/open5e";

import { RaceChoicesSchema } from "@/lib/schemas/choices";

const data = loadOpen5e(FIXTURE_4F4_DIR);

const races = applyRaceChoices(convertRaces(data), data);

const race = (name: string) => races.find((r) => r.name === name)!;

const lineage = (name: string) => race(name).choices?.find((c) => c.lineage);

const option = (raceName: string, id: string) => lineage(raceName)?.options?.find((o) => o.id === id);

describe("tableRows", () => {
  it("skips the header and the separator, trims cells", () => {
    expect(tableRows("Table\n\n| Dragon | Damage Type |\n|---|---|\n| Black | Acid |\n|Gold|Fire|")).toEqual([["Black", "Acid"], ["Gold", "Fire"]]);
  });
});

describe("race choices", () => {
  it("Elf: three lineages; Wood Elf +5 speed and spells by level; shell traits removed; Keen Senses is a skill choice", () => {
    expect(lineage("Elf")?.options?.map((o) => o.name)).toEqual(["Drow", "High Elf", "Wood Elf"]);
    expect(option("Elf", "wood-elf")).toMatchObject({ spells: [{ level: 1, spellId: "Druidcraft" }, { level: 3, spellId: "Longstrider" }, { level: 5, spellId: "Pass without Trace" }] });
    expect(option("Elf", "wood-elf")?.abilities[0].effects).toEqual([{ kind: "modifyStat", stat: "speed", flat: 5 }]);
    expect(race("Elf").abilities.map((a) => a.id)).not.toContain("elven-lineage");
    expect(race("Elf").abilities.map((a) => a.id)).not.toContain("keen-senses");
    expect(race("Elf").choices?.find((c) => c.id === "keen-senses")).toMatchObject({ kind: "skill", count: 1, skills: ["insight", "perception", "survival"] });
  });

  it("Gnome: bold paragraphs, italic spells", () => {
    expect(option("Gnome", "rock-gnome")?.spells).toEqual([{ level: 1, spellId: "Mending" }, { level: 1, spellId: "Prestidigitation" }]);
    expect(option("Gnome", "forest-gnome")?.spells).toMatchObject([{ level: 1, spellId: "Minor Illusion" }, { level: 1, spellId: "Speak with Animals", grant: { uses: "proficiency" } }]);
  });

  it("Tiefling: legacy resistance and spells", () => {
    expect(option("Tiefling", "infernal")).toMatchObject({ spells: [{ level: 1, spellId: "Fire Bolt" }, { level: 3, spellId: "Hellish Rebuke" }, { level: 5, spellId: "Darkness" }] });
    expect(option("Tiefling", "infernal")?.abilities[0].effects).toEqual([{ kind: "flag", flag: "resistance", damageType: "fire", percent: 50 }]);
  });

  it("Dragonborn breath grants both shapes with one shared pool", () => {
    expect(option("Dragonborn", "red")?.spells).toEqual(["Cone", "Line"].map((shape) => ({ level: 1, spellId: `Breath Weapon (Fire, ${shape})`, grant: { uses: "proficiency", rest: "long", castLevel: 0, dcAbility: "constitution", sharedPool: "breath-weapon" } })));
  });

  it("Dragonborn: ten ancestries with resistance and a breath note; Damage Resistance trait removed", () => {
    expect(lineage("Dragonborn")?.options).toHaveLength(10);
    expect(option("Dragonborn", "red")?.abilities.map((a) => a.effects[0])).toEqual([{ kind: "flag", flag: "resistance", damageType: "fire", percent: 50 }, { kind: "note", text: "Breath Weapon (Fire)" }]);
    expect(race("Dragonborn").abilities.map((a) => a.id)).not.toContain("damage-resistance");
  });

  it("Goliath: six giants; Fire's Burn hits for 1d10 fire, uses = proficiency per long rest", () => {
    expect(lineage("Goliath")?.options?.map((o) => o.id)).toEqual(["cloud-giant", "fire-giant", "frost-giant", "hill-giant", "stone-giant", "storm-giant"]);
    expect(option("Goliath", "fire-giant")?.abilities[0]).toMatchObject({ name: "Fire's Burn", trigger: { event: "hit", role: "attacker" }, limits: { perRest: { rest: "long", uses: { formula: "prof" } } }, effects: [{ kind: "dealDamage", amount: "1d10", damageType: "fire" }] });
    expect(option("Goliath", "cloud-giant")?.abilities[0].effects).toEqual([{ kind: "note", text: "Cloud's Jaunt" }]);
  });

  it("Human: Skillful and Versatile; Dwarf has no choices", () => {
    expect(race("Human").choices?.map((c) => [c.id, c.kind])).toEqual([["skillful", "skill"], ["versatile", "feat"]]);
    expect(race("Human").choices?.[1].featTypes).toEqual(["origin"]);
    expect(race("Dwarf").choices).toBeUndefined();
  });

  it("totals and schema", () => {
    const options = races.flatMap((r) => r.choices?.find((c) => c.lineage)?.options ?? []);

    expect(options).toHaveLength(24);
    expect(options.flatMap((o) => o.spells ?? [])).toHaveLength(42);

    for (const r of races) if (r.choices) expect(RaceChoicesSchema.safeParse(r.choices).success, r.name).toBe(true);
  });
});
