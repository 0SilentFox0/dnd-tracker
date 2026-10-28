import { describe, expect, it } from "vitest";

import { adaptCompendium } from "../adapt";

const base = { name: "Synthetic Spell", source: "Test", level: 2, school: "V", time: [{ number: 1, unit: "action" }], range: { type: "point", distance: { type: "feet", amount: 60 } }, duration: [{ type: "instant" }], entries: ["Synthetic text."] };

const adapt = (row: Record<string, unknown>) => {
  const result = adaptCompendium({ _meta: { edition: "one" }, spell: [{ ...base, ...row }] });

  return { spell: result.entries.find((e) => e.kind === "spells")!, groups: result.entries.filter((e) => e.kind === "spell-groups") };
};

describe("spell cast fields", () => {
  it("maps time, range, components and duration into cost, casting and the description head", () => {
    const { spell } = adapt({ time: [{ number: 10, unit: "minute" }], components: { v: true, s: true, m: "a pinch of salt" }, duration: [{ type: "timed", duration: { type: "hour", amount: 8 }, concentration: true }], classes: { fromClassList: [{ name: "Wizard", source: "PHB" }] } });

    expect(spell.body).toMatchObject({ cost: "long", casting: { rounds: 100, text: "10minutes" }, concentration: true, lists: ["Wizard"] });
    expect(spell.body.description).toContain("Level 2 Evocation · Casting Time: 10 minutes · Range: 60 feet · Components: V, S, M (a pinch of salt) · Duration: Concentration, up to 8 hours · Classes: Wizard");
    expect(spell.notes).not.toContain("time");
    expect(spell.issues.map((i) => i.code)).not.toContain("UNSUPPORTED_FIELD");
  });

  it("keeps the reaction trigger and bonus action cost", () => {
    expect(adapt({ time: [{ number: 1, unit: "reaction", condition: "which you take when hit" }] }).spell.body).toMatchObject({ cost: "reaction", casting: { trigger: "which you take when hit", text: "reaction" } });
    expect(adapt({ time: [{ number: 1, unit: "bonus" }] }).spell.body).toMatchObject({ cost: "bonusAction", casting: { text: "bonus-action" } });
  });

  it("maps school codes to full school groups with colour and icon", () => {
    const { spell, groups } = adapt({ school: "T" });

    expect(groups).toHaveLength(1);
    expect(groups[0].body).toMatchObject({ name: "Transmutation", color: expect.stringMatching(/^#/), icon: "vortex" });
    expect(spell.refs).toMatchObject([{ path: ["groupId"], kind: "spellSchool", name: "Transmutation" }]);
    expect(adapt({ school: "P" }).groups[0].body.name).toBe("Psionic");
    expect(adapt({ school: "Z" }).groups[0].body).toEqual({ name: "Z" });
  });
});
