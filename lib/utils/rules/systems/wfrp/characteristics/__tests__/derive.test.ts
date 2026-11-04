import { describe, expect, it } from "vitest";

import { bonus, runYards, skillTarget, value, walkYards, woundsBreakdown, woundsMax } from "../derive";
import { type Characteristics, CharacteristicsSchema } from "../schema";

const make = (patch: Record<string, unknown> = {}): Characteristics => CharacteristicsSchema.parse(patch);

describe("derive", () => {
  it("value and bonus", () => {
    const c = make({ base: { ws: 35 }, advances: { ws: 7 } });

    expect(value(c, "ws")).toBe(42);
    expect(bonus(c, "ws")).toBe(4);
  });

  it("woundsMax", () => {
    const c = make({ base: { s: 40, t: 35, wp: 30 } });

    expect(woundsMax(c)).toBe(13);
    expect(woundsMax({ ...c, extraWounds: 1 })).toBe(16);
  });

  it("woundsBreakdown is one line", () => {
    const lines = woundsBreakdown(make({ base: { s: 40, t: 35, wp: 30 }, extraWounds: 1 }));

    expect(lines).toEqual([{ label: "characterProfile.sheet.lines.wounds", params: { sb: 4, tb: 3, wpb: 3, extra: 3 } }]);
  });

  it("walk and run yards", () => {
    const c = make({ move: 5 });

    expect(walkYards(c)).toBe(10);
    expect(runYards(c)).toBe(20);
  });
});

describe("skillTarget", () => {
  it("basic skill is trained", () => {
    expect(skillTarget(make({ base: { ag: 45 }, skillAdvances: { dodge: 10 } }), "dodge")).toMatchObject({ target: 55, trained: true, advances: 10, characteristic: "ag" });
  });

  it("advanced without advances is untrained", () => {
    expect(skillTarget(make(), "channelling")).toMatchObject({ target: 30, trained: false });
  });

  it("melee specs", () => {
    expect(skillTarget(make(), "melee", "basic")).toMatchObject({ trained: true, target: 30 });
    expect(skillTarget(make(), "melee", "flail")).toMatchObject({ trained: false });
    expect(skillTarget(make(), "melee", "axe")).toBeNull();
  });

  it("open specialisation", () => {
    expect(skillTarget(make({ skillAdvances: { "lore:old-world": 5 } }), "lore", "old-world")).toMatchObject({ trained: true, target: 35 });
    expect(skillTarget(make(), "lore")).toBeNull();
  });

  it("unknown skill", () => {
    expect(skillTarget(make(), "nope")).toBeNull();
  });
});
