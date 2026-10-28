import { describe, expect, it } from "vitest";

import {
  assertCleanPrompt,
  autoCreatureSubject,
  composeCreature,
  composeItem,
  composeSkill,
  composeSpell,
  dragonSubject,
  tierRing,
  toCsv,
} from "../icon-prompts/compose";

describe("icon prompt composition", () => {
  it("prefixes the creature style and picks framing", () => {
    const p = composeCreature("a goblin.", "full");

    expect(p).toContain("Circular token composition");
    expect(p).toMatch(/Full-body view of a goblin\.$/);
  });

  it("keys spell colours by palette", () => {
    expect(composeSpell("a bolt", "fire")).toContain("Colour key: fire orange-red.");
  });

  it("adds a tier ring only for tiered skills", () => {
    expect(tierRing("Базова магія Світла")).toContain("bronze");
    expect(tierRing("Шипи")).toBeNull();
    expect(composeSkill("x", "gold", tierRing("Експертна стрільба"))).toContain("gold ring");
  });

  it("composes item prompts with optional flair", () => {
    expect(composeItem("a sword", "a faint glow")).toContain("Add a faint glow around it.");
  });

  it("derives dragon subjects from slugs", () => {
    expect(dragonSubject("ancient-white-dragon")).toContain("icy blast of frost");
    expect(dragonSubject("red-dragon-wyrmling")).toContain("small young dragon");
    expect(dragonSubject("dragon-turtle")).toBeNull();
  });

  it("falls back to name, size and type for unknown creatures", () => {
    const s = autoCreatureSubject({ slug: "x", name: "Foo", size: "large", type: "ooze", fly: false, swim: false, featureNames: [] });

    expect(s).toBe("a foo, a large ooze");
  });

  it("rejects forbidden references and escapes CSV quotes", () => {
    const row = { file: "a.png", name: "A", kind: "units" as const, prompt: "Heroes of Might and Magic art", group: "g" };

    expect(() => assertCleanPrompt(row)).toThrow();
    expect(toCsv([{ ...row, prompt: 'say "hi", ok' }])).toContain('"say ""hi"", ok"');
  });
});
