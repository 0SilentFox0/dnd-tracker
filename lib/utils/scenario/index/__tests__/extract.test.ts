import { describe, expect, it } from "vitest";

import { extractPageFacts } from "@/lib/utils/scenario/index/extract";
import type { MentionType, RichDoc, RichMark, RichNode, ScenarioContent, ScenarioRow, ScenarioSection } from "@/types/scenario";

const doc = (...content: RichNode[]): RichDoc => ({ type: "doc", content });

const para = (...content: RichNode[]): RichNode => ({ type: "paragraph", content });

const mention = (type: string, id: unknown, label: string, marks?: RichMark[]): RichNode =>
  ({ type: "mention", attrs: { type, id, label }, marks }) as RichNode;

const secretMark: RichMark = { type: "secret" };

const row = (story: RichDoc, notes: RichDoc = doc(), extra: Partial<ScenarioRow> = {}): ScenarioRow => ({ id: "r", story, notes, ...extra });

const section = (rows: ScenarioRow[], extra: Partial<ScenarioSection> = {}): ScenarioSection => ({ id: "s1", title: "Scene", played: false, rows, ...extra });

const content = (...sections: ScenarioSection[]): ScenarioContent => ({ legend: [], sections });

describe("extractPageFacts", () => {
  it("merges the same chip across story and notes of different rows", () => {
    const facts = extractPageFacts(
      content(section([row(doc(para(mention("unit", "u1", "Orc")))), row(doc(), doc(para(mention("unit", "u1", "Orc"))))])),
    );

    expect(facts.sections[0].refs).toEqual([{ type: "unit", id: "u1", label: "Orc", count: 2, secret: false }]);
  });

  it("finds chips nested in lists, table cells and callouts", () => {
    const nested: RichNode = {
      type: "callout",
      content: [{ type: "bulletList", content: [{ type: "listItem", content: [para(mention("spell", "sp1", "Bolt"))] }] }],
    };

    const cell: RichNode = { type: "table", content: [{ type: "tableRow", content: [{ type: "tableCell", content: [para(mention("artifact", "a1", "Ring"))] }] }] };

    const facts = extractPageFacts(content(section([row(doc(nested, cell))])));

    expect(facts.sections[0].refs.map((r) => r.id).sort()).toEqual(["a1", "sp1"]);
  });

  it("marks secrets from the chip or any ancestor, and downgrades mixed use to non-secret", () => {
    const secretChip = mention("unit", "u1", "Orc", [secretMark]);

    const inSecretParent: RichNode = { type: "paragraph", marks: [secretMark], content: [mention("unit", "u2", "Elf")] };

    const mixed = [para(mention("unit", "u3", "Imp", [secretMark])), para(mention("unit", "u3", "Imp"))];

    const facts = extractPageFacts(content(section([row(doc(para(secretChip), inSecretParent, ...mixed))])));

    const byId = Object.fromEntries(facts.sections[0].refs.map((r) => [r.id, r.secret]));

    expect(byId).toEqual({ u1: true, u2: true, u3: false });
  });

  it("turns battleId and markers into refs", () => {
    const facts = extractPageFacts(
      content(
        section([row(doc(), doc(), { battleId: "b1", marker: { mapId: "m", markerId: "mk1" } })], { marker: { mapId: "m", markerId: "mk1" } }),
      ),
    );

    expect(facts.sections[0].refs).toEqual([
      { type: "marker", id: "mk1", label: "", count: 2, secret: false },
      { type: "battle", id: "b1", label: "", count: 1, secret: false },
    ]);
  });

  it("skips malformed chips", () => {
    const bad: RichNode[] = [mention("wat", "x", "x"), mention("unit", 5, "x"), { type: "mention" }];

    const facts = extractPageFacts(content(section([row(doc(para(...bad)))])));

    expect(facts.sections[0].refs).toEqual([]);
  });

  it("handles empty content and carries section meta", () => {
    expect(extractPageFacts(content())).toEqual({ sections: [] });

    const facts = extractPageFacts(content(section([row(doc())], { id: "s9", title: "T", played: true })));

    expect(facts.sections).toEqual([{ id: "s9", title: "T", played: true, refs: [] }]);
  });

  it("keeps the first non-empty label", () => {
    const type: MentionType = "character";

    const facts = extractPageFacts(content(section([row(doc(para(mention(type, "c1", ""), mention(type, "c1", "Zehir")))) ])));

    expect(facts.sections[0].refs[0].label).toBe("Zehir");
  });
});
