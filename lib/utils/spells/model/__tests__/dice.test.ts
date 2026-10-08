import { describe, expect, it } from "vitest";

import type { LearnedNode } from "@/lib/utils/skills/progression";
import { assertSpellDice, schoolMasteryFromLearned, spellDice } from "@/lib/utils/spells/model/dice";

const node = (branchId: string, level: "basic" | "advanced" | "expert"): LearnedNode => ({ kind: "branchLevel", nodeId: `${branchId}-${level}`, branchId, level, skillId: null, circle: null });

const learned = [node("b-chaos", "basic"), node("b-chaos", "expert"), node("b-light", "advanced")];

const mastery = schoolMasteryFromLearned(learned, { "b-chaos": "chaos", "b-light": "light" });

const fireball = { dice: 4, groupId: "chaos" };

describe("spellDice", () => {
  it("герой L6 експерт: 6к10 + 6", () => {
    expect(spellDice({ kind: "hero", level: 6 }, fireball, mastery)).toEqual({ count: 6, sides: 10, flat: 6 });
  });

  it("герой L2 без гілки: 4к6", () => {
    expect(spellDice({ kind: "hero", level: 2 }, { dice: 4, groupId: "dark" }, mastery)).toEqual({ count: 4, sides: 6, flat: 2 });
  });

  it("просунутий — к8", () => {
    expect(spellDice({ kind: "hero", level: 3 }, { dice: 2, groupId: "light" }, mastery).sides).toBe(8);
  });

  it("юніт L5: (4+1)к6 + 5, майстерність ігнорується", () => {
    expect(spellDice({ kind: "unit", level: 5 }, fireball, mastery)).toEqual({ count: 5, sides: 6, flat: 5 });
  });
});

describe("spellDice без кубиків", () => {
  it("dice 0: без кубиків і бонусу рівня для героя і юніта", () => {
    const buff = { dice: 0, groupId: "light" };

    expect(spellDice({ kind: "hero", level: 6 }, buff, mastery)).toMatchObject({ count: 0, flat: 0 });
    expect(spellDice({ kind: "unit", level: 6 }, buff, mastery)).toMatchObject({ count: 0, flat: 0 });
  });
});

describe("schoolMasteryFromLearned", () => {
  it("расові й ультимативні вузли не впливають на майстерність", () => {
    const nodes: LearnedNode[] = [
      { nodeId: "r", kind: "racial", skillId: null, branchId: "b-chaos", level: "expert", circle: null },
      { nodeId: "u", kind: "ultimate", skillId: "s", branchId: "b-chaos", level: "expert", circle: null },
    ];

    expect(schoolMasteryFromLearned(nodes, { "b-chaos": "chaos" })("chaos")).toBeNull();
  });
});

describe("assertSpellDice", () => {
  const expected = { count: 6, sides: 10 };

  it("приймає збіг", () => {
    expect(assertSpellDice({ count: 6, sides: 10 }, expected)).toBe(true);
  });

  it("відхиляє невірну кількість або грані", () => {
    expect(assertSpellDice({ count: 5, sides: 10 }, expected)).toBe(false);
    expect(assertSpellDice({ count: 6, sides: 6 }, expected)).toBe(false);
  });
});
