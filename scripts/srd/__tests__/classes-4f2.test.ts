import { describe, expect, it } from "vitest";

import { columnKey, convertClasses } from "../convert/classes";
import { FIXTURE_4F2_DIR, loadOpen5e } from "../lib/open5e";

import { createClassSchema } from "@/lib/schemas/classes";
import { applyClassScale, classPools } from "@/lib/utils/abilities/class-columns";
import type { Ability } from "@/lib/utils/abilities/schema";
import type { GameClassData } from "@/types/classes";

const classes = convertClasses(loadOpen5e(FIXTURE_4F2_DIR));

const cls = (name: string) => classes.find((c) => c.name === name)!;

const all = (name: string) => [...cls(name).features, ...cls(name).subclasses.flatMap((s) => s.features)].flatMap((f) => f.abilities.map((a) => ({ level: f.level, a })));

const ability = (className: string, name: string): Ability => all(className).find((x) => x.a.name === name)!.a;

const scaled = (className: string, name: string, level: number) => applyClassScale([ability(className, name)], { classId: cls(className).slug, level, columns: cls(className).columns })[0];

describe("class columns", () => {
  it("keys from the slug tail, sorted; warlock slot columns and proficiency are not columns", () => {
    expect(cls("Barbarian").columns.map((c) => c.key)).toEqual(["rage-damage", "rages", "weapon-mastery-count"]);
    expect(cls("Rogue").columns.map((c) => c.key)).toEqual(["sneak-attack"]);
    expect(columnKey("srd-2024_rogue_sneak-attack-column-data", "srd-2024_rogue")).toBe("sneak-attack");
    expect(cls("Barbarian").columns.find((c) => c.key === "rages")?.values).toEqual(["2", "2", "3", "3", "3", "4", "4", "4", "4", "4", "4", "5", "5", "5", "5", "5", "6", "6", "6", "6"]);
  });

  it("pools, extra columns, Wild Shape and Unarmored Movement columns", () => {
    expect(cls("Monk").columns.find((c) => c.key === "focus-points")?.pool).toEqual({ rest: "short" });
    expect(cls("Monk").columns.find((c) => c.key === "unarmored-movement")).toMatchObject({ label: "Unarmored Movement", values: expect.arrayContaining(["+10 ft.", "+30 ft."]) });
    expect(cls("Sorcerer").columns.find((c) => c.key === "sorcery-points")?.pool).toEqual({ rest: "long" });
    expect(cls("Cleric").columns.find((c) => c.key === "channel-divinity-uses")?.pool).toEqual({ rest: "short" });
    expect(cls("Cleric").columns.find((c) => c.key === "divine-spark")?.values.slice(0, 8)).toEqual(["", "1d8", "1d8", "1d8", "1d8", "1d8", "2d8", "2d8"]);
    expect(cls("Paladin").columns.find((c) => c.key === "lay-on-hands")).toMatchObject({ pool: { rest: "long" }, values: expect.arrayContaining(["5", "100"]) });
    expect(cls("Fighter").columns.find((c) => c.key === "action-surge")?.values.slice(15, 18)).toEqual(["1", "2", "2"]);
    expect(cls("Druid").columns.find((c) => c.key === "wild-shape-uses")?.label).toBe("Wild Shape");
    expect(all("Druid").some((x) => x.a.name === "Cantrips Known")).toBe(false);
  });

  it("every class row passes the class schema (refs resolve)", () => {
    for (const c of classes) {
      const { slug: _slug, ...body } = c;

      const parsed = createClassSchema.safeParse(body);

      expect(parsed.success, `${c.name}: ${JSON.stringify(parsed.error?.issues.slice(0, 3))}`).toBe(true);
    }
  });
});

describe("scaled class abilities", () => {
  it("Barbarian Rage at 1/9/17: 2/4/6 uses, +2/+3/+4", () => {
    expect([1, 9, 17].map((l) => scaled("Barbarian", "Rage", l).limits?.perRest?.uses)).toEqual([2, 4, 6]);
    expect([1, 9, 17].map((l) => scaled("Barbarian", "Rage", l).effects.find((e) => e.kind === "damageBonus"))).toEqual([2, 3, 4].map((flat) => expect.objectContaining({ flat })));
    expect(ability("Barbarian", "Rage").condition).toEqual({ type: "armorWorn", categories: ["none", "light", "medium"] });
  });

  it("Sneak Attack at Rogue 5 → 3d6, once per turn, advantage or ally adjacent", () => {
    expect(scaled("Rogue", "Sneak Attack", 5).effects[0]).toMatchObject({ kind: "dealDamage", amount: "3d6", target: "eventTarget" });
    expect(ability("Rogue", "Sneak Attack")).toMatchObject({ trigger: { event: "hit", role: "attacker" }, limits: { perTurn: 1 }, condition: { type: "any" } });
  });

  it("Monk 5: Focus pool 5, Patient Defense spends 1", () => {
    const monk = { ...cls("Monk"), id: cls("Monk").slug } as unknown as GameClassData;

    expect(classPools([{ classId: monk.id, level: 5, class: monk, subclass: null }])).toEqual({ [`pool:${monk.id}:focus-points`]: { label: "Focus Points", max: 5, rest: "short" } });
    expect(scaled("Monk", "Patient Defense", 5).limits?.pool).toEqual({ key: `pool:${monk.id}:focus-points`, cost: 1 });
  });

  it("Second Wind and Action Surge read the table; Action Surge only at level 2", () => {
    expect(scaled("Fighter", "Second Wind", 4).limits?.perRest?.uses).toBe(3);
    expect(scaled("Fighter", "Second Wind", 4).effects[1]).toMatchObject({ kind: "heal", amount: { formula: "4" } });
    expect(scaled("Fighter", "Action Surge", 17).limits?.perRest?.uses).toBe(2);
    expect(all("Fighter").filter((x) => x.a.name === "Action Surge").map((x) => x.level)).toEqual([2]);
  });

  it("Channel Divinity and Monk's Focus become options", () => {
    expect(all("Cleric").filter((x) => x.level === 2).map((x) => x.a.name)).toEqual(expect.arrayContaining(["Divine Spark", "Turn Undead"]));
    expect(ability("Cleric", "Divine Spark").id).toBe("channel-divinity-divine-spark-2");
    expect(all("Monk").filter((x) => x.level === 2).map((x) => x.a.name)).toEqual(expect.arrayContaining(["Patient Defense", "Flurry of Blows", "Step of the Wind"]));
    expect(ability("Monk", "Flurry of Blows").description).toContain("Flurry of Blows");
  });

  const MECHANIZED: Array<[string, string]> = [
    ["Barbarian", "Unarmored Defense"], ["Barbarian", "Fast Movement"], ["Barbarian", "Rage"], ["Barbarian", "Relentless Rage"], ["Barbarian", "Mindless Rage"], ["Barbarian", "Retaliation"],
    ["Bard", "Bardic Inspiration"],
    ["Cleric", "Divine Spark"], ["Cleric", "Turn Undead"], ["Cleric", "Preserve Life"],
    ["Paladin", "Lay on Hands"], ["Paladin", "Divine Sense"], ["Paladin", "Sacred Weapon"], ["Paladin", "Aura of Protection"], ["Paladin", "Radiant Strikes"],
    ["Fighter", "Second Wind"], ["Fighter", "Action Surge"], ["Fighter", "Survivor"],
    ["Monk", "Unarmored Defense"], ["Monk", "Unarmored Movement"], ["Monk", "Patient Defense"], ["Monk", "Flurry of Blows"], ["Monk", "Step of the Wind"], ["Monk", "Superior Defense"], ["Monk", "Deflect Attacks"], ["Monk", "Wholeness of Body"], ["Monk", "Uncanny Metabolism"], ["Monk", "Evasion"],
    ["Rogue", "Sneak Attack"], ["Rogue", "Uncanny Dodge"], ["Rogue", "Evasion"],
    ["Sorcerer", "Create Spell Slot"], ["Sorcerer", "Innate Sorcery"], ["Sorcerer", "Draconic Resilience"], ["Sorcerer", "Draconic Resilience: AC"],
    ["Druid", "Wild Shape"],
    ["Wizard", "Empowered Evocation"],
  ];

  it("37 mechanized abilities: a real effect or a pool spend, full SRD text kept", () => {
    expect(MECHANIZED).toHaveLength(37);

    for (const [c, name] of MECHANIZED) {
      const a = ability(c, name);

      expect(a, `${c}/${name}`).toBeDefined();
      expect(!!a.limits?.pool || a.effects.some((e) => e.kind !== "note"), `${c}/${name}`).toBe(true);
      expect(a.description?.length ?? 0, `${c}/${name}`).toBeGreaterThan(40);
    }
  });

  it("Empowered Evocation names the school; evasion flags; Draconic Resilience split", () => {
    expect(ability("Wizard", "Empowered Evocation").effects).toEqual([{ kind: "damageBonus", filter: { kind: "magic", school: "Evocation" }, flat: { formula: "int_mod" } }]);
    expect(ability("Rogue", "Evasion").effects).toEqual([{ kind: "flag", flag: "evasion" }]);
    expect(ability("Sorcerer", "Draconic Resilience").effects).toEqual([{ kind: "modifyStat", stat: "maxHp", flat: { formula: "class_level" } }]);
    expect(ability("Sorcerer", "Draconic Resilience: AC")).toMatchObject({ condition: { type: "armorWorn", categories: ["none"] }, effects: [{ kind: "modifyStat", stat: "armor", flat: { formula: "cha_mod" } }] });
  });
});

describe("duplicate level rows", () => {
  it("Monk Unarmored Movement at level 2 takes the non-empty value", () => {
    expect(cls("Monk").columns.find((c) => c.key === "unarmored-movement")?.values[1]).toBe("+10 ft.");
  });
});
