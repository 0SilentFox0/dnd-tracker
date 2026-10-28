import { describe, expect, it } from "vitest";

import { createScenarioPageSchema, saveScenarioContentSchema, scenarioContentSchema, scenarioSectionPatchSchema } from "@/lib/schemas/scenario";

const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text, marks: [{ type: "secret" }] }] }] });

const content = (ids: string[]) => ({ legend: [{ kind: "read", label: "Вголос" }], sections: ids.map((id) => ({ id, title: id, played: false, rows: [{ id: `${id}-r`, story: doc("a"), notes: doc("b") }] })) });

describe("scenario schemas", () => {
  it("приймає валідний контент", () => {
    expect(scenarioContentSchema.safeParse(content(["s1", "s2"])).success).toBe(true);
  });

  it("відкидає невідомий тип вузла", () => {
    const bad = content(["s1"]);

    bad.sections[0].rows[0].story = { type: "doc", content: [{ type: "iframe" }] } as never;
    expect(scenarioContentSchema.safeParse(bad).success).toBe(false);
  });

  it("відкидає невідому марку", () => {
    const bad = content(["s1"]);

    bad.sections[0].rows[0].story = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link" }] }] }] } as never;
    expect(scenarioContentSchema.safeParse(bad).success).toBe(false);
  });

  it("відкидає дубльовані id розділів і рядків", () => {
    expect(scenarioContentSchema.safeParse(content(["s1", "s1"])).success).toBe(false);
  });

  it("save вимагає expectedVersion", () => {
    expect(saveScenarioContentSchema.safeParse({ content: content(["s1"]) }).success).toBe(false);
  });

  it("section patch вимагає хоча б одне поле", () => {
    expect(scenarioSectionPatchSchema.safeParse({}).success).toBe(false);
    expect(scenarioSectionPatchSchema.safeParse({ played: true }).success).toBe(true);
  });

  it("create обрізає назву і відкидає порожню", () => {
    expect(createScenarioPageSchema.parse({ kind: "scene", title: "  Монастир  " }).title).toBe("Монастир");
    expect(createScenarioPageSchema.safeParse({ kind: "scene", title: "   " }).success).toBe(false);
  });
});
