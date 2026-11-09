import { describe, expect, it } from "vitest";

import { bonus, moveOf, runYards, skillTarget, value, walkYards, woundsBreakdown, woundsMax } from "../derive";
import { type Characteristics, CharacteristicsSchema } from "../schema";

import type { MutationEffect } from "@/lib/utils/rules/systems";

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

describe("derive with corruption", () => {
  const withEffects = (patch: Record<string, unknown>, ...effects: MutationEffect[]): Characteristics => ({ ...make(patch), corruption: { points: 0, mutations: [{ id: "m", at: "2026-01-01T00:00:00.000Z", kind: "physical", roll: 1, text: "x", effects }] } });

  it("value applies the modifier and floors at 1; bonus follows", () => {
    expect(value(withEffects({}, { type: "characteristic", key: "ws", amount: -10 }), "ws")).toBe(20);
    expect(value(withEffects({ base: { ws: 20 } }, { type: "characteristic", key: "ws", amount: -30 }), "ws")).toBe(1);
    expect(bonus(withEffects({}, { type: "characteristic", key: "ws", amount: -10 }), "ws")).toBe(2);
  });

  it("moveOf and yards", () => {
    const c = withEffects({ move: 2 }, { type: "move", amount: -3 });

    expect(moveOf(c)).toBe(1);
    expect(walkYards(c)).toBe(2);
    expect(runYards(c)).toBe(4);
  });

  it("woundsMax adds maxWounds and floors at 1", () => {
    expect(woundsMax(make())).toBe(12);
    expect(woundsMax(withEffects({}, { type: "maxWounds", amount: 2 }))).toBe(14);
    expect(woundsMax(withEffects({ base: { s: 20, t: 20, wp: 20 } }, { type: "maxWounds", amount: -10 }))).toBe(1);
  });
});
