import { describe, expect, it } from "vitest";

import { ingredientFromPreset, patchIngredient } from "../presets";
import { deriveComponentFlags, summarizeIngredients } from "../summary";

const labels = { minGp: (gp: number) => `>=${gp} gp`, consumed: "consumed" };

describe("summarizeIngredients", () => {
  it("joins tracked rows with qty, value and consumption", () => {
    expect(summarizeIngredients([
      { name: "Diamond", qty: 2, minGp: 300, consumed: true, focus: false },
      { name: "Bat fur", qty: 1, consumed: false, focus: true },
    ], labels)).toBe("2× Diamond (>=300 gp, consumed); Bat fur");
  });

  it("skips blank names", () => {
    expect(summarizeIngredients([{ name: " ", qty: 1, consumed: false, focus: true }], labels)).toBe("");
  });
});

describe("deriveComponentFlags", () => {
  it("reads letters before the parenthesis", () => {
    expect(deriveComponentFlags("V, S, M (a pinch of Salt)")).toEqual({ v: true, s: true, m: true });
    expect(deriveComponentFlags("V")).toEqual({ v: true, s: false, m: false });
  });

  it("returns null for empty text", () => {
    expect(deriveComponentFlags(null)).toBeNull();
  });
});

describe("presets and focus", () => {
  it("builds tracked and focus presets", () => {
    expect(ingredientFromPreset("gem", "Gem")).toMatchObject({ minGp: 100, consumed: true, focus: false });
    expect(ingredientFromPreset("focus", "Focus")).toMatchObject({ consumed: false, focus: true });
  });

  it("recomputes focus until it was set by hand", () => {
    const row = ingredientFromPreset("focus", "Focus");

    expect(patchIngredient(row, { minGp: 50 }).focus).toBe(false);
    expect(patchIngredient({ ...row, focus: false }, { consumed: false }).focus).toBe(false);
    expect(patchIngredient({ ...row, focus: false }, { minGp: 50 }).focus).toBe(false);
  });
});
