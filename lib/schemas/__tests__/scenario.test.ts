import { describe, expect, it } from "vitest";

import { createScenarioPageSchema, saveScenarioContentSchema, scenarioContentSchema, scenarioSectionPatchSchema } from "@/lib/schemas/scenario";

const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text, marks: [{ type: "secret" }] }] }] });

const content = (ids: string[]) => ({ legend: [{ kind: "read", label: "Вголос" }], sections: ids.map((id) => ({ id, title: id, played: false, rows: [{ id: `${id}-r`, story: doc("a"), notes: doc("b") }] })) });

describe("scenario schemas", () => {
  it("приймає валідний контент", () => {
    expect(scenarioContentSchema.safeParse(content(["s1", "s2"])).success).toBe(true);
  });

  it("приймає marker у розділі й рядку, відкидає порожній markerId", () => {
    const c = content(["s1"]) as { sections: Record<string, unknown>[] };

    (c.sections[0] as { marker?: unknown }).marker = { mapId: "w", markerId: "m" };
    ((c.sections[0].rows as Record<string, unknown>[])[0]).marker = { mapId: "w", markerId: "m" };
    expect(scenarioContentSchema.safeParse(c).success).toBe(true);

    ((c.sections[0].rows as Record<string, unknown>[])[0]).marker = { mapId: "w", markerId: "" };
    expect(scenarioContentSchema.safeParse(c).success).toBe(false);
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

describe("scenarioContentSchema — прив'язки рядка", () => {
  const doc = { type: "doc", content: [] };

  const content = (row: Record<string, unknown>) => ({ legend: [], sections: [{ id: "s1", title: "Розділ", played: false, rows: [{ id: "r1", story: doc, notes: doc, ...row }] }] });

  it("приймає slide і battleId", () => {
    const parsed = scenarioContentSchema.parse(content({ slide: { deckId: "d1", slideId: "slide-0001" }, battleId: "b1" }));

    expect(parsed.sections[0].rows[0]).toMatchObject({ slide: { deckId: "d1", slideId: "slide-0001" }, battleId: "b1" });
  });

  it("без прив'язок рядок як раніше", () => {
    expect(scenarioContentSchema.parse(content({})).sections[0].rows[0]).not.toHaveProperty("slide");
  });

  it("відкидає slide без slideId", () => {
    expect(scenarioContentSchema.safeParse(content({ slide: { deckId: "d1" } })).success).toBe(false);
  });
});

describe("image node", () => {
  const withImage = (attrs: Record<string, unknown>) => {
    const c = content(["s1"]);

    c.sections[0].rows[0].notes = { type: "doc", content: [{ type: "image", attrs }] } as never;

    return scenarioContentSchema.safeParse(c).success;
  };

  const mediaId = "a".repeat(24);

  it("accepts mediaId without src and rejects a bad id or caption length", () => {
    expect(withImage({ mediaId })).toBe(true);
    expect(withImage({ mediaId: "xyz" })).toBe(false);
    expect(withImage({ mediaId, caption: "x".repeat(301) })).toBe(false);
  });

  it("treats null src/alt/caption (tiptap getJSON) as absent", () => {
    expect(withImage({ mediaId, src: null, alt: null, caption: null })).toBe(true);
    expect(withImage({ mediaId, src: "https://evil.example/x.png", alt: null })).toBe(false);
  });

  it("rejects a foreign src host and accepts project storage", () => {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";

    try {
      expect(withImage({ mediaId, src: "https://evil.test/a.png" })).toBe(false);
      expect(withImage({ mediaId, src: "https://proj.supabase.co/storage/v1/object/public/compendium-media/c/a.webp" })).toBe(true);
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_URL = base;
    }
  });
});
