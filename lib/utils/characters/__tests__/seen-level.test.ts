import { describe, expect, it } from "vitest";

import { seenLevelOnLevelChange } from "@/lib/utils/characters/seen-level";

describe("seenLevelOnLevelChange", () => {
  it("перше підвищення при NULL — старий рівень (анімація покаже old → new)", () => {
    expect(seenLevelOnLevelChange(3, 4, null)).toBe(3);
  });

  it("seenLevel уже є — не змінювати", () => {
    expect(seenLevelOnLevelChange(4, 5, 3)).toBeUndefined();
  });

  it("рівень не зріс — не змінювати", () => {
    expect(seenLevelOnLevelChange(4, 4, null)).toBeUndefined();
    expect(seenLevelOnLevelChange(5, 4, null)).toBeUndefined();
  });
});
