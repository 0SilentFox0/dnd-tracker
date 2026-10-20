import { describe, expect, it } from "vitest";

import { addRow, addSection, emptyContent, moveRow, moveSection, removeRow, removeSection, updateRow, updateSection } from "@/lib/utils/scenario/structure";

describe("structure", () => {
  it("addSection додає розділ з одним порожнім рядком і унікальними id", () => {
    const c = addSection(addSection(emptyContent(), "A"), "B");

    expect(c.sections.map((s) => s.title)).toEqual(["A", "B"]);
    expect(c.sections[0].rows).toHaveLength(1);
    expect(new Set([c.sections[0].id, c.sections[1].id]).size).toBe(2);
  });

  it("move/remove/update розділів не мутують вхід", () => {
    const c = addSection(addSection(emptyContent(), "A"), "B");

    const [a, b] = c.sections;

    expect(moveSection(c, b.id, -1).sections.map((s) => s.title)).toEqual(["B", "A"]);
    expect(moveSection(c, a.id, -1)).toBe(c);
    expect(removeSection(c, a.id).sections.map((s) => s.title)).toEqual(["B"]);
    expect(updateSection(c, a.id, { title: "A2" }).sections[0].title).toBe("A2");
    expect(c.sections[0].title).toBe("A");
  });

  it("рядки: add/update/move/remove", () => {
    const base = addSection(emptyContent(), "A");

    const sid = base.sections[0].id;

    const c = addRow(base, sid);

    const [r1, r2] = c.sections[0].rows;

    expect(moveRow(c, sid, r2.id, -1).sections[0].rows[0].id).toBe(r2.id);
    expect(removeRow(c, sid, r1.id).sections[0].rows.map((r) => r.id)).toEqual([r2.id]);

    const story = { type: "doc" as const, content: [{ type: "paragraph" as const }] };

    expect(updateRow(c, sid, r1.id, { story }).sections[0].rows[0].story).toBe(story);
  });
});
