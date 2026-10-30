import { describe, expect, it } from "vitest";

import { scenarioAiOpInputSchema } from "@/lib/schemas/ai";

const parse = (v: unknown) => scenarioAiOpInputSchema.safeParse(v).success;

describe("scenarioAiOpInputSchema acquaintance ops", () => {
  it("createAcquaintance: ref slug and name limits", () => {
    expect(parse({ op: "createAcquaintance", ref: "beatrice", name: "Beatrice" })).toBe(true);
    expect(parse({ op: "createAcquaintance", ref: "bad ref", name: "B" })).toBe(false);
    expect(parse({ op: "createAcquaintance", ref: "b", name: " " })).toBe(false);
  });

  it("linkMentions: ref or id, forms required", () => {
    expect(parse({ op: "linkMentions", acquaintance: { ref: "b" }, forms: ["Beatrice", "Beatrices"] })).toBe(true);
    expect(parse({ op: "linkMentions", acquaintance: { id: "a1" }, forms: ["x"], sectionId: "s1", rowIds: ["r1"], fields: ["story"] })).toBe(true);
    expect(parse({ op: "linkMentions", acquaintance: { ref: "b" }, forms: [] })).toBe(false);
    expect(parse({ op: "linkMentions", acquaintance: { ref: "b", id: "a" }, forms: ["x"] })).toBe(false);
    expect(parse({ op: "linkMentions", acquaintance: { ref: "b" }, forms: ["x"], fields: ["title"] })).toBe(false);
  });
});
