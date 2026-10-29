import { describe, expect, it } from "vitest";

import { spellRow } from "./helpers";

import { SpellDefinitionSchema } from "@/lib/utils/spells/model/schema";

const timed = { range: { type: "point", distance: { type: "feet", amount: 90 } }, duration: [{ type: "timed", duration: { type: "minute", amount: 1 }, concentration: true }] };

describe("terrainZoneSpell", () => {
  const entries = [
    "A swirl of motes fills a 20-foot-radius sphere centered on a point within range. The area is heavily obscured.",
    "For the duration, the area is {@quickref difficult terrain||3}. When a creature attempts to leave the area, it must make a Strength saving throw. On a failed save, it is pulled back to the unoccupied space closest to the center of the sphere.",
  ];

  it("fog + difficult terrain zone with a save-or-pull exit trigger", () => {
    const d = spellRow(entries, { ...timed, level: 3, savingThrow: ["strength"] });

    expect(d).toMatchObject({
      native: {
        fields: {
          targeting: {
            kind: "template",
            shape: "circle",
            size: 20,
            range: 90,
            zone: { rounds: 10, terrain: ["difficult", "obscured"], side: "enemies", onExit: { save: { ability: "strength" }, effects: [], pull: "centre" } },
          },
          resolution: { kind: "auto" },
          spellEffects: [],
        },
      },
    });
  });

  it("the derived fields pass the spell schema", () => {
    const d = spellRow(entries, { ...timed, level: 3, savingThrow: ["strength"] });

    expect("native" in d && SpellDefinitionSchema.safeParse({ cost: "action", raceModifiers: [], effects: [], ...d.native.fields }).success).toBe(true);
  });

  it("without a radius sphere or terrain wording it is not matched", () => {
    const plain = spellRow(["A cloud of motes fills a 20-foot cube. Creatures inside must make a Strength saving throw or fall {@condition prone}."], { ...timed, savingThrow: ["strength"], conditionInflict: ["prone"] });

    expect(plain).not.toMatchObject({ native: { fields: { targeting: { zone: {} } } } });
  });

  it("fog only: no exit trigger", () => {
    const d = spellRow(["Mist fills a 10-foot-radius sphere centered on a point within range. The area is heavily obscured for the duration."], timed);

    expect(d).toMatchObject({ native: { fields: { targeting: { zone: { terrain: ["obscured"] } } } } });
    expect(d).not.toMatchObject({ native: { fields: { targeting: { zone: { onExit: {} } } } } });
  });
});

describe("wallSpell", () => {
  const entries = ["A wall of packed mud that is 5 feet tall, 5 feet wide, and 1 foot thick rises in an unoccupied space you can see within range. The wall has AC 11 and 5 hit points."];

  it("a single-cell wall for the duration", () => {
    const d = spellRow(entries, { ...timed, level: 1 });

    expect(d).toMatchObject({
      native: { fields: { targeting: { kind: "template", shape: "cube", size: 5, range: 90 }, spellEffects: [{ kind: "createTerrain", terrain: "wall", shape: "cell", cells: 1, rounds: 10 }] } },
    });
  });

  it("a wall that deals damage or forces a save is not matched", () => {
    const d = spellRow(["A wall that is 5 feet tall, 5 feet wide rises. A creature touching it takes {@damage 2d6} fire damage."], { ...timed, damageInflict: ["fire"] });

    expect(d).not.toMatchObject({ native: { fields: { spellEffects: [{ kind: "createTerrain" }] } } });
  });
});

describe("line terrain rider", () => {
  const entries = [
    "Make a ranged spell attack against a creature you can see within range. On a hit, the target takes {@damage 2d12} bludgeoning damage and is pushed 10 feet away from you. The ground in a straight line between you and the target becomes difficult terrain.",
  ];

  it("adds a createTerrain line effect and drops the manual rider", () => {
    const d = spellRow(entries, { range: { type: "point", distance: { type: "feet", amount: 30 } }, spellAttack: ["R"], damageInflict: ["bludgeoning"] });

    expect(d).toMatchObject({ native: { fields: { spellEffects: [{ kind: "dealDamage" }, { kind: "push", feet: 10 }, { kind: "createTerrain", terrain: "difficult", shape: "line", cells: 6, rounds: 10 }] } } });
    expect(d).toMatchObject({ native: { riders: [] } });
  });

  it("without the line wording nothing is added", () => {
    const d = spellRow(["Make a ranged spell attack against a creature within range. On a hit, the target takes {@damage 2d12} bludgeoning damage."], { range: { type: "point", distance: { type: "feet", amount: 30 } }, spellAttack: ["R"], damageInflict: ["bludgeoning"] });

    expect(JSON.stringify(d)).not.toContain("createTerrain");
  });
});
