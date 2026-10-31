import { describe, expect, it } from "vitest";

import { makeAbility, makeClass } from "./class-fixtures";

import { chosenSubclassId, classLevels, classSectionOpen, hasSubclassOnly, openSpellPicks, pathSummary, rowItems, splitPathRows, subclassPreview } from "@/lib/utils/characters/classes/path";
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

  it("level 4: a reached row with an unchosen subclass stays in focus, the rest is reached or future", () => {
    const { reached, focus, future } = splitPathRows(buildClassProgression(cls, { classId: "fighter", level: 4 }));

    expect(levels(reached)).toEqual([1]);
    expect(levels(focus)).toEqual([3, 4, 5]);
    expect(levels(future)).toEqual([9]);
  });

  it("a reached row with an open pick is never hidden in the reached group", () => {
    const early = makeClass({ id: "f", features: [{ level: 1, abilities: [makeAbility("a", "Order", "x")], choices: [{ id: "order", label: "Order", level: 1, count: 1, kind: "option" }] }, { level: 2, abilities: [makeAbility("b", "Spark", "y")] }] });

    const { reached, focus } = splitPathRows(buildClassProgression(early, { classId: "f", level: 5 }));

    expect(levels(focus)).toEqual([1]);
    expect(levels(reached)).toEqual([2]);
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

describe("pathSummary", () => {
  it("gives the current level and how many picks wait", () => {
    expect(pathSummary(buildClassProgression(cls, { classId: "fighter", level: 4 }))).toEqual({ level: 4, open: 2 });
    expect(pathSummary(buildClassProgression(cls, { classId: "fighter", level: 4, subclassId: "champ", choices: { asi4: [{ id: "x" }] } }))).toEqual({ level: 4, open: 0 });
  });
});

describe("subclassPreview", () => {
  it("lists what each subclass gives by level, skipping empty levels", () => {
    const wide = makeClass({
      subclassLevel: 3,
      subclasses: [
        { id: "champ", name: "Champion", features: [{ level: 7, abilities: [makeAbility("c7", "Remarkable Athlete", "x")] }, { level: 3, abilities: [makeAbility("c3", "Improved Critical", "x"), makeAbility("c3b", "Bonus", "x")] }] },
        { id: "empty", name: "Empty", features: [] },
      ],
    });

    const preview = subclassPreview(buildClassProgression(wide, { classId: "fighter", level: 2 }));

    expect(preview).toEqual([
      { id: "champ", name: "Champion", icon: null, gains: [{ level: 3, names: ["Improved Critical", "Bonus"] }, { level: 7, names: ["Remarkable Athlete"] }] },
      { id: "empty", name: "Empty", icon: null, gains: [] },
    ]);
  });

  it("carries the subclass icon", () => {
    const withIcon = makeClass({ subclassLevel: 3, subclasses: [{ id: "champ", name: "Champion", icon: "https://x/c.webp", features: [{ level: 3, abilities: [makeAbility("c3", "Improved Critical", "x")] }] }] });

    expect(subclassPreview(buildClassProgression(withIcon, { classId: "fighter", level: 2 }))[0].icon).toBe("https://x/c.webp");
  });
});

describe("hasSubclassOnly", () => {
  const row = buildClassProgression(cls, { classId: "fighter", level: 2 }).rows.find((r) => r.level === 3)!;

  it("is true only when subclass abilities exist and no subclass is chosen", () => {
    expect(hasSubclassOnly(row, null)).toBe(true);
    expect(hasSubclassOnly(row, "champ")).toBe(false);
    expect(hasSubclassOnly(buildClassProgression(cls, { classId: "fighter", level: 2 }).rows.find((r) => r.level === 5)!, null)).toBe(false);
  });
});

describe("classLevels / classSectionOpen", () => {
  const prog = (level: number) => buildClassProgression(cls, { classId: "fighter", level });

  it("classLevels reads the current level of each class", () => {
    expect(classLevels([prog(4), prog(2)]).map((c) => c.level)).toEqual([4, 2]);
  });

  it("classSectionOpen: one or two classes are always open", () => {
    expect(classSectionOpen([prog(5)], prog(5))).toBe(true);
    expect(classSectionOpen([prog(5), prog(5)], prog(5))).toBe(true);
  });

  it("classSectionOpen: with three classes only those with open picks stay open", () => {
    const quiet = prog(9);

    const waiting = prog(4);

    expect(classSectionOpen([quiet, quiet, quiet], quiet)).toBe(pathSummary(quiet).open > 0);
    expect(pathSummary(waiting).open).toBeGreaterThan(0);
    expect(classSectionOpen([quiet, quiet, waiting], waiting)).toBe(true);
  });
});
