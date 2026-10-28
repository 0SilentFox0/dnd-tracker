import { describe, expect, it } from "vitest";

import { spellSchoolColor } from "@/lib/constants/spells";

describe("spellSchoolColor", () => {
  it("uses the group colour", () => expect(spellSchoolColor({ color: "#123456" })).toBe("#123456"));

  it("falls back for a group without colour, null, or a name-only legacy call", () => {
    expect(spellSchoolColor({ color: null })).toBe("#6d7177");
    expect(spellSchoolColor(null)).toBe("#6d7177");
  });
});
