import { describe, expect, it } from "vitest";

import { makeAbility, makeClass } from "./class-fixtures";

import { chosenSubclassId, openSpellPicks, rowItems, splitPathRows } from "@/lib/utils/characters/classes/path";
import { buildClassProgression } from "@/lib/utils/characters/classes/progression";

const cls = makeClass({
  features: [
    { level: 1, abilities: [makeAbility("a1", "Second Wind", "Heal")] },
    { level: 4, abilities: [], choices: [{ id: "asi4", label: "ASI", level: 4, count: 1, kind: "feat" }] },
    { level: 5, abilities: [makeAbility("a5", "Extra Attack", "Hit twice")] },
    { level: 9, abilities: [makeAbility("a9", "Indomitable", "Reroll")] },
  ],
  subclassLevel: 3,
  subclasses: [
    { id: "champ", name: "Champion", features: [{ level: 3, abilities: [makeAbility("c3", "Improved Critical", "19-20")] }] },
    { id: "bm", name: "Battle Master", features: [{ level: 3, abilities: [makeAbility("b3", "Maneuvers", "Dice")] }] },
  ],
});

const levels = (rows: { level: number }[]) => rows.map((r) => r.level);

describe("splitPathRows", () => {
  it("drops levels with neither items nor picks", () => {
    const { reached, focus, future } = splitPathRows(buildClassProgression(cls, { classId: "fighter", level: 4 }));

    const all = levels([...reached, ...focus, ...future]);

    expect(all).not.toContain(2);
    expect(all).not.toContain(6);
  });

  it("level 4: reached below, current and next as focus, rest as future", () => {
    const { reached, focus, future } = splitPathRows(buildClassProgression(cls, { classId: "fighter", level: 4 }));

    expect(levels(reached)).toEqual([1, 3]);
    expect(levels(focus)).toEqual([4, 5]);
    expect(levels(future)).toEqual([9]);
  });

  it("level 20 has only the current level in focus", () => {
    const { focus } = splitPathRows(buildClassProgression(makeClass({ features: [{ level: 20, abilities: [makeAbility("x", "Capstone", "Big")] }] }), { classId: "fighter", level: 20 }));

    expect(levels(focus)).toEqual([20]);
  });
});

describe("rowItems", () => {
  it("adds only the chosen subclass items", () => {
    const p = buildClassProgression(cls, { classId: "fighter", level: 4, subclassId: "champ" });

    const row = p.rows[2];

    expect(chosenSubclassId(p)).toBe("champ");
    expect(rowItems(row, "champ").map((i) => i.name)).toEqual(["Improved Critical"]);
    expect(rowItems(row, null)).toEqual([]);
  });
});

describe("openSpellPicks", () => {
  const caster = makeClass({
    id: "cleric",
    features: [{ level: 1, abilities: [], choices: [{ id: "cantrips", label: "Cantrips", level: 1, count: 2, kind: "spell", spells: { lists: ["Cleric"], minLevel: 0, maxLevel: 0 } }] }],
  });

  it("counts missing spells, and shrinks as picks are made", () => {
    expect(openSpellPicks([buildClassProgression(caster, { classId: "cleric", level: 1 })])).toBe(2);
    expect(openSpellPicks([buildClassProgression(caster, { classId: "cleric", level: 1, choices: { cantrips: [{ id: "s1" }] } })])).toBe(1);
  });

  it("sums several classes and ignores non-spell picks", () => {
    const one = buildClassProgression(caster, { classId: "cleric", level: 1 });

    expect(openSpellPicks([one, one])).toBe(4);
    expect(openSpellPicks([buildClassProgression(cls, { classId: "fighter", level: 4 })])).toBe(0);
  });

  it("is zero for undefined or empty", () => {
    expect(openSpellPicks(undefined)).toBe(0);
    expect(openSpellPicks([])).toBe(0);
  });
});
