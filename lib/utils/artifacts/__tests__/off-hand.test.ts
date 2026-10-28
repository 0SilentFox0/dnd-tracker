import { describe, expect, it } from "vitest";

import { canEquipOffHand } from "@/lib/utils/artifacts/off-hand";

const dagger = { slot: "weapon", modifiers: [{ type: "traits", value: "light,finesse" }] };

describe("canEquipOffHand", () => {
  it("легка зброя з класами — так", () => {
    expect(canEquipOffHand(dagger, true)).toBe(true);
  });

  it("класи вимкнені — ні", () => {
    expect(canEquipOffHand(dagger, false)).toBe(false);
  });

  it("нелегка зброя — ні", () => {
    expect(canEquipOffHand({ slot: "weapon", modifiers: [{ type: "traits", value: "twoHanded" }] }, true)).toBe(false);
    expect(canEquipOffHand({ slot: "weapon" }, true)).toBe(false);
  });

  it("не зброя — ні", () => {
    expect(canEquipOffHand({ ...dagger, slot: "shield" }, true)).toBe(false);
    expect(canEquipOffHand({ ...dagger, slot: "range_weapon" }, true)).toBe(false);
  });
});
