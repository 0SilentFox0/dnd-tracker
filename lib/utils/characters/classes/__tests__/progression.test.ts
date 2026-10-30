import { describe, expect, it } from "vitest";

import { makeAbility as ability, makeClass } from "./class-fixtures";

import { buildClassProgression } from "@/lib/utils/characters/classes/progression";
import type { Choice } from "@/types/choices";
import type { GameClassData } from "@/types/classes";

const choice = (over: Partial<Choice> & Pick<Choice, "id" | "level">): Choice => ({ label: over.id, count: 1, kind: "feat", ...over });

const make = makeClass;

const rich = (): GameClassData =>
  make({
    features: [
      { level: 1, abilities: [ability("a1", "Second Wind", "Heal.\nMore")] },
      { level: 3, abilities: [ability("a3", "Tactics")] },
      { level: 4, abilities: [], choices: [choice({ id: "asi4", level: 4 })] },
      { level: 8, abilities: [], choices: [choice({ id: "asi8", level: 8 })] },
    ],
    subclassLevel: 3,
    subclasses: [
      { id: "champ", name: "Champion", features: [{ level: 3, abilities: [ability("c3", "Crit")], choices: [choice({ id: "style", level: 3 })] }] },
      { id: "battle", name: "Battle Master", features: [{ level: 3, abilities: [], choices: [choice({ id: "style", level: 3 })] }] },
    ],
  });

describe("buildClassProgression", () => {
  it("builds 20 rows for a minimal class", () => {
    const p = buildClassProgression(make());

    expect(p.rows).toHaveLength(20);
    expect(p.subclasses).toEqual([]);
    expect(p.rows.flatMap((r) => r.picks)).toEqual([]);
  });

  it("derives states, picks and subclass marker for an entry", () => {
    const p = buildClassProgression(rich(), { classId: "fighter", level: 4 });

    const at = (l: number) => p.rows[l - 1];

    expect([at(1).state, at(4).state, at(5).state, at(6).state]).toEqual(["reached", "current", "next", "future"]);
    expect(at(1).base[0]).toMatchObject({ key: "a1", summary: "Heal.", description: "Heal.\nMore" });
    expect(at(4).picks).toEqual([expect.objectContaining({ key: "asi4", status: "open", done: 0 })]);
    expect(at(8).picks[0]).toMatchObject({ key: "asi8", status: "locked" });
    expect(at(3).picks).toEqual([expect.objectContaining({ key: "subclass", kind: "subclass", status: "open", done: 0 })]);
    expect(at(3).bySubclass.champ.map((i) => i.key)).toEqual(["c3"]);

    const chosen = buildClassProgression(rich(), { classId: "fighter", level: 4, subclassId: "champ", choices: { asi4: [{ id: "x" }] } });

    expect(chosen.rows[2].picks.map((x) => [x.key, x.status, x.done])).toEqual([
      ["style", "open", 0],
      ["subclass", "done", 1],
    ]);
    expect(chosen.rows[3].picks[0]).toMatchObject({ status: "done", done: 1 });
    expect(chosen.subclasses.find((s) => s.id === "champ")?.chosen).toBe(true);
  });

  it("places a pick on choice.level, not feature.level", () => {
    const p = buildClassProgression(make({ features: [{ level: 1, abilities: [], choices: [choice({ id: "late", level: 6 })] }] }));

    expect(p.rows[0].picks).toEqual([]);
    expect(p.rows[5].picks[0].key).toBe("late");
  });

  it("drops a pick whose scale column is missing", () => {
    const p = buildClassProgression(make({ features: [{ level: 1, abilities: [], choices: [choice({ id: "s", level: 1, count: { scale: "x" } })] }] }));

    expect(p.rows[0].picks).toEqual([]);
  });

  it("template mode: all rows template, subclass picks prefixed", () => {
    const p = buildClassProgression(rich());

    expect(p.rows.every((r) => r.state === "template")).toBe(true);
    expect(p.rows[2].picks.map((x) => [x.key, x.status, x.done])).toEqual([
      ["champ:style", "template", null],
      ["battle:style", "template", null],
      ["subclass", "template", null],
    ]);
  });

  it("ignores unknown keys in entry.choices", () => {
    const p = buildClassProgression(rich(), { classId: "fighter", level: 4, choices: { nope: [{ id: "a" }, { id: "b" }] } });

    expect(p.rows[3].picks[0].done).toBe(0);
  });

  it("counts only picks that still resolve to an option", () => {
    const opt = make({ features: [{ level: 1, abilities: [], choices: [choice({ id: "o", level: 1, kind: "option", count: 2, options: [{ id: "k1", name: "K1", abilities: [] }, { id: "k2", name: "K2", abilities: [] }] })] }] });

    const p = buildClassProgression(opt, { classId: "fighter", level: 1, choices: { o: [{ id: "k1" }, { id: "gone" }] } });

    expect(p.rows[0].picks[0]).toMatchObject({ done: 1, required: 2, status: "open" });
  });

  it("does not mark the subclass done when the chosen subclass was deleted", () => {
    const p = buildClassProgression(rich(), { classId: "fighter", level: 4, subclassId: "deleted" });

    expect(p.rows[2].picks).toEqual([expect.objectContaining({ key: "subclass", status: "open", done: 0 })]);
  });

  it("lists what was picked: option names where the class knows them, raw ids otherwise", () => {
    const c = make({
      features: [
        { level: 1, abilities: [], choices: [choice({ id: "order", level: 1, kind: "option", options: [{ id: "prot", name: "Protector", abilities: [] }] }), choice({ id: "cantrips", level: 1, kind: "spell", count: 2 })] },
      ],
    });

    const p = buildClassProgression(c, { classId: "fighter", level: 2, choices: { order: [{ id: "prot" }], cantrips: [{ id: "sp-1" }, { id: "sp-2" }] } });

    expect(p.rows[0].picks.map((x) => x.chosen)).toEqual([["Protector"], ["sp-1", "sp-2"]]);
    expect(buildClassProgression(c, { classId: "fighter", level: 2 }).rows[0].picks.map((x) => x.chosen)).toEqual([[], []]);
    expect(buildClassProgression(c).rows[0].picks.map((x) => x.chosen)).toEqual([undefined, undefined]);
  });

  it("cuts a long summary at a word boundary and marks it with an ellipsis", () => {
    const text = "alpha beta gamma ".repeat(20).trim();

    const { summary, description } = buildClassProgression(make({ features: [{ level: 1, abilities: [ability("l", "Long", text)] }] })).rows[0].base[0];

    expect(summary.endsWith("…")).toBe(true);
    expect(summary.length).toBeLessThanOrEqual(121);
    expect(summary.slice(0, -1).split(" ").every((w) => ["alpha", "beta", "gamma"].includes(w))).toBe(true);
    expect(description).toBe(text);
  });

  it("hard-cuts a long summary that has no spaces", () => {
    const p = buildClassProgression(make({ features: [{ level: 1, abilities: [ability("l", "Long", "x".repeat(300))] }] }));

    expect(p.rows[0].base[0].summary).toBe(`${"x".repeat(120)}…`);
    expect(p.rows[0].base[0].description).toHaveLength(300);
  });

  describe("scaled counts follow the character level", () => {
    const col = { key: "prep", label: "Prepared", values: Array.from({ length: 20 }, (_, i) => (i + 1 >= 9 ? "9" : i + 1 >= 5 ? "4" : "")) };

    const wizard = () => make({ columns: [col], features: [{ level: 1, abilities: [], choices: [choice({ id: "prep", level: 1, kind: "spell", count: { scale: "prep" } })] }] });

    const pickN = (n: number) => ({ prep: Array.from({ length: n }, (_, i) => ({ id: `s${i}` })) });

    it("sizes by entry level: 4/4 done at L5, 4/9 open at L9", () => {
      const l5 = buildClassProgression(wizard(), { classId: "fighter", level: 5, choices: pickN(4) });

      expect(l5.rows[0].picks[0]).toMatchObject({ required: 4, done: 4, status: "done" });

      const l9 = buildClassProgression(wizard(), { classId: "fighter", level: 9, choices: pickN(4) });

      expect(l9.rows[0].picks[0]).toMatchObject({ required: 9, done: 4, status: "open" });
    });

    it("keeps a pick whose column is 0 at choice.level but positive at entry level", () => {
      expect(buildClassProgression(wizard(), { classId: "fighter", level: 5 }).rows[0].picks).toHaveLength(1);
      expect(buildClassProgression(wizard(), { classId: "fighter", level: 2 }).rows[0].picks).toHaveLength(0);
    });
  });
});
