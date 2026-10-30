import { describe, expect, it } from "vitest";

import { updateSpellSchema } from "@/lib/schemas";
import { resolveIngredientsUpdate } from "@/lib/server/spells/ingredients-update";

const diamond = { name: "Diamond", qty: 1, consumed: true, focus: false };

const withM = { ingredients: [diamond], componentFlags: { v: true, s: true, m: true } };

const noM = { ingredients: [], componentFlags: { v: true, s: true, m: false } };

describe("partial spell update with ingredients", () => {
  it("accepts a PATCH with only ingredients when the stored flags have M", () => {
    const data = updateSpellSchema.parse({ ingredients: [diamond] });

    expect(resolveIngredientsUpdate({ ingredients: [], componentFlags: withM.componentFlags }, data)).toEqual([diamond]);
  });

  it("rejects ingredients alone when the stored flags lack M or are null", () => {
    const data = updateSpellSchema.parse({ ingredients: [diamond] });

    expect(() => resolveIngredientsUpdate(noM, data)).toThrow(expect.objectContaining({ status: 400 }));
    expect(() => resolveIngredientsUpdate({ ingredients: [], componentFlags: null }, data)).toThrow(expect.objectContaining({ status: 400 }));
  });

  it("still rejects an explicit contradiction in one body", () => {
    expect(updateSpellSchema.safeParse({ ingredients: [diamond], componentFlags: noM.componentFlags }).success).toBe(false);
  });

  it("clears stored ingredients when only the flags switch M off", () => {
    const data = updateSpellSchema.parse({ componentFlags: { v: true, s: true, m: false } });

    expect(resolveIngredientsUpdate(withM, data)).toEqual([]);
  });

  it("leaves ingredients untouched for other flag changes and unrelated patches", () => {
    expect(resolveIngredientsUpdate(withM, updateSpellSchema.parse({ componentFlags: { v: false, s: true, m: true } }))).toBeUndefined();
    expect(resolveIngredientsUpdate(withM, updateSpellSchema.parse({ name: "X" }))).toBeUndefined();
  });
});
