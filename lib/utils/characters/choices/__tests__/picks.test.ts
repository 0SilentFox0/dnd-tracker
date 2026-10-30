import { describe, expect, it } from "vitest";

import { elf } from "./fixtures";

import { choicesBodyOf, choicesStateOf, keepStoredPicks, lineageName, withClassPicks, withClassSubclasses } from "@/lib/utils/characters/choices/picks";

describe("picks helpers", () => {
  it("choicesStateOf reads all three columns tolerantly", () => {
    expect(choicesStateOf({ raceChoices: { a: [{ id: "x" }] }, feats: [{ id: "f", source: "dm" }], classes: [{ classId: "c", level: 2, choices: { m: [{ id: "q" }] } }, { bad: 1 }] })).toEqual({
      raceChoices: { a: [{ id: "x" }] },
      feats: [{ id: "f", source: "dm" }],
      classes: [{ classId: "c", level: 2, choices: { m: [{ id: "q" }] } }],
    });
    expect(choicesStateOf({})).toEqual({ raceChoices: {}, feats: [], classes: [] });
  });

  it("keepStoredPicks ignores incoming picks and keeps the stored ones by classId", () => {
    const stored = [{ classId: "c", level: 3, choices: { m: [{ id: "q" }] } }];

    expect(keepStoredPicks([{ classId: "c", level: 4, choices: { m: [{ id: "stale" }] } }, { classId: "d", level: 1, choices: { x: [{ id: "y" }] } }], stored)).toEqual([
      { classId: "c", level: 4, choices: { m: [{ id: "q" }] } },
      { classId: "d", level: 1 },
    ]);
  });

  it("withClassPicks replaces picks of the named classes only", () => {
    expect(withClassPicks([{ classId: "c", level: 1 }, { classId: "d", level: 1, choices: { a: [{ id: "b" }] } }], { c: { m: [{ id: "q" }] } })).toEqual([
      { classId: "c", level: 1, choices: { m: [{ id: "q" }] } },
      { classId: "d", level: 1, choices: { a: [{ id: "b" }] } },
    ]);
  });

  it("lineageName: option name, null when unpicked, undefined without a lineage", () => {
    expect(lineageName(elf, { "elven-lineage": [{ id: "wood-elf" }] })).toBe("Wood Elf");
    expect(lineageName(elf, {})).toBeNull();
    expect(lineageName({ ...elf, choices: elf.choices.filter((c) => !c.lineage) }, {})).toBeUndefined();
    expect(lineageName(null, {})).toBeUndefined();
  });
});

describe("subclass picks", () => {
  const entries = [{ classId: "c", level: 3 }, { classId: "d", level: 3, subclassId: "s1" }];

  it("sets an empty subclass, ignores unknown classes", () => {
    expect(withClassSubclasses(entries, { c: "s9", zzz: "s2" })).toEqual([{ classId: "c", level: 3, subclassId: "s9" }, entries[1]]);
  });

  it("the same subclass again is not a conflict", () => {
    expect(withClassSubclasses(entries, { d: "s1" })).toEqual(entries);
  });

  it("a different subclass is a conflict", () => {
    expect(withClassSubclasses(entries, { d: "s2" })).toBeNull();
  });

  it("choicesBodyOf lists subclasses only for entries that have one", () => {
    expect(choicesBodyOf({ raceChoices: {}, feats: [], classes: entries }).classSubclasses).toEqual({ d: "s1" });
    expect(choicesBodyOf({ raceChoices: {}, feats: [], classes: [entries[0]] })).not.toHaveProperty("classSubclasses");
  });
});
