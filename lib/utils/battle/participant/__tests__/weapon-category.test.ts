import { describe, expect, it } from "vitest";

import { extractAttacksFromCharacter, weaponCategoryOf } from "../extract-attacks";

const row = (modifiers: Array<{ type: string; value: string }>, description = "") => ({ id: "w", name: "w", slot: "weapon", bonuses: {}, description, modifiers }) as never;

const attacksOf = (artifact: never) => extractAttacksFromCharacter({ id: "c", campaignId: "camp", inventory: { equipped: { weapon: "w" } } } as never, { w: artifact } as never, undefined, { fiveE: true });

describe("weaponCategoryOf", () => {
  it("структуроване поле має пріоритет над описом", () => {
    expect(weaponCategoryOf([{ type: "weaponCategory", value: "simple" }] as never, "Martial Melee Weapon.")).toBe("simple");
  });

  it("без поля — fallback на опис", () => {
    expect(weaponCategoryOf([] as never, "Martial Melee Weapon.")).toBe("martial");
    expect(weaponCategoryOf([] as never, "Magic sword")).toBeUndefined();
  });

  it("некоректне значення ігнорується", () => {
    expect(weaponCategoryOf([{ type: "weaponCategory", value: "exotic" }] as never, "Simple Melee Weapon.")).toBe("simple");
  });
});

describe("extractAttacksFromCharacter weaponCategory", () => {
  it("читає поле з модифікаторів", () => {
    const a = attacksOf(row([{ type: "damageDice", value: "1d8" }, { type: "weaponCategory", value: "martial" }]));

    expect(a.find((x) => x.id === "w")?.weaponCategory).toBe("martial");
  });
});
