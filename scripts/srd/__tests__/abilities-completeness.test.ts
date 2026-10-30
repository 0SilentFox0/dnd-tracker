import { describe, expect, it } from "vitest";

import { readSrdData } from "../lib/data-files";

import { AbilitySchema } from "@/lib/utils/abilities/schema";

const data = readSrdData();

const find = (className: string, id: string, subclass?: string) => {
  const cls = data.classes.find((c) => c.name === className)!;

  const groups = subclass ? cls.subclasses.find((s) => s.name === subclass)!.features : cls.features;

  return groups.flatMap((g) => g.abilities).find((a) => a.id === id);
};

describe("SRD 5.2 abilities: completeness (parts 3 and 4)", () => {
  it("Frenzy needs Rage and a Reckless Attack mark, once per turn, scaling by the Frenzy column", () => {
    expect(find("Barbarian", "frenzy-3", "Path of the Berserker")).toMatchObject({
      trigger: { event: "hit", role: "attacker" },
      limits: { perTurn: 1 },
      effects: [{ kind: "dealDamage", amount: { scale: "frenzy" } }],
    });

    const column = data.classes.find((c) => c.name === "Barbarian")!.columns.find((c) => c.key === "frenzy")!;

    expect([column.values[1], column.values[2], column.values[8], column.values[15]]).toEqual(["", "2d6", "3d6", "4d6"]);
    expect(find("Barbarian", "reckless-attack-2")?.effects).toContainEqual({ kind: "mark", markId: "reckless", duration: { rounds: 1 }, target: "self" });
  });

  it("senses become flags: Feral Senses, Stonecunning, Drow Superior Darkvision", () => {
    expect(find("Ranger", "feral-senses-18")?.effects).toEqual([{ kind: "flag", flag: "sense", sense: "blindsight", range: 30 }]);

    const dwarf = data.races.find((r) => r.name === "Dwarf")!.abilities.find((a) => a.id === "stonecunning")!;

    expect(dwarf.effects).toEqual([{ kind: "flag", flag: "sense", sense: "tremorsense", range: 60, duration: { rounds: 99 }, target: "self" }]);

    const drow = data.races.find((r) => r.name === "Elf")!.choices!.flatMap((c) => c.options ?? []).find((o) => o.id === "drow")!;

    expect(drow.abilities?.[0].effects).toEqual([{ kind: "flag", flag: "sense", sense: "darkvision", range: 120 }]);
  });

  it("Step of the Wind doubles speed for the turn", () => {
    const focus = data.classes.find((c) => c.name === "Monk")!.features.flatMap((g) => g.abilities).find((a) => a.id === "monks-focus-step-of-the-wind-2")!;

    expect(focus.effects[0]).toMatchObject({ kind: "modifyStat", stat: "speed", percent: 100, until: "turnEnd" });
  });

  it("Circle of the Land Spells exists as a level 3 subclass feature", () => {
    const ability = find("Druid", "spell-list-3", "Circle of the Land")!;

    expect(ability.name).toBe("Circle of the Land Spells");
    expect(ability.description).toContain("Arid Land");
  });

  it("Magic Initiate (Druid) is limited to the Druid list", () => {
    const feat = data.feats.find((f) => f.name === "Magic Initiate (Druid)")!;

    expect(feat.repeatable).toBe(true);
    expect(feat.choices.every((c) => c.spells?.lists.join() === "Druid")).toBe(true);
  });

  it("every ability passes the schema", () => {
    const all = [
      ...data.races.flatMap((r) => r.abilities),
      ...data.classes.flatMap((c) => [...c.features, ...c.subclasses.flatMap((s) => s.features)].flatMap((g) => g.abilities)),
      ...data.feats.flatMap((f) => f.abilities),
    ];

    for (const a of all) expect(AbilitySchema.safeParse(a).success, a.id).toBe(true);
  });
});
