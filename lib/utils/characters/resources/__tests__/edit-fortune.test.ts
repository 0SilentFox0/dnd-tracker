import { describe, expect, it } from "vitest";

import { editResources } from "@/lib/utils/characters/resources/edit";

describe("editResources fortune", () => {
  it("clamps to fateMax", () => {
    expect(editResources({}, { fortune: 9 }, undefined, {}, { fateMax: 3 })).toEqual({ fortune: 3 });
    expect(editResources({ fortune: 1 }, { fortune: 0 }, undefined, {}, { fateMax: 3 })).toEqual({ fortune: 0 });
  });

  it("reset restores fortune", () => {
    expect(editResources({ hp: 2, fortune: 0 }, { reset: true }, undefined, {}, { fateMax: 3 })).toEqual({ fortune: 3 });
  });

  it("ignores tempHp in wfrp", () => {
    expect(editResources({}, { tempHp: 5 }, undefined, {}, { fateMax: 3 })).toEqual({});
  });

  it("ignores fortune without opts", () => {
    expect(editResources({}, { fortune: 2 })).toEqual({});
  });
});
