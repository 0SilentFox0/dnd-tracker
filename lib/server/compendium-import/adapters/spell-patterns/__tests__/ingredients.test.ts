import { describe, expect, it } from "vitest";

import { spellCast } from "../../spell-cast";
import { parseMaterial, parseMaterialText } from "../ingredients";

describe("parseMaterialText", () => {
  it("worth 50+ GP gives minGp", () => {
    expect(parseMaterialText("(a diamond worth 50+ GP)")).toEqual([{ name: "diamond", qty: 1, minGp: 50, consumed: false, focus: false }]);
  });

  it("worth 1,000+ GP, which the spell consumes", () => {
    expect(parseMaterialText("a diamond worth 1,000+ GP, which the spell consumes")).toEqual([{ name: "diamond", qty: 1, minGp: 1000, consumed: true, focus: false }]);
  });

  it("no cost and no consumption is a focus", () => {
    expect(parseMaterialText("a pinch of sand")).toEqual([{ name: "pinch of sand", qty: 1, consumed: false, focus: true }]);
  });

  it("consumed without cost is tracked", () => {
    expect(parseMaterialText("a pinch of ash, which the spell consumes")).toEqual([{ name: "pinch of ash", qty: 1, consumed: true, focus: false }]);
  });

  it("several costs are ambiguous", () => {
    const text = "for each creature you affect with this spell, you must provide one jacinth worth at least 1,000 gp and one ornately carved bar of silver worth at least 100 gp, all of which the spell consumes";

    expect(parseMaterialText(text)).toBeNull();
    expect(parseMaterial({ text, cost: 110000, consume: true })).toBeNull();
  });

  it("empty text is null", () => {
    expect(parseMaterialText("  ")).toBeNull();
  });
});

describe("parseMaterial", () => {
  it("5etools object: copper cost to gp, consume true", () => {
    expect(parseMaterial({ text: "a diamond worth 50+ GP", cost: 5000, consume: true })).toEqual([{ name: "diamond", qty: 1, minGp: 50, consumed: true, focus: false }]);
  });

  it("optional consumption is not consumed", () => {
    expect(parseMaterial({ text: "a ruby", cost: 10000, consume: "optional" })).toEqual([{ name: "ruby", qty: 1, minGp: 100, consumed: false, focus: false }]);
  });

  it("plain object without cost is a focus", () => {
    expect(parseMaterial({ text: "a bit of fleece" })).toEqual([{ name: "bit of fleece", qty: 1, consumed: false, focus: true }]);
  });

  it("string delegates to text parsing", () => {
    expect(parseMaterial("a pinch of sand")?.[0].focus).toBe(true);
  });
});

describe("spellCast components", () => {
  const base = { time: [{ number: 1, unit: "action" }], range: { type: "point", distance: { type: "self" } }, duration: [{ type: "instant" }] };

  it("keeps text and adds flags and ingredients", () => {
    const c = spellCast({ ...base, components: { v: true, s: true, m: { text: "a diamond", cost: 5000, consume: true } } });

    expect(c.components).toBe("V, S, M (a diamond)");
    expect(c.componentFlags).toEqual({ v: true, s: true, m: true });
    expect(c.ingredients).toEqual([{ name: "diamond", qty: 1, minGp: 50, consumed: true, focus: false }]);
  });

  it("no material gives empty ingredients", () => {
    const c = spellCast({ ...base, components: { v: true } });

    expect(c.componentFlags).toEqual({ v: true, s: false, m: false });
    expect(c.ingredients).toEqual([]);
  });
});
