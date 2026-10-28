import { describe, expect, it } from "vitest";

import { choiceSlug } from "@/lib/utils/characters/choices/slug";

describe("choiceSlug", () => {
  it("kebab slug, unique among taken, fallback for non-latin text", () => {
    expect(choiceSlug("Elven Lineage")).toBe("elven-lineage");
    expect(choiceSlug("Elven Lineage", ["elven-lineage"])).toBe("elven-lineage-2");
    expect(choiceSlug("Лінія")).toBe("choice");
    expect(choiceSlug("Лінія", ["choice", "choice-2"])).toBe("choice-3");
  });
});
